import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useComandasPagamentoPendente } from "@/hooks/use-pagamentos";
import { ConfirmarPagamentoDialog } from "@/components/admin/confirmar-pagamento-dialog";
import { formatBRL } from "@/lib/cart";

export const Route = createFileRoute("/_authenticated/caixa/pagamentos")({
  component: CaixaPagamentosPage,
});

function CaixaPagamentosPage() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const { data: comandas, isLoading, isFetching } = useComandasPagamentoPendente(
    restaurante?.id,
  );

  const [selecionada, setSelecionada] = useState<
    { comandaId: string; restante: number } | null
  >(null);

  if (!restaurante) return null;

  const lista = comandas ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pagamentos pendentes</h1>
          <p className="text-sm text-muted-foreground">
            Comandas abertas com saldo a receber. Clique em uma para registrar o pagamento.
          </p>
        </div>
        {isFetching && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando comandas…</div>
      ) : lista.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <Receipt className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm font-medium">Nenhuma comanda com pagamento pendente</div>
          <div className="text-xs text-muted-foreground">
            Quando houver comandas abertas com saldo a receber, elas aparecerão aqui.
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Mesa</th>
                  <th className="px-4 py-3">Titular</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Pago</th>
                  <th className="px-4 py-3 text-right">Restante</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((c) => (
                  <tr key={c.comanda_id}>
                    <td className="px-4 py-3 font-medium">
                      Mesa {c.mesa_numero ?? "—"}
                      {c.pagamentos_pendentes > 0 && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          {c.pagamentos_pendentes} pendente
                          {c.pagamentos_pendentes > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.titular_nome ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">{formatBRL(c.total)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatBRL(c.total_pago)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-destructive">
                      {formatBRL(c.restante)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        onClick={() =>
                          setSelecionada({
                            comandaId: c.comanda_id,
                            restante: c.restante,
                          })
                        }
                      >
                        Registrar pagamento
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selecionada && (
        <ConfirmarPagamentoDialog
          open={!!selecionada}
          onOpenChange={(v) => !v && setSelecionada(null)}
          restauranteId={restaurante.id}
          comandaId={selecionada.comandaId}
          saldoSugerido={selecionada.restante}
        />
      )}
    </div>
  );
}