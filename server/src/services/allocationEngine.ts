/**
 * allocationEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * In-Memory FCFS Club Allocation Engine
 *
 * Architecture:
 *   - clubSeatCache   : Map<clubId, remainingSeats>  — authoritative seat counter (Node.js memory)
 *   - clubMetaCache   : Map<clubId, ClubMeta>         — branch/category metadata for eligibility checks
 *   - writeBuffer     : WriteBufferItem[]             — pending DB writes, drained every 500ms or at ≥75
 *   - isFlushing      : boolean                       — flush mutex (single-threaded JS = no real race)
 *
 * Critical path per request: O(n_clubs) in-memory lookup + O(1) Map decrement → <5ms, zero DB I/O.
 * Persistence path: bulkWrite batches of 75 records, aggregated per-club increments, unordered.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Club from '../models/Club';
import Student from '../models/Student';
import { isBranchEligible } from '../utils/branchMatcher';

/**
 * Tracks hallTicketNumbers that have already been fully allocated (both CC + EC).
 * Populated at boot from MongoDB, then updated on every successful allocation.
 * Eliminates the Student.findOne() DB read from the HTTP critical path entirely.
 */
const allocatedStudentCache = new Set<string>();

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClubMeta {
  _id: string;
  name: string;
  category: 'co-curricular' | 'extra-curricular';
  targetBranches: string[];
  term: string;
  capacity: number;
}

interface WriteBufferItem {
  hallTicketNumber: string;
  firstName: string;
  lastName: string;
  middleName: string;
  instituteEmail: string;
  mobileNumber: string;
  branch: string;
  rollNumber: string;
  semester: string;
  year: number;
  isVerified: boolean;
  isProfileComplete: boolean;
  // Allocation fields (co-curricular)
  allocatedCoCurricularClubId?: string;
  allocatedCoCurricularClubName?: string;
  allocatedCoCurricularClubTerm?: string;
  allocatedCoCurricularTimestamp?: Date;
  // Allocation fields (extra-curricular)
  allocatedExtraCurricularClubId?: string;
  allocatedExtraCurricularClubName?: string;
  allocatedExtraCurricularClubTerm?: string;
  allocatedExtraCurricularTimestamp?: Date;
}

export interface AllocationResult {
  coCurricular: { clubId: string; clubName: string } | 'full' | 'no_eligible_club' | 'already_allocated';
  extraCurricular: { clubId: string; clubName: string } | 'full' | 'no_eligible_club' | 'already_allocated';
}

// ── Module-level State ────────────────────────────────────────────────────────

/**
 * Primary seat-availability map. Decremented synchronously on each successful reservation.
 * Never goes below 0. Values are restored on DB flush failures (compensating rollback).
 */
const clubSeatCache = new Map<string, number>();

/**
 * Club metadata for eligibility checks (branch, category, term, name).
 * Read-only after boot — never mutated during request handling.
 */
const clubMetaCache = new Map<string, ClubMeta>();

/**
 * Pending writes awaiting batch flush to MongoDB.
 * Items accumulate here and are spliced in batches of up to 75.
 */
const writeBuffer: WriteBufferItem[] = [];

/** Flush guard — prevents two concurrent flush coroutines from racing on the same batch. */
let isFlushing = false;

/** Whether the engine has been initialized (guards against double-init). */
let isInitialized = false;

// ── Engine Initialization ─────────────────────────────────────────────────────

/**
 * Must be called once after Mongoose connects, before the HTTP server starts.
 * Fetches all clubs from MongoDB and hydrates both in-memory caches.
 */
