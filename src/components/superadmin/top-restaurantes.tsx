import { Card } from "@/components/ui/card";

export function TopRestaurantes({
  itens,
  fmt,
}: {
  itens: { nome: string; total: number }[];
  fmt: (n: number) => string;
}) {
  return (
    <Card className="p-4 sm:p-6">
      <h2 className="mb-4 text-sm font-semibold">Top 5 restaurantes — faturamento no mês</h2>
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem pedidos entregues no mês.</p>
      ) : (
        <ul className="divide-y divide-border">
          {itens.map((r, i) => (
            <li key={i} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium">
                {i + 1}. {r.nome}
              </span>
              <span className="tabular-nums">{fmt(r.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
