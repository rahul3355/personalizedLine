/**
 * Skeleton screen components for loading states
 * These provide visual continuity by showing skeleton versions of actual content
 */

interface SkeletonLineProps {
  className?: string;
}

function SkeletonLine({ className }: SkeletonLineProps) {
  return <div className={`h-3 rounded-full bg-gray-200/80 ${className ?? ""}`} />;
}

/**
 * Skeleton for individual job cards in the jobs list
 * Matches the structure of actual job cards with icon, filename, status, and metadata
 */
export function JobCardSkeleton() {
  return (
    <div className="flex w-full items-center gap-5 px-6 py-[14px] animate-pulse">
      {/* Status Icon Skeleton */}
      <div className="h-9 w-9 rounded-full bg-gray-200/80 flex-shrink-0" />

      {/* Content Area */}
      <div className="min-w-0 flex-1 space-y-2">
        {/* Filename + Time */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SkeletonLine className="w-3/4 h-4" />
          </div>
          <SkeletonLine className="w-16 h-3" />
        </div>

        {/* Status Pill, Rows, Progress Indicator */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <SkeletonLine className="w-20 h-5" />
          <SkeletonLine className="w-16 h-3" />
        </div>
      </div>

      {/* Download Button Skeleton */}
      <div className="h-9 w-9 rounded-md bg-gray-200/80 flex-shrink-0" />
    </div>
  );
}

/**
 * Skeleton for job list - shows multiple job card skeletons
 * @param count - Number of skeleton cards to show (default: 5)
 */
export function JobListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="divide-y divide-[#EFF0F6]">
      {Array.from({ length: count }).map((_, idx) => (
        <li key={`job-skeleton-${idx}`} className={idx > 0 ? "border-t border-[#EFF0F6]" : ""}>
          <JobCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

/**
 * Skeleton for transaction history rows on home page
 * Matches the structure of actual transaction entries
 */
export function TransactionRowSkeleton() {
  return (
    <div className="flex justify-between items-center text-sm border-b py-2 animate-pulse">
      <div className="flex-1">
        <SkeletonLine className="w-3/4 h-3" />
      </div>
      <SkeletonLine className="w-24 h-3 ml-4" />
    </div>
  );
}

/**
 * Skeleton for transaction history list
 * @param count - Number of skeleton rows to show (default: 3)
 */
export function TransactionHistorySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, idx) => (
        <TransactionRowSkeleton key={`transaction-skeleton-${idx}`} />
      ))}
    </div>
  );
}

/**
 * Skeleton for file preview on upload page
 * Shows a preview of what the file card will look like
 */
export function FilePreviewSkeleton() {
  return (
    <div className="mt-4 p-4 border rounded-lg shadow animate-pulse">
      <div className="space-y-3">
        {/* File info header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-gray-200/80" />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="w-48 h-4" />
            <SkeletonLine className="w-32 h-3" />
          </div>
        </div>

        {/* Processing status */}
        <div className="pt-2 space-y-2">
          <SkeletonLine className="w-full h-3" />
          <SkeletonLine className="w-5/6 h-3" />
        </div>

        {/* Progress bar placeholder */}
        <div className="pt-2">
          <div className="h-2 bg-gray-200/80 rounded-full overflow-hidden">
            <div className="h-full bg-gray-300/80 w-1/3 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for job detail panel
 * Shows the detail information structure
 */
export function DetailSkeleton() {
  const rows = [
    { labelWidth: "w-16", valueWidth: "w-20" },
    { labelWidth: "w-14", valueWidth: "w-16" },
    { labelWidth: "w-20", valueWidth: "w-24" },
    { labelWidth: "w-20", valueWidth: "w-24" },
    { labelWidth: "w-14", valueWidth: "w-28" },
  ];

  return (
    <div className="animate-pulse px-4 py-2">
      {rows.map((row, index) => (
        <div key={`detail-skeleton-${index}`} className="flex items-center justify-between py-2">
          <SkeletonLine className={row.labelWidth} />
          <SkeletonLine className={`ml-4 ${row.valueWidth}`} />
        </div>
      ))}
    </div>
  );
}
