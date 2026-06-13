import { Bike, ShoppingBag, Utensils, Store } from "lucide-react";
import { cn } from "@/lib/utils";

export type CanalPedido = "mesa" | "balcao" | "delivery" | "retirada";

const MAP: Record<
  CanalPedido,
  { label: string; icon: typeof Bike; classes: string }
> = {
  mesa: { label: "Salão", icon: Utensils, classes: "bg-muted text-muted-foreground" },
  balcao: { label: "Balcão", icon: Store, classes: "bg-muted text-muted-foreground" },
  delivery: {
    label: "Delivery",
    icon: Bike,
    classes: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  retirada: {
    label: "Retirada",
    icon: ShoppingBag,
    classes: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  },
};

export function CanalBadge({
  canal,
  className,
  showLabel = true,
}: {
  canal: CanalPedido | string | null | undefined;
  className?: string;
  showLabel?: boolean;
}) {
  const c = (canal ?? "mesa") as CanalPedido;
  const info = MAP[c] ?? MAP.mesa;
  if (c === "mesa") return null;
  const Icon = info.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        info.classes,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {showLabel && <span>{info.label}</span>}
    </span>
  );
}