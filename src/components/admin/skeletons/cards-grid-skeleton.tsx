import { Skeleton } from "@/components/ui/skeleton";

interface CardsGridSkeletonProps {
  count?: number;
  className?: string;
}

export function CardsGridSkeleton({
  count = 4,
  className = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
}: CardsGridSkeletonProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
