import { Request, Response } from 'express';
import Elective from '../models/Elective';
import TestSubmission from '../models/TestSubmission';
import Student from '../models/Student';
import Club from '../models/Club';

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
 * What it does (mirrors allocateClubSeat service, minus all guards):
 *   1. Upserts a real synthetic FY-1 Student document identified by hallTicketNumber.
 *      The student is created with isVerified=true, year=1, and a branch from the
 *      request body (defaults to "CSE").
 *   2. Picks the first active co-curricular club with available seats for that branch
 *      (uses same isBranchEligible logic as the real service).
 *   3. Picks the first active extra-curricular club with available seats.
 *   4. Atomically increments seatsFilled on both clubs ($expr lt guard).
 *   5. Writes allocation fields onto the Student document.
 *
 * Result: real Student + real Club seatsFilled updates land in MongoDB Atlas,
 * immediately visible in the admin panel.
 *
 * Body:
 *   { hallTicketNumber: string, firstName?: string, lastName?: string,
 *     branch?: string, rollNumber?: string, term?: string }
 *
 * MongoDB free-tier safety:
 *   - All reads use .lean() — no Mongoose hydration overhead.
 *   - No transactions (Atlas free tier M0 does not support multi-doc transactions).
 *   - Two atomic findOneAndUpdate writes per call (one per club category).
 *   - Student upsert uses findOneAndUpdate (no duplicate key races).
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

    // ── 1. Upsert the synthetic student ──────────────────────────────────────
    // We use findOneAndUpdate with upsert so concurrent VUs for the same
    // hallTicket don't race-create duplicate documents.
    const domain = process.env.ALLOWED_EMAIL_DOMAIN || 'mit.asia';
    // Normalise hallTicket to lowercase for email uniqueness
    const emailSafe = hallTicketNumber.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const instituteEmail = `test.${emailSafe}@${domain}`;

    const student = await Student.findOneAndUpdate(
      { hallTicketNumber },
      {
        $setOnInsert: {
          hallTicketNumber,
          firstName,
          lastName,
          middleName: '',
          instituteEmail,
          mobileNumber: `9${String(hallTicketNumber).slice(-9).padStart(9, '0')}`,
          branch,
          rollNumber,
          semester: term,
          year: 1,
          isVerified: true,
          isProfileComplete: true,
        },
      },
      { upsert: true, new: true, lean: true }
    );

    if (!student) {
      res.status(500).json({ success: false, message: 'Failed to upsert student' });
      return;
    }

    const studentId = (student as any)._id;
    const result: Record<string, any> = { status: 'allocated' };

    // ── 2. Co-Curricular allocation ───────────────────────────────────────────
    if (!(student as any).allocatedCoCurricularClubId) {
      // Find first club with seats: branch-eligible (or open), active, term-matched
      // We fetch a small projection to avoid RAM pressure on free-tier Atlas
      const coClubs = await Club.find({
        category: 'co-curricular',
        year: 1,
        term,
        isActive: true,
        $expr: { $lt: ['$seatsFilled', '$capacity'] },
      })
        .select('_id name term targetBranches capacity seatsFilled')
        .lean();

      // Pick first eligible club for this student's branch
      const { isBranchEligible } = await import('../utils/branchMatcher');
      const targetCoClub = coClubs.find((c: any) =>
        isBranchEligible(branch, c.targetBranches || [])
      );

      if (targetCoClub) {
        const grabbed = await Club.findOneAndUpdate(
          {
            _id: targetCoClub._id,
            isActive: true,
            $expr: { $lt: ['$seatsFilled', '$capacity'] },
          },
          { $inc: { seatsFilled: 1 } },
          { new: true, lean: true }
        );

        if (grabbed) {
          await Student.findByIdAndUpdate(studentId, {
            $set: {
              allocatedCoCurricularClubId:   (grabbed as any)._id,
              allocatedCoCurricularClubName: (grabbed as any).name,
              allocatedCoCurricularClubTerm: term,
              allocatedCoCurricularTimestamp: new Date(),
            },
          });
          result.coCurricular = { club: (grabbed as any).name, id: (grabbed as any)._id };
        } else {
          result.coCurricular = 'full';
        }
      } else {
        result.coCurricular = 'no_eligible_club';
      }
    } else {
      result.coCurricular = 'already_allocated';
    }

    // ── 3. Extra-Curricular allocation ────────────────────────────────────────
    if (!(student as any).allocatedExtraCurricularClubId) {
      const ecClub = await Club.findOneAndUpdate(
        {
          category: 'extra-curricular',
          year: 1,
          term,
          isActive: true,
          $expr: { $lt: ['$seatsFilled', '$capacity'] },
        },
        { $inc: { seatsFilled: 1 } },
        { new: true, lean: true }
      );

      if (ecClub) {
        await Student.findByIdAndUpdate(studentId, {
          $set: {
            allocatedExtraCurricularClubId:   (ecClub as any)._id,
            allocatedExtraCurricularClubName: (ecClub as any).name,
            allocatedExtraCurricularClubTerm: term,
            allocatedExtraCurricularTimestamp: new Date(),
          },
        });
        result.extraCurricular = { club: (ecClub as any).name, id: (ecClub as any)._id };
      } else {
        result.extraCurricular = 'full';
      }
    } else {
      result.extraCurricular = 'already_allocated';
    }

    res.status(200).json({ success: true, hallTicketNumber, ...result });
  } catch (error: any) {
    // Gracefully handle duplicate key on concurrent upserts (race on mobileNumber/email)
    if (error.code === 11000) {
      res.status(200).json({
        success: true,
        hallTicketNumber: req.body.hallTicketNumber,
        status: 'duplicate_resolved',
        note: 'Student already existed; allocation may have been handled by a concurrent request',
      });
      return;
    }
    console.error('❌ [CLUB ALLOC TEST ERROR]:', error.message || error);
    res.status(500).json({
      success: false,
      message: 'Club allocation test failed',
      error: error.message || 'Internal error',
    });
  }
};
