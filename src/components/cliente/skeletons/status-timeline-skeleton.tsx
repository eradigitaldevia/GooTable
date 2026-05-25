import { Skeleton } from "@/components/ui/skeleton";

export function StatusTimelineSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="border-b bg-card px-4 py-5">
        <div className="mx-auto max-w-2xl space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-40" />
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </main>
    </div>
  );
}
