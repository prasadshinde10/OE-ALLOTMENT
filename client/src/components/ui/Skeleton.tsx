import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-md ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-neutral-100 p-6 shadow-sm space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg mt-4" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-white rounded-xl p-6 border border-neutral-100 shadow-sm space-y-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-neutral-100">
      {Array.from({ length: cols }).map((_, idx) => (
        <td key={idx} className="py-4 px-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full bg-white rounded-lg shadow ring-1 ring-black ring-opacity-5 overflow-hidden">
      <div className="bg-gray-50 border-b border-neutral-100 px-4 py-3.5 flex gap-4">
        {Array.from({ length: cols }).map((_, idx) => (
          <Skeleton key={idx} className="h-4 w-24" />
        ))}
      </div>
      <table className="min-w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <SkeletonTableRow key={rowIdx} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="max-w-3xl mx-auto mt-8 bg-white shadow rounded-lg p-6 space-y-6">
      <div className="space-y-2 border-b pb-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
      <div className="border-t pt-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  );
}
