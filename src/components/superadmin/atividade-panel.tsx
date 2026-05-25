import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePedidosRestaurante } from "@/hooks/use-superadmin";

const fmt = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AtividadePanel({ restauranteId }: { restauranteId: string }) {
  const { data } = usePedidosRestaurante(restauranteId, 20);
  const pedidos = data?.pedidos ?? [];

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-sm font-semibold">Últimos 20 pedidos</h2>
      {pedidos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem pedidos ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {pedidos.map((p: any) => (
            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <Badge variant="outline" className="mr-2">{p.status}</Badge>
                {new Date(p.criado_em).toLocaleString("pt-BR")}
              </div>
              <span className="tabular-nums font-medium">{fmt(p.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
