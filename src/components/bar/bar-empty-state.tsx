import { GlassWater } from "lucide-react";

export function BarEmptyState({ filtro }: { filtro: string }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <GlassWater className="h-12 w-12 opacity-40" />
      <p className="text-lg">
        {filtro === "todos"
          ? "Nenhuma bebida na fila. 🍹"
          : "Nenhum item nesse filtro."}
      </p>
    </div>
  );
}