export async function initializeAllocationEngine(): Promise<void> {
  if (isInitialized) {
    console.log('⚡ [AllocationEngine] Already initialized — skipping.');
    return;
  }

  console.log('⚡ [AllocationEngine] Initializing in-memory seat cache…');

  // ── Hydrate club caches ───────────────────────────────────────────────────
  const clubs = await Club.find(
    { isActive: true },
    { _id: 1, name: 1, category: 1, targetBranches: 1, term: 1, capacity: 1, seatsFilled: 1, year: 1 }
  ).lean();

  let cached = 0;
  for (const club of clubs) {
    const id = String(club._id);
    const remaining = Math.max(0, club.capacity - club.seatsFilled);
    clubSeatCache.set(id, remaining);
    clubMetaCache.set(id, {
      _id: id,
      name: club.name,
      category: club.category,
      targetBranches: (club as any).targetBranches || [],
      term: club.term,
      capacity: club.capacity,
    });
    cached++;
  }

  // ── Hydrate already-allocated student cache ───────────────────────────────
  // Pull only hallTicketNumbers of students with both club allocations set.
  // This is a one-time boot scan; new allocations are added live via tryAllocate.
  const allocatedStudents = await Student.find(
    {
      year: 1,
      hallTicketNumber: { $exists: true, $ne: null },
      allocatedCoCurricularClubId: { $exists: true, $ne: null },
      allocatedExtraCurricularClubId: { $exists: true, $ne: null },
    },
    { hallTicketNumber: 1 }
  ).lean();

  for (const s of allocatedStudents) {
    if (s.hallTicketNumber) allocatedStudentCache.add(s.hallTicketNumber);
  }

  console.log(`⚡ [AllocationEngine] Pre-allocated students in cache: ${allocatedStudentCache.size}`);

  // Start the background 500ms flush interval
  setInterval(flushBufferToDatabase, 500);

  isInitialized = true;
  console.log(`⚡ [AllocationEngine] Ready — ${cached} active clubs cached. Flush interval: 500ms.`);
}

// ── Hot-Path Allocation ───────────────────────────────────────────────────────

/**
 * Attempts to reserve seats (co-curricular + extra-curricular) for a student.
 * All logic is synchronous in-memory — zero MongoDB I/O on the critical path.
 *
 * @returns AllocationResult with outcome per category
 */
export function tryAllocate(params: {
  hallTicketNumber: string;
  firstName: string;
  lastName: string;
  branch: string;
  rollNumber: string;
  term: string;
  domain: string;
}): AllocationResult {
  const {
    hallTicketNumber,
    firstName,
    lastName,
    branch,
    rollNumber,
    term,
    domain,
  } = params;

  // ── O(1) in-memory idempotency check — zero DB I/O ───────────────────────
  const alreadyFullyAllocated = allocatedStudentCache.has(hallTicketNumber);
  if (alreadyFullyAllocated) {
    return {
      coCurricular:   'already_allocated',
      extraCurricular: 'already_allocated',
    };
  }

  // For partial re-submissions we check per-field in the write item below.
  // We don't track partial state in the Set — first successful full allocation adds to Set.
  const alreadyHasCoCurricular  = false;
  const alreadyHasExtraCurricular = false;

  const emailSafe = hallTicketNumber.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const instituteEmail = `test.${emailSafe}@${domain}`;
  const mobileNumber = `9${String(hallTicketNumber).slice(-9).padStart(9, '0')}`;

  const result: AllocationResult = {
    coCurricular: 'no_eligible_club',
    extraCurricular: 'no_eligible_club',
  };

  // Build a single base item shared across both allocations
  const baseItem: Omit<WriteBufferItem, 'allocatedCoCurricularClubId' | 'allocatedCoCurricularClubName' | 'allocatedCoCurricularClubTerm' | 'allocatedCoCurricularTimestamp' | 'allocatedExtraCurricularClubId' | 'allocatedExtraCurricularClubName' | 'allocatedExtraCurricularClubTerm' | 'allocatedExtraCurricularTimestamp'> = {
    hallTicketNumber,
    firstName,
    lastName,
    middleName: '',
    instituteEmail,
    mobileNumber,
    branch,
    rollNumber,
    semester: term,
    year: 1,
    isVerified: true,
    isProfileComplete: true,
  };

  const writeItem: WriteBufferItem = { ...baseItem };
  let shouldWrite = false;

  // ── Co-Curricular ──────────────────────────────────────────────────────────
  if (alreadyHasCoCurricular) {
    result.coCurricular = 'already_allocated';
  } else {
    const coClub = findEligibleClub('co-curricular', branch, term);
    if (!coClub) {
      result.coCurricular = 'no_eligible_club'; // no branch-eligible club with seats exists
    } else {
      // Atomic decrement (safe: single-threaded JS event loop)
      const remaining = clubSeatCache.get(coClub._id)!;
      if (remaining <= 0) {
        result.coCurricular = 'full';
      } else {
        clubSeatCache.set(coClub._id, remaining - 1);
        writeItem.allocatedCoCurricularClubId = coClub._id;
        writeItem.allocatedCoCurricularClubName = coClub.name;
        writeItem.allocatedCoCurricularClubTerm = term;
        writeItem.allocatedCoCurricularTimestamp = new Date();
        result.coCurricular = { clubId: coClub._id, clubName: coClub.name };
        shouldWrite = true;
      }
    }
  }

  // ── Extra-Curricular ───────────────────────────────────────────────────────
  if (alreadyHasExtraCurricular) {
    result.extraCurricular = 'already_allocated';
  } else {
    const ecClub = findEligibleClub('extra-curricular', branch, term);
    if (!ecClub) {
      result.extraCurricular = 'no_eligible_club';
    } else {
      const remaining = clubSeatCache.get(ecClub._id)!;
      if (remaining <= 0) {
        result.extraCurricular = 'full';
      } else {
        clubSeatCache.set(ecClub._id, remaining - 1);
        writeItem.allocatedExtraCurricularClubId = ecClub._id;
        writeItem.allocatedExtraCurricularClubName = ecClub.name;
        writeItem.allocatedExtraCurricularClubTerm = term;
        writeItem.allocatedExtraCurricularTimestamp = new Date();
        result.extraCurricular = { clubId: ecClub._id, clubName: ecClub.name };
        shouldWrite = true;
      }
    }
  }

  // Push to write buffer (if at least one allocation happened)
  if (shouldWrite) {
    writeBuffer.push(writeItem);
    // Mark as fully allocated in memory if both slots are now filled
    if (writeItem.allocatedCoCurricularClubId && writeItem.allocatedExtraCurricularClubId) {
      allocatedStudentCache.add(hallTicketNumber);
    }
    // Opportunistic early flush when buffer is full
    if (writeBuffer.length >= 75) {
      setImmediate(flushBufferToDatabase);
    }
  }

  return result;
}

