import { Request, Response } from 'express';
import Elective from '../models/Elective';
import TestSubmission from '../models/TestSubmission';

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
