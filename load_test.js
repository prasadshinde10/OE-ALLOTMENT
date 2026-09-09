import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    stress_2000_students: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 800 },     // Stage 1: Warm-up to 800 users
        { duration: '1m', target: 1500 },    // Stage 2: Ramp up to 1,500 users
        { duration: '1m', target: 2000 },    // Stage 3: Reach target 2,000 users
        { duration: '1m15s', target: 2000 }, // Stage 4: Hold peak 2,000 users for 75s
        { duration: '45s', target: 0 },      // Stage 5: Ramp down gracefully
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'],     // Keep overall failures under 10%
    http_req_duration: ['p(95)<9000'],  // 95% of responses within 9s under 2k load
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://allocation-portal.duckdns.org';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (k6-student-sim)',
  };

  // 1. Initial health ping
  const healthRes = http.get(`${BASE_URL}/api/health`, { headers, timeout: '20s' });
  check(healthRes, { 'health ok': (r) => r.status === 200 });

  // Realistic user think time: reading choices before submit (2 to 5 seconds)
  sleep(Math.random() * 3 + 2);

  // 2. Submit choices to the in-memory queue
  const payload = JSON.stringify({
    studentId: `STU_${__VU}_${Date.now()}`,
    preferences: ['OE101', 'OE102', 'OE103'],
  });

  const enqueueRes = http.post(`${BASE_URL}/api/choices/enqueue`, payload, {
    headers,
    timeout: '30s',
  });

  const enqueueOk = check(enqueueRes, {
    'enqueue 200': (r) => r.status === 200,
    'has ticketId': (r) => {
      try {
        return JSON.parse(r.body).ticketId !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  if (!enqueueOk) {
    sleep(3);
    return;
  }

  const ticketId = JSON.parse(enqueueRes.body).ticketId;

  // 3. Client polling delay
  sleep(3.5);

  // Note: Tagged with name to prevent k6 high-cardinality metric warnings
  const statusRes = http.get(`${BASE_URL}/api/choices/queue-status/${ticketId}`, {
    headers,
    timeout: '20s',
    tags: { name: '/api/choices/queue-status/:ticketId' },
  });

  check(statusRes, {
    'status check 200': (r) => r.status === 200,
  });

  // Cycle cooldown
  sleep(3);
}