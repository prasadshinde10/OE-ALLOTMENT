import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Config ─────────────────────────────────────────────────────────────────
const BASE_URL  = (__ENV.BASE_URL || 'https://allocation-portal.duckdns.org').replace(/\/$/, '');
const ENDPOINT  = `${BASE_URL}/api/test/club-alloc`;

// ── Custom Metrics ──────────────────────────────────────────────────────────
const allocErrors        = new Rate('alloc_error_rate');
const allocDuration      = new Trend('alloc_duration_ms', true);
const allocated          = new Counter('students_allocated');
const alreadyAllocated   = new Counter('students_already_allocated');
const seatsFull          = new Counter('clubs_full_responses');
const noEligibleClub     = new Counter('no_eligible_club_responses');

// ── Branch mapping ──────────────────────────────────────────────────────────
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

function hallTicket(vu) {
  return `2026${String(vu).padStart(8, '0')}`;
}

// ── Scenario ────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    fcfs_gated_stampede: {
      executor: 'per-vu-iterations',
      vus: 2000,
      iterations: 1,       // Exactly one end-to-end flow per student — no retries
      maxDuration: '4m',
    },
  },
  thresholds: {
    'http_req_failed':   ['rate<0.05'],
    'alloc_duration_ms': ['p(95)<10000'],
    'alloc_error_rate':  ['rate<0.05'],
  },
};

const HEADERS = {
  'Content-Type': 'application/json',
  'Accept':       'application/json',
};

export default function () {
  const vu     = __VU;  // 1–2000
  const branch = branchForVU(vu);
  const ht     = hallTicket(vu);
  const roll   = `MIT${String(vu).padStart(5, '0')}`;

  // ── Stagger all VUs with 0–500ms jitter to spread TLS handshakes ──────────
  // Prevents 2000 simultaneous SSL negotiations from saturating the nginx queue.
  sleep(Math.random() * 0.5);

  // ── Wave gate: VUs 1201–2000 wait an extra 1.5s–3s ───────────────────────
  if (vu > 1200) {
    sleep(1.5 + Math.random() * 1.5);
  }

  // ── Single allocation request — no retry loop ─────────────────────────────
  const payload = JSON.stringify({
    hallTicketNumber: ht,
    firstName:  `Stu${vu}`,
    lastName:   branch.replace('&', ''),
    branch,
    rollNumber: roll,
    term:       'Sem-1',
  });

  const res = http.post(ENDPOINT, payload, {
    headers: HEADERS,
    timeout: '20s',
    tags:    { endpoint: 'club_alloc', branch },
  });

  allocDuration.add(res.timings.duration);

  // ── A status=0 or HTTP error is a hard failure ────────────────────────────
  if (res.status === 0) {
    allocErrors.add(1);
    return;
  }

  const ok = check(res, {
    'alloc: HTTP 200':       (r) => r.status === 200,
    'alloc: duration <20s':  (r) => r.timings.duration < 20000,
  });

  allocErrors.add(!ok ? 1 : 0);

  if (!ok) return;

  // ── Parse response and record outcome metrics ─────────────────────────────
  let body;
  try { body = JSON.parse(res.body); } catch { return; }

  if (!body) return;

  const cc = body.coCurricular;
  const ec = body.extraCurricular;

  if (cc === 'already_allocated' || ec === 'already_allocated') {
    alreadyAllocated.add(1);
  } else if (cc === 'full' || ec === 'full') {
    seatsFull.add(1);
  } else if (cc === 'no_eligible_club' || ec === 'no_eligible_club') {
    noEligibleClub.add(1);
  } else if (typeof cc === 'object' || typeof ec === 'object') {
    allocated.add(1);
  }
}

// ── Summary ─────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  const m = (key, field = 'count') =>
    (data.metrics[key] || {}).values?.[field] || 0;

  const allocatedCount  = m('students_allocated');
  const alreadyCount    = m('students_already_allocated');
  const fullCount       = m('clubs_full_responses');
  const noClubCount     = m('no_eligible_club_responses');
  const totalReqs       = m('http_reqs');
  const failRate        = m('http_req_failed', 'rate');
  const p95             = m('alloc_duration_ms', 'p(95)');

  const summary = `
╔══════════════════════════════════════════════════════════╗
║     OE Allotment — Constrained 2k FCFS Stampede v3       ║
║     Target: ${BASE_URL.padEnd(41)}║
╠══════════════════════════════════════════════════════════╣
║  Total HTTP requests sent       : ${String(totalReqs).padStart(10)}           ║
║  HTTP failure rate              : ${(failRate * 100).toFixed(2).padStart(9)}%          ║
║  Alloc duration p(95)           : ${String(Math.round(p95)).padStart(8)} ms         ║
╠══════════════════════════════════════════════════════════╣
║  Students newly allocated       : ${String(allocatedCount).padStart(10)}           ║
║  Students already allocated     : ${String(alreadyCount).padStart(10)}           ║
║  Club-full responses            : ${String(fullCount).padStart(10)}           ║
║  No eligible club (branch miss) : ${String(noClubCount).padStart(10)}           ║
╚══════════════════════════════════════════════════════════╝

▶ Verify in MongoDB Atlas:
    db.students.countDocuments({ hallTicketNumber: /^2026/ })
    db.clubs.find({}, { name: 1, seatsFilled: 1, capacity: 1 })
`;

  return { stdout: summary };
}
