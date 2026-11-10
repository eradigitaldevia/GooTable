import { Loader2 } from "lucide-react";
import type { EstadoTaxaDistancia } from "@/hooks/use-taxa-distancia";

const brl = (v: number) =>
  v > 0 ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Grátis";

export function DistanciaStatus({ estado }: { estado: EstadoTaxaDistancia }) {
  if (estado.status === "inativo") return null;
  if (estado.status === "aguardando")
    return <p className="text-xs text-muted-foreground">Informe CEP e número para calcular a taxa de entrega.</p>;
  if (estado.status === "carregando")
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Calculando taxa…
      </p>
    );
  if (estado.status === "erro") return <p className="text-sm text-destructive">{estado.erro}</p>;
  if (estado.status !== "ok") return null;
  return (
    <p className="text-sm font-medium">
      {estado.distanciaKm != null
        ? `${estado.distanciaKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km · `
        : ""}
      Taxa {brl(estado.taxa)}
    </p>
  );
}