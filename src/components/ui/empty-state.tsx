import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  description: string;
  action?: ReactNode;
  variant?: "dashed" | "solid";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  description,
  action,
  variant = "solid",
  className,
}: EmptyStateProps) {
  const dashed = variant === "dashed";
  return (
    <div
      className={cn(
        "rounded-2xl text-center",
        dashed
          ? "border border-dashed border-border bg-card/50 p-12"
          : "border bg-card p-10",
        className,
      )}
    >
      {Icon &&
        (dashed ? (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary">
            <Icon className="h-7 w-7" />
          </div>
        ) : (
          <Icon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
        ))}
      <p
        className={cn(
          "text-sm text-muted-foreground",
          Icon && dashed && "mt-3",
        )}
      >
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
