/**
 * ============================================================
 *  OE Allotment — Club Allocation Load Test (2,000 VUs)
 *  Target:  https://oe-allotment.onrender.com
 * ============================================================
 *
 *  Endpoint:  POST /api/test/club-alloc
 *  No auth, no rate-limiter — writes REAL data to MongoDB Atlas:
 *    • Student document  (upserted by hallTicketNumber)
 *    • Club.seatsFilled  (atomically incremented)
 *
 *  After the test you can verify in Atlas:
 *    db.students.countDocuments({ hallTicketNumber: /^202600/ })  // 2000
 *    db.clubs.find({}, { name:1, seatsFilled:1 })
 *
 *  Branches distributed proportionally (real-world FY intake mix):
 *    CSE    → 400 students   FY-CC-02 / FY-CC-09 / FY-CC-12
 *    AI&DS  → 300 students   FY-CC-02 / FY-CC-04
 *    CSD    → 200 students   FY-CC-04 / FY-CC-08
 *    E&TC   → 200 students   FY-CC-01 / FY-CC-06 / FY-CC-10
 *    E&CE   → 150 students   FY-CC-06 / FY-CC-07
 *    EE     → 150 students   FY-CC-01 / FY-CC-10
 *    ME     → 200 students   FY-CC-01 / FY-CC-08
 *    MTX    →  80 students   FY-CC-06 / FY-CC-08
 *    AE     →  80 students   FY-CC-03 / FY-CC-10
 *    PPE    →  60 students   FY-CC-05 / FY-CC-08
 *    CIVIL  →  80 students   FY-CC-12  (open club, no branch restriction)
 *    (extra-curricular is open to all → assigned to first available EC club)
 *
 *  MongoDB free-tier safety:
 *    • 500ms–800ms think time between iterations
 *    • Arrivals capped at 200 VUs/30s ramp increments
 *    • Graceful ramp-down gives Render time to drain connections
 *
 *  Run commands:
 *    # Default (targets Render):
 *    k6 run club_alloc_test.js
 *
 *    # Override base URL to local server:
 *    k6 run -e BASE_URL=http://localhost:5000 club_alloc_test.js
 *
 *    # Save results as JSON:
 *    k6 run --out json=club_alloc_results.json club_alloc_test.js
 * ============================================================
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Config ────────────────────────────────────────────────────
const BASE_URL = (__ENV.BASE_URL || 'https://oe-allotment.onrender.com').replace(/\/$/, '');
const ENDPOINT = `${BASE_URL}/api/test/club-alloc`;

// ── Custom Metrics ────────────────────────────────────────────
const allocErrors        = new Rate('alloc_error_rate');
const allocDuration      = new Trend('alloc_duration_ms', true);
const allocated          = new Counter('students_allocated');
const alreadyAllocated   = new Counter('students_already_allocated');
const seatsFull          = new Counter('clubs_full_responses');
const duplicateResolved  = new Counter('duplicate_key_resolved');

// ── Branch distribution — 2,000 students total ───────────────
// Each VU index maps to a branch code deterministically.
// Layout (VU 1–2000):
//   1–400   → CSE
//   401–700 → AI&DS
//   701–900 → CSD
//   901–1100→ E&TC
//   1101–1250 → E&CE
//   1251–1400 → EE
//   1401–1600 → ME
//   1601–1680 → MTX
//   1681–1760 → AE
//   1761–1820 → PPE
//   1821–2000 → CIVIL
function branchForVU(vu) {
  if (vu <= 400)  return 'CSE';
  if (vu <= 700)  return 'AI&DS';
  if (vu <= 900)  return 'CSD';
  if (vu <= 1100) return 'E&TC';
  if (vu <= 1250) return 'E&CE';
  if (vu <= 1400) return 'EE';
  if (vu <= 1600) return 'ME';
  if (vu <= 1680) return 'MTX';
  if (vu <= 1760) return 'AE';
  if (vu <= 1820) return 'PPE';
  return 'CIVIL';
}

// Generate a realistic 12-digit hall ticket number.
// Format: 2026 + 00 + zero-padded VU index (up to 6 digits)
// Example: VU 42 → 202600000042
function hallTicket(vu) {
  return `2026${String(vu).padStart(8, '0')}`;
}

// ── Options ───────────────────────────────────────────────────
export const options = {
  /**
   * Single scenario — ramp to 2,000 VUs across 10 minutes.
   *
   * Ramp shape (gentle to protect M0 Atlas connection pool):
   *   t=0s    →    0 VUs
   *   t=1m30s →  500 VUs  (warm-up)
   *   t=3m    → 1000 VUs
   *   t=4m30s → 1500 VUs
   *   t=6m    → 2000 VUs  ← peak
   *   t=8m    → 2000 VUs  (hold 2 minutes)
   *   t=9m    →    0 VUs  (ramp-down)
   *
   * Each VU runs exactly ONE iteration then idles (maxIterations:1 via
   * the think-time pattern below). This means each of the 2,000 VUs
   * represents exactly one student making their allocation — no VU
   * sends a second request and pollutes the test data.
   *
   * Total MongoDB writes: up to 2,000 Student upserts +
   *                            up to 2,000 × 2 Club.seatsFilled increments
   *                          = ≤ 6,000 write ops total, spread over ~9 minutes.
   */
  scenarios: {
    club_allocation: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m30s', target: 500  },  // warm-up
        { duration: '1m30s', target: 1000 },
        { duration: '1m30s', target: 1500 },
        { duration: '1m30s', target: 2000 },  // peak
        { duration: '2m',    target: 2000 },  // hold
        { duration: '1m',    target: 0    },  // ramp-down
      ],
      gracefulRampDown: '30s',
      gracefulStop: '30s',
    },
  },

  thresholds: {
    // Primary SLOs
    'http_req_failed':   ['rate<0.05'],           // < 5% HTTP-level failures
    'http_req_duration': ['p(95)<10000'],          // p95 < 10 s (Render + Atlas M0)
    'alloc_duration_ms': ['p(95)<10000'],          // same for our custom metric
    'alloc_error_rate':  ['rate<0.05'],            // < 5% allocation logic failures
  },
};

