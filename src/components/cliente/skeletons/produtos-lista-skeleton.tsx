import { Skeleton } from "@/components/ui/skeleton";

interface ProdutosListaSkeletonProps {
  count?: number;
}

export function ProdutosListaSkeleton({ count = 4 }: ProdutosListaSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-2xl border bg-card p-3 shadow-[var(--shadow-soft)]"
        >
          <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
