import { Router } from 'express';
import { enqueueChoices, getQueueStatus } from '../controllers/queueController';

const router = Router();

// In-memory queue submission routes
router.post('/enqueue', enqueueChoices);
router.get('/queue-status/:ticketId', getQueueStatus);

export default router;