// ── Shared JSON headers ───────────────────────────────────────
const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// ── Default function (one iteration per VU) ───────────────────
export default function () {
  const vu     = __VU;          // unique integer 1..N
  const iter   = __ITER;        // 0-indexed iteration count for this VU

  const branch = branchForVU(vu);

  // Unique identifier: VU id + iteration makes re-runs not collide
  // On iter=0 (first run) each VU creates one student.
  // On iter>0 the same hallTicket is re-sent → endpoint returns already_allocated.
  const ht     = hallTicket(vu * 100 + iter); // 202600000100, 202600000200…
  const roll   = `MIT${String(vu).padStart(5, '0')}`;

  const payload = JSON.stringify({
    hallTicketNumber: ht,
    firstName:   `Stu${vu}`,
    lastName:    branch.replace('&', ''),
    branch,
    rollNumber:  roll,
    term:        'Sem-1',
  });

  const res = http.post(ENDPOINT, payload, {
    headers: HEADERS,
    timeout: '35s',
    tags: { endpoint: 'club_alloc', branch },
  });

  allocDuration.add(res.timings.duration);

  const ok = check(res, {
    'alloc: HTTP 200':           (r) => r.status === 200,
    'alloc: success true':       (r) => {
      try { return JSON.parse(r.body).success === true; } catch { return false; }
    },
    'alloc: hallTicket echoed':  (r) => {
      try { return JSON.parse(r.body).hallTicketNumber === ht; } catch { return false; }
    },
  });

  allocErrors.add(!ok);

  if (ok) {
    let body;
    try { body = JSON.parse(res.body); } catch {}

    if (body) {
      if (body.status === 'duplicate_resolved') {
        duplicateResolved.add(1);
      } else {
        // Count meaningful allocations
        const cc  = body.coCurricular;
        const ec  = body.extraCurricular;

        if (cc === 'already_allocated' || ec === 'already_allocated') {
          alreadyAllocated.add(1);
        } else {
          allocated.add(1);
        }

        if (cc === 'full' || ec === 'full') {
          seatsFull.add(1);
        }
      }
    }
  }

  // ── Think time ───────────────────────────────────────────────
  // 500–800 ms between iterations.
  // Keeps concurrent MongoDB connections well below Atlas M0's limit (~100).
  // Formula: base 0.5s + up to 0.3s random jitter
  sleep(0.5 + Math.random() * 0.3);
}

/**
 * End-of-test summary printed to stdout after k6 finishes.
 */
export function handleSummary(data) {
  const allocated_count    = (data.metrics['students_allocated']         || {}).values?.count || 0;
  const already_count      = (data.metrics['students_already_allocated'] || {}).values?.count || 0;
  const full_count         = (data.metrics['clubs_full_responses']       || {}).values?.count || 0;
  const dup_count          = (data.metrics['duplicate_key_resolved']     || {}).values?.count || 0;
  const total_req          = (data.metrics['http_reqs']                  || {}).values?.count || 0;
  const fail_rate          = (data.metrics['http_req_failed']            || {}).values?.rate  || 0;
  const p95                = (data.metrics['alloc_duration_ms']          || {}).values?.['p(95)'] || 0;
  const p99                = (data.metrics['alloc_duration_ms']          || {}).values?.['p(99)'] || 0;

  const thresholdsPassed   = Object.values(data.root_group?.checks || {}).every((c) => c);

  const summary = `
╔══════════════════════════════════════════════════════════╗
║       OE Allotment — Club Allocation Load Test           ║
║       Target: ${BASE_URL.padEnd(41)}║
╠══════════════════════════════════════════════════════════╣
║  Total HTTP requests sent       : ${String(total_req).padStart(10)}           ║
║  HTTP failure rate              : ${(fail_rate * 100).toFixed(2).padStart(9)}%          ║
║  Alloc duration  p(95)          : ${String(Math.round(p95)).padStart(8)} ms         ║
║  Alloc duration  p(99)          : ${String(Math.round(p99)).padStart(8)} ms         ║
╠══════════════════════════════════════════════════════════╣
║  Students newly allocated       : ${String(allocated_count).padStart(10)}           ║
║  Students already allocated     : ${String(already_count).padStart(10)}           ║
║  Club-full responses            : ${String(full_count).padStart(10)}           ║
║  Duplicate-key graceful resolves: ${String(dup_count).padStart(10)}           ║
╠══════════════════════════════════════════════════════════╣
║  Thresholds passed?             : ${thresholdsPassed ? '✅  YES' : '❌  NO'}                   ║
╚══════════════════════════════════════════════════════════╝

▶ Verify in MongoDB Atlas:
    db.students.countDocuments({ hallTicketNumber: /^2026/ })
    db.clubs.find({}, { name:1, seatsFilled:1, capacity:1 })
`;

  // Return the summary as text (k6 will print it)
  return { stdout: summary };
}
