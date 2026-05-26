import { cn } from "@/lib/utils";
import { UserRound } from "lucide-react";

export function GarcomBadge({
  nome,
  className,
}: {
  nome: string | null | undefined;
  className?: string;
}) {
  if (!nome) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary",
        className,
      )}
      title={`Garçom: ${nome}`}
    >
      <UserRound className="h-3 w-3" />
      {nome}
    </span>
  );
}