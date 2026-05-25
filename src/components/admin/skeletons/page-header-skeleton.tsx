import { Skeleton } from "@/components/ui/skeleton";

interface PageHeaderSkeletonProps {
  withActions?: boolean;
}

export function PageHeaderSkeleton({ withActions = false }: PageHeaderSkeletonProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {withActions && (
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
        </div>
      )}
    </header>
  );
}
