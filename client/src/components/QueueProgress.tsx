'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

interface QueueProgressProps {
  isOpen: boolean;
  ticketId: string | null;
  initialPosition?: number;
  onComplete?: () => void;
  onClose?: () => void;
}

export function QueueProgress({
  isOpen,
  ticketId,
  initialPosition = 1,
  onComplete,
  onClose,
}: QueueProgressProps) {
  const [status, setStatus] = useState<'queued' | 'processing' | 'completed' | 'failed'>('queued');
  const [currentPosition, setCurrentPosition] = useState<number>(initialPosition);
  const [initialPos, setInitialPos] = useState<number>(initialPosition || 1);
  const [estimatedWaitMs, setEstimatedWaitMs] = useState<number>(initialPosition * 150);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initial position when ticketId or initialPosition prop changes
  useEffect(() => {
    if (initialPosition) {
      setInitialPos(Math.max(1, initialPosition));
      setCurrentPosition(Math.max(1, initialPosition));
      setEstimatedWaitMs(initialPosition * 150);
    }
    setStatus('queued');
    setErrorMessage(null);
  }, [ticketId, initialPosition]);

  // Polling effect: query queue status every 1 second
  useEffect(() => {
    if (!isOpen || !ticketId || status === 'completed' || status === 'failed') {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await api.get(`/api/choices/queue-status/${ticketId}`);
        const data = res.data;

        if (data.initialPosition && data.initialPosition > initialPos) {
          setInitialPos(data.initialPosition);
        }

        if (data.status === 'completed') {
          setStatus('completed');
          setCurrentPosition(0);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (onComplete) {
            setTimeout(onComplete, 1200);
          }
        } else if (data.status === 'processing') {
          setStatus('processing');
          setCurrentPosition(1);
          setEstimatedWaitMs(data.estimatedWaitMs || 50);
        } else if (data.status === 'failed') {
          setStatus('failed');
          setErrorMessage(data.message || 'Submission failed in queue');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else {
          setStatus('queued');
          setCurrentPosition(data.position || 1);
          setEstimatedWaitMs(data.estimatedWaitMs || data.position * 150);
        }
      } catch (err: any) {
        console.error('Queue poll error:', err);
      }
    };

    // Immediate check
    checkStatus();

    // Poll every 1000ms
    pollIntervalRef.current = setInterval(checkStatus, 1000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, ticketId, status, initialPos, onComplete]);

  if (!isOpen || !ticketId) return null;

  // Calculate animated progress percentage
  let progressPercentage = 10;
  if (status === 'completed') {
    progressPercentage = 100;
  } else if (status === 'processing') {
    progressPercentage = 92;
  } else if (initialPos > 0) {
    const rawProgress = (1 - currentPosition / initialPos) * 100;
    progressPercentage = Math.min(88, Math.max(12, Math.round(rawProgress)));
  }

  const formattedWaitTime =
    estimatedWaitMs > 1000
      ? `~${(estimatedWaitMs / 1000).toFixed(1)}s`
      : `~${estimatedWaitMs}ms`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 transform transition-all text-center">
        {status === 'completed' ? (
          /* Completed State */
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Submission Confirmed!</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your elective preferences have been securely written to the database.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose || onComplete}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
              >
                Continue
              </button>
            </div>
          </div>
        ) : status === 'failed' ? (
          /* Failed State */
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Queue Processing Error</h3>
              <p className="text-sm text-red-600 mt-1">{errorMessage || 'An error occurred while saving.'}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white rounded-xl font-medium text-sm transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          /* Queued / Processing State */
          <div className="space-y-5 py-2">
            {/* Header badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              <span>High-Concurrency Queue Active</span>
            </div>

            {/* Position Display */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Live Queue Status</p>
              <div className="mt-1 flex items-baseline justify-center gap-2">
                <span className="text-4xl font-extrabold text-indigo-600">#{currentPosition}</span>
                <span className="text-sm text-gray-500 font-medium">in line</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Estimated wait: <strong className="text-gray-700 font-semibold">{formattedWaitTime}</strong>
              </p>
            </div>

            {/* Animated Progress Bar */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between text-xs text-gray-500 font-medium">
                <span>Progress</span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden p-0.5 border border-gray-200">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Status Footer */}
            <div className="text-xs text-gray-500 flex items-center justify-center gap-2 pt-1">
              <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span>
                {status === 'processing'
                  ? 'Saving batch to MongoDB...'
                  : 'Waiting for available batch slot...'}
              </span>
            </div>

            <p className="text-[11px] text-gray-400">
              Ticket: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{ticketId}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default QueueProgress;
