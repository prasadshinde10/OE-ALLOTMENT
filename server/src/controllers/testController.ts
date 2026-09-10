import { Request, Response } from 'express';
import Elective from '../models/Elective';
import TestSubmission from '../models/TestSubmission';
import Student from '../models/Student';
import { tryAllocate } from '../services/allocationEngine';

/**
 * POST /api/test/stress-db
 * High-throughput stress test endpoint for concurrent student allocations (e.g. 1,700 students).
 * - Read: Fetches active course capacities using .find().lean() for minimal memory overhead.
 * - Write: Performs atomic findOneAndUpdate / updateOne with { lean: true } on TestSubmission.
 */
export const stressDbTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, choices } = req.body;

    if (!studentId) {
      res.status(400).json({ success: false, message: 'studentId is required' });
      return;
    }

    // 1. MongoDB Read: Fetch active course capacities using .lean() for high-speed, low-RAM query
    const activeCourses = await Elective.find({ isActive: true })
      .select('name code capacity seatsFilled')
      .lean();

    // 2. MongoDB Write: Atomic upsert using findOneAndUpdate with lean: true
    await TestSubmission.findOneAndUpdate(
      { studentId },
      {
        $set: {
          choices: Array.isArray(choices) ? choices : [],
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true, lean: true }
    );

    res.status(200).json({
      success: true,
      count: activeCourses.length,
    });
  } catch (error: any) {
    console.error('❌ [STRESS TEST DB ERROR]:', error.message || error);
    res.status(500).json({
      success: false,
      message: 'Database stress test operation failed',
      error: error.message || 'Internal error',
    });
  }
};

/**
 * POST /api/test/club-alloc
 * ─────────────────────────────────────────────────────────────────────────────
 * Auth-free, rate-limiter-free real club allocation endpoint for load testing.
 *
 * REFACTORED — In-Memory FCFS Architecture:
 *   All seat reservation is handled synchronously in Node.js memory via the
 *   allocationEngine service. MongoDB writes are batched off the critical path
 *   and flushed every 500ms (or immediately at ≥75 queued records).
 *
 * Critical path target: <10ms end-to-end.
 *
 * Body:
 *   { hallTicketNumber: string, firstName?: string, lastName?: string,
 *     branch?: string, rollNumber?: string, term?: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const clubAllocTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      hallTicketNumber,
      firstName = 'Test',
      lastName  = 'Student',
      branch    = 'CSE',
      rollNumber = '',
      term      = 'Sem-1',
    } = req.body;

    if (!hallTicketNumber) {
      res.status(400).json({ success: false, message: 'hallTicketNumber is required' });
      return;
    }

    // ── Pure in-memory allocation — ZERO DB I/O on this request ──────────────
    // allocationEngine handles idempotency internally via allocatedStudentCache.
    // Seat reservation, branch eligibility, and write buffering all in-memory.
    const domain = process.env.ALLOWED_EMAIL_DOMAIN || 'mit.asia';
    const allocation = tryAllocate({
      hallTicketNumber,
      firstName,
      lastName,
      branch,
      rollNumber,
      term,
      domain,
    });

    // ── 3. Respond immediately — DB flush happens asynchronously ───────────────
    const cc = allocation.coCurricular;
    const ec = allocation.extraCurricular;

    res.status(200).json({
      success: true,
      hallTicketNumber,
      status: 'allocated',
      coCurricular:
        typeof cc === 'object'
          ? { club: cc.clubName, id: cc.clubId }
          : cc,
      extraCurricular:
        typeof ec === 'object'
          ? { club: ec.clubName, id: ec.clubId }
          : ec,
    });
  } catch (error: any) {
    console.error('❌ [CLUB ALLOC TEST ERROR]:', error.message || error);
    res.status(500).json({
      success: false,
      message: 'Club allocation test failed',
      error: error.message || 'Internal error',
    });
  }
};
