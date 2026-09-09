import { Router } from 'express';
import { stressDbTest, clubAllocTest } from '../controllers/testController';

const router = Router();

// High-throughput database stress-testing endpoint (TestSubmission collection)
router.post('/stress-db', stressDbTest);

// Real club allocation endpoint — no auth/rate-limit; writes to Student + Club collections
router.post('/club-alloc', clubAllocTest);

export default router;