// ── Internal Helpers ──────────────────────────────────────────────────────────

/**
 * Scans clubMetaCache to find the first club with:
 *   - matching category + term
 *   - remaining seats > 0 in clubSeatCache
 *   - branch eligibility (via isBranchEligible)
 */
function findEligibleClub(
  category: 'co-curricular' | 'extra-curricular',
  branch: string,
  term: string
): ClubMeta | null {
  for (const [id, meta] of clubMetaCache) {
    if (meta.category !== category) continue;
    if (meta.term !== term) continue;
    const remaining = clubSeatCache.get(id) ?? 0;
    if (remaining <= 0) continue;
    if (category === 'co-curricular' && meta.targetBranches.length > 0) {
      if (!isBranchEligible(branch, meta.targetBranches)) continue;
    }
    return meta;
  }
  return null;
}

// ── Async Batch Flusher ───────────────────────────────────────────────────────

/**
 * Drains up to 75 items from writeBuffer and persists them to MongoDB via bulkWrite.
 *
 * Student upserts:   updateOne with $set (upsert: true) — idempotent
 * Club increments:   $inc seatsFilled aggregated per clubId — one op per club per batch
 *
 * On failure: compensating rollback restores in-memory seat counts.
 * Guard:      isFlushing prevents re-entrant concurrent flush.
 */
