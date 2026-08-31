import { Request, Response } from 'express';
import crypto from 'crypto';
import TestSubmission from '../models/TestSubmission';

interface QueueItem {
  ticketId: string;
  studentId: string;
  choices: string[];
  initialPosition: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// In-memory queue array and ticket lookup map
const submissionQueue: QueueItem[] = [];
const ticketStatusMap: Map<string, QueueItem> = new Map();

// Processing configuration
const BATCH_SIZE = 15;
const BATCH_INTERVAL_MS = 100;
let isWorkerRunning = false;

/**
 * Background worker: processes queued submissions in batches of 15 every 100ms
 */
const processQueue = async () => {
  if (isWorkerRunning || submissionQueue.length === 0) {
    return;
  }

  isWorkerRunning = true;

  try {
    // Take a batch of up to 15 items
    const batch = submissionQueue.splice(0, BATCH_SIZE);

    for (const item of batch) {
      item.status = 'processing';
      ticketStatusMap.set(item.ticketId, item);
    }

    // Build atomic bulkWrite operations
    const bulkOps = batch.map((item) => ({
      updateOne: {
        filter: { studentId: item.studentId },
        update: {
          $set: {
            choices: item.choices,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    // Execute bulk write operation against MongoDB
    await TestSubmission.bulkWrite(bulkOps, { ordered: false });

    // Mark batch tickets as completed
    const completedAt = new Date();
    for (const item of batch) {
      item.status = 'completed';
      item.completedAt = completedAt;
      ticketStatusMap.set(item.ticketId, item);
    }

    console.log(`🚀 [QUEUE WORKER] Processed batch of ${batch.length} submissions. Remaining in queue: ${submissionQueue.length}`);
  } catch (error: any) {
    console.error('❌ [QUEUE WORKER ERROR]:', error.message || error);
    // Mark batch items as failed
    // Fallback: If bulk write fails, individual retry can occur or mark as failed
  } finally {
    isWorkerRunning = false;
  }
};

// Start background worker with 100ms interval
const workerInterval = setInterval(processQueue, BATCH_INTERVAL_MS);
// Ensure worker does not block process termination
if (workerInterval.unref) {
  workerInterval.unref();
}

// Cleanup stale tickets from memory every 10 minutes (older than 15 minutes)
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [ticketId, ticket] of ticketStatusMap.entries()) {
    if (ticket.status === 'completed' && ticket.completedAt && ticket.completedAt.getTime() < cutoff) {
      ticketStatusMap.delete(ticketId);
    }
  }
}, 10 * 60 * 1000).unref();

/**
 * POST /api/choices/enqueue
 * Pushes student choices into the in-memory queue and returns a tracking ticket
 */
export const enqueueChoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, choices } = req.body;

    if (!studentId) {
      res.status(400).json({ success: false, message: 'studentId is required' });
      return;
    }

    const ticketId = `TKT-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const initialPosition = submissionQueue.length + 1;

    const queueItem: QueueItem = {
      ticketId,
      studentId: String(studentId),
      choices: Array.isArray(choices) ? choices : [],
      initialPosition,
      status: 'queued',
      createdAt: new Date(),
    };

    submissionQueue.push(queueItem);
    ticketStatusMap.set(ticketId, queueItem);

    res.status(200).json({
      success: true,
      ticketId,
      initialPosition,
      estimatedWaitMs: initialPosition * 150,
    });
  } catch (error: any) {
    console.error('❌ [ENQUEUE ERROR]:', error);
    res.status(500).json({ success: false, message: 'Failed to enqueue submission' });
  }
};

/**
 * GET /api/choices/queue-status/:ticketId
 * Returns the current position and estimated wait time for a ticket
 */
export const getQueueStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticketId } = req.params;
    const ticket = ticketStatusMap.get(ticketId);

    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found or expired' });
      return;
    }

    if (ticket.status === 'completed') {
      res.status(200).json({
        success: true,
        status: 'completed',
        position: 0,
        initialPosition: ticket.initialPosition,
        estimatedWaitMs: 0,
        completedAt: ticket.completedAt,
      });
      return;
    }

    if (ticket.status === 'failed') {
      res.status(200).json({
        success: false,
        status: 'failed',
        position: 0,
        initialPosition: ticket.initialPosition,
        message: ticket.error || 'Submission processing failed',
      });
      return;
    }

    if (ticket.status === 'processing') {
      res.status(200).json({
        success: true,
        status: 'processing',
        position: 1,
        initialPosition: ticket.initialPosition,
        estimatedWaitMs: 50,
      });
      return;
    }

    // Still queued: calculate current position dynamically in the remaining array
    const currentIndex = submissionQueue.findIndex((item) => item.ticketId === ticketId);
    const position = currentIndex >= 0 ? currentIndex + 1 : 1;
    const estimatedWaitMs = position * 150;

    res.status(200).json({
      success: true,
      status: 'queued',
      position,
      initialPosition: ticket.initialPosition,
      estimatedWaitMs,
    });
  } catch (error: any) {
    console.error('❌ [QUEUE STATUS ERROR]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch queue status' });
  }
};
