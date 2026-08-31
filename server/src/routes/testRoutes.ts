import { Router } from 'express';
import { stressDbTest } from '../controllers/testController';

const router = Router();

// High-throughput database stress-testing endpoint
router.post('/stress-db', stressDbTest);

export default router;