export async function flushBufferToDatabase(): Promise<void> {
  if (isFlushing || writeBuffer.length === 0) return;
  isFlushing = true;

  // Splice up to 75 items atomically (single-threaded — safe)
  const batch = writeBuffer.splice(0, 75);

  // Track which clubId got how many seat increments in this batch
  const coIncrements: Record<string, number> = {};
  const ecIncrements: Record<string, number> = {};

  try {
    // ── Build Student bulkWrite ops ──────────────────────────────────────────
    const studentOps = batch.map((item) => {
      // Aggregate per-club seat increments while building ops
      if (item.allocatedCoCurricularClubId) {
        coIncrements[item.allocatedCoCurricularClubId] =
          (coIncrements[item.allocatedCoCurricularClubId] || 0) + 1;
      }
      if (item.allocatedExtraCurricularClubId) {
        ecIncrements[item.allocatedExtraCurricularClubId] =
          (ecIncrements[item.allocatedExtraCurricularClubId] || 0) + 1;
      }

      // Build the $set payload — only include allocation fields that exist
      const setPayload: Record<string, any> = {
        hallTicketNumber: item.hallTicketNumber,
        firstName: item.firstName,
        lastName: item.lastName,
        middleName: item.middleName,
        instituteEmail: item.instituteEmail,
        mobileNumber: item.mobileNumber,
        branch: item.branch,
        rollNumber: item.rollNumber,
        semester: item.semester,
        year: item.year,
        isVerified: item.isVerified,
        isProfileComplete: item.isProfileComplete,
      };

      if (item.allocatedCoCurricularClubId) {
        setPayload.allocatedCoCurricularClubId = item.allocatedCoCurricularClubId;
        setPayload.allocatedCoCurricularClubName = item.allocatedCoCurricularClubName;
        setPayload.allocatedCoCurricularClubTerm = item.allocatedCoCurricularClubTerm;
        setPayload.allocatedCoCurricularTimestamp = item.allocatedCoCurricularTimestamp;
      }
      if (item.allocatedExtraCurricularClubId) {
        setPayload.allocatedExtraCurricularClubId = item.allocatedExtraCurricularClubId;
        setPayload.allocatedExtraCurricularClubName = item.allocatedExtraCurricularClubName;
        setPayload.allocatedExtraCurricularClubTerm = item.allocatedExtraCurricularClubTerm;
        setPayload.allocatedExtraCurricularTimestamp = item.allocatedExtraCurricularTimestamp;
      }

      return {
        updateOne: {
          filter: { hallTicketNumber: item.hallTicketNumber },
          update: { $set: setPayload },
          upsert: true,
        },
      };
    });

    // ── Build Club bulkWrite ops ─────────────────────────────────────────────
    // One $inc op per clubId — aggregated counts prevent redundant separate ops
    const clubOps = [
      ...Object.entries(coIncrements).map(([clubId, inc]) => ({
        updateOne: {
          filter: { _id: clubId },
          update: { $inc: { seatsFilled: inc } },
        },
      })),
      ...Object.entries(ecIncrements).map(([clubId, inc]) => ({
        updateOne: {
          filter: { _id: clubId },
          update: { $inc: { seatsFilled: inc } },
        },
      })),
    ];

    // ── Execute both bulkWrites in parallel ──────────────────────────────────
    await Promise.all([
      Student.bulkWrite(studentOps as any, { ordered: false }),
      clubOps.length > 0 ? Club.bulkWrite(clubOps as any, { ordered: false }) : Promise.resolve(),
    ]);

    console.log(`✅ [AllocationEngine] Flushed ${batch.length} records (${Object.keys(coIncrements).length + Object.keys(ecIncrements).length} club ops).`);
  } catch (err: any) {
    console.error('❌ [AllocationEngine] Flush failed — rolling back seat counters:', err.message || err);

    // ── Compensating rollback ────────────────────────────────────────────────
    // Restore in-memory seat counts for each failed reservation in the batch
    for (const item of batch) {
      if (item.allocatedCoCurricularClubId) {
        const current = clubSeatCache.get(item.allocatedCoCurricularClubId) ?? 0;
        clubSeatCache.set(item.allocatedCoCurricularClubId, current + 1);
      }
      if (item.allocatedExtraCurricularClubId) {
        const current = clubSeatCache.get(item.allocatedExtraCurricularClubId) ?? 0;
        clubSeatCache.set(item.allocatedExtraCurricularClubId, current + 1);
      }
    }
  } finally {
    isFlushing = false;
    // If another full batch accumulated while we were flushing, drain it immediately
    if (writeBuffer.length >= 75) {
      setImmediate(flushBufferToDatabase);
    }
  }
}

// ── Engine Reset (post-bulk-delete) ───────────────────────────────────────────

/**
 * Resets all in-memory state and rehydrates caches from MongoDB.
 * Call this after any operation that bulk-mutates Student/Club data outside the
 * engine's own write path (e.g. admin "delete all students").
 *
 * Steps:
 *   1. Wait for any in-flight flush to finish
 *   2. Discard remaining writeBuffer items (the DB state they'd write to is gone)
 *   3. Clear clubSeatCache, clubMetaCache, allocatedStudentCache
 *   4. Re-fetch clubs & allocated students from MongoDB
 */
export async function resetAllocationEngine(): Promise<void> {
  console.log('⚡ [AllocationEngine] Resetting — clearing caches and rehydrating from MongoDB…');

  // Wait for any in-flight flush to complete so we don't race on the buffer
  while (isFlushing) {
    await new Promise((r) => setTimeout(r, 50));
  }

  // Discard pending writes — the underlying data has been externally mutated
  writeBuffer.splice(0, writeBuffer.length);

  // Clear all caches
  clubSeatCache.clear();
  clubMetaCache.clear();
  allocatedStudentCache.clear();

  // Re-hydrate club caches from current DB state
  const clubs = await Club.find(
    { isActive: true },
    { _id: 1, name: 1, category: 1, targetBranches: 1, term: 1, capacity: 1, seatsFilled: 1, year: 1 }
  ).lean();

  for (const club of clubs) {
    const id = String(club._id);
    const remaining = Math.max(0, club.capacity - club.seatsFilled);
    clubSeatCache.set(id, remaining);
    clubMetaCache.set(id, {
      _id: id,
      name: club.name,
      category: club.category,
      targetBranches: (club as any).targetBranches || [],
      term: club.term,
      capacity: club.capacity,
    });
  }

  // Re-hydrate allocated student cache
  const allocatedStudents = await Student.find(
    {
      year: 1,
      hallTicketNumber: { $exists: true, $ne: null },
      allocatedCoCurricularClubId: { $exists: true, $ne: null },
      allocatedExtraCurricularClubId: { $exists: true, $ne: null },
    },
    { hallTicketNumber: 1 }
  ).lean();

  for (const s of allocatedStudents) {
    if (s.hallTicketNumber) allocatedStudentCache.add(s.hallTicketNumber);
  }

  console.log(
    `⚡ [AllocationEngine] Reset complete — ${clubSeatCache.size} clubs cached, ${allocatedStudentCache.size} pre-allocated students.`
  );
}

// ── Seat Reconciliation ───────────────────────────────────────────────────────

export interface ReconciliationResult {
  clubsChecked: number;
  clubsCorrected: number;
  corrections: Array<{ clubId: string; clubName: string; before: number; after: number }>;
}

/**
 * Recalculates every Club's seatsFilled by aggregating actual Student allocations.
 * Fixes any drift between the Club counters and reality, then re-syncs the in-memory cache.
 *
 * Safe to call at any time — it is idempotent.
 */
export async function reconcileSeats(): Promise<ReconciliationResult> {
  console.log('🔄 [AllocationEngine] Reconciling club seats from actual student allocations…');

  // Aggregate co-curricular allocation counts
  const coCounts: Array<{ _id: string; count: number }> = await Student.aggregate([
    { $match: { allocatedCoCurricularClubId: { $ne: null } } },
    { $group: { _id: '$allocatedCoCurricularClubId', count: { $sum: 1 } } },
  ]);

  // Aggregate extra-curricular allocation counts
  const ecCounts: Array<{ _id: string; count: number }> = await Student.aggregate([
    { $match: { allocatedExtraCurricularClubId: { $ne: null } } },
    { $group: { _id: '$allocatedExtraCurricularClubId', count: { $sum: 1 } } },
  ]);

  // Merge into a single map: clubId → total actual allocations
  const actualCounts = new Map<string, number>();
  for (const { _id, count } of coCounts) {
    const id = String(_id);
    actualCounts.set(id, (actualCounts.get(id) || 0) + count);
  }
  for (const { _id, count } of ecCounts) {
    const id = String(_id);
    actualCounts.set(id, (actualCounts.get(id) || 0) + count);
  }

  // Fetch all clubs and compare
  const allClubs = await Club.find({}, { _id: 1, name: 1, seatsFilled: 1 }).lean();
  const corrections: ReconciliationResult['corrections'] = [];
  const bulkOps: any[] = [];

  for (const club of allClubs) {
    const id = String(club._id);
    const actual = actualCounts.get(id) || 0;
    if (club.seatsFilled !== actual) {
      corrections.push({
        clubId: id,
        clubName: club.name,
        before: club.seatsFilled,
        after: actual,
      });
      bulkOps.push({
        updateOne: {
          filter: { _id: club._id },
          update: { $set: { seatsFilled: actual } },
        },
      });
    }
  }

  if (bulkOps.length > 0) {
    await Club.bulkWrite(bulkOps, { ordered: false });
  }

  // Re-sync in-memory cache from the now-corrected DB
  await resetAllocationEngine();

  const result: ReconciliationResult = {
    clubsChecked: allClubs.length,
    clubsCorrected: corrections.length,
    corrections,
  };

  console.log(
    `🔄 [AllocationEngine] Reconciliation done — ${result.clubsCorrected}/${result.clubsChecked} clubs corrected.`
  );
  return result;
}

/**
 * Graceful shutdown: flush any remaining items in the write buffer before process exits.
 * Call this from SIGTERM/SIGINT handlers.
 */
export async function drainAndShutdown(): Promise<void> {
  console.log(`⚡ [AllocationEngine] Draining ${writeBuffer.length} buffered records before shutdown…`);
  while (writeBuffer.length > 0) {
    await flushBufferToDatabase();
  }
  console.log('⚡ [AllocationEngine] Drain complete.');
}
