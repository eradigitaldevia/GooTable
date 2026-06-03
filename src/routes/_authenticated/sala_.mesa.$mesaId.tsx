import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, Merge, Split } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useResumoContaMesa } from "@/hooks/use-pedidos";
import { formatBRL } from "@/lib/cart";
import { JuntarComandasDialog } from "@/components/sala/juntar-comandas-dialog";
import { DividirTotalDialog } from "@/components/sala/dividir-total-dialog";
import { DetalhePedido } from "@/components/pedidos/detalhe-pedido";

export const Route = createFileRoute("/_authenticated/sala_/mesa/$mesaId")({
  component: MesaDetalhePage,
});

type StatusPedido =
  | "recebido"
  | "em_preparo"
  | "pronto"
  | "entregue"
  | "cancelado";

const DESTINO_LABEL: Record<"cozinha" | "bar", string> = {
  cozinha: "Cozinha",
  bar: "Bar",
};

const STATUS_LABEL: Record<StatusPedido, string> = {
  recebido: "recebido",
  em_preparo: "em preparo",
  pronto: "pronto",
  entregue: "entregue",
  cancelado: "cancelado",
};

function chipClasses(status: StatusPedido) {
  switch (status) {
    case "pronto":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "em_preparo":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "cancelado":
      return "bg-destructive/15 text-destructive";
    case "entregue":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
  }
}

function MesaDetalhePage() {
  const { mesaId } = Route.useParams();
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const restauranteId = restaurante?.id;
  const { data, isLoading, isError, error } = useResumoContaMesa(
    restauranteId,
    mesaId,
  );
  const [juntarOpen, setJuntarOpen] = useState(false);
  const [dividirOpen, setDividirOpen] = useState(false);
  const [pedidoAbertoId, setPedidoAbertoId] = useState<string | null>(null);

  const pedidoAberto =
    data?.pedidos.find((p) => p.id === pedidoAbertoId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button asChild size="sm" variant="ghost">
            <Link to="/sala">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div className="ml-auto text-right">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Mesa
            </div>
            <div className="text-lg font-bold">
              {data?.mesa.numero ?? "…"}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        {isLoading && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Carregando…
          </p>
        )}

        {isError && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar mesa"}
          </p>
        )}

        {data && !data.sessao && (
          <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Esta mesa não possui sessão aberta no momento.
          </p>
        )}

        {data && data.sessao && (
          <>
            {/* Conta consolidada */}
            <section className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Conta consolidada
              </h2>
              <dl className="mt-3 space-y-1 text-sm">
                <Linha label="Subtotal" value={data.totais.subtotal} />
                {data.totais.desconto_cupom > 0 && (
                  <Linha
                    label="Desconto (cupom)"
                    value={-data.totais.desconto_cupom}
                  />
                )}
                {data.totais.cashback_resgatado > 0 && (
                  <Linha
                    label="Cashback resgatado"
                    value={-data.totais.cashback_resgatado}
                  />
                )}
                <Linha
                  label="Total a pagar"
                  value={data.totais.total}
                  bold
                />
                <Linha label="Total pago" value={data.totais.total_pago} />
                <Linha label="Saldo" value={data.totais.saldo} bold />
              </dl>
            </section>

            {/* Comandas */}
            <section className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Comandas ativas ({data.comandas.length})
              </h2>
              {data.comandas.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma comanda aberta.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.comandas.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-lg border bg-background p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">
                            {c.titular_nome ??
                              (c.participantes.length > 0
                                ? `Compartilhada · ${c.participantes
                                    .map((p) => p.nome)
                                    .filter(Boolean)
                                    .join(", ")}`
                                : "Sem titular")}
                          </div>
                          {c.titular_nome && c.participantes.length > 1 && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              +{" "}
                              {c.participantes
                                .filter((p) => p.cliente_id !== c.titular_cliente_id)
                                .map((p) => p.nome)
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          )}
                        </div>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {c.tipo}
                        </span>
                      </div>
                      <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Total</div>
                          <div className="font-semibold">
                            {formatBRL(c.total)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Pago</div>
                          <div className="font-semibold">
                            {formatBRL(c.total_pago)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Saldo</div>
                          <div className="font-semibold">
                            {formatBRL(c.saldo)}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {data.comandas.length > 0 && data.sessao && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={data.comandas.length < 2}
                    onClick={() => setJuntarOpen(true)}
                  >
                    <Merge className="mr-1 h-3.5 w-3.5" /> Juntar comandas
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDividirOpen(true)}
                  >
                    <Split className="mr-1 h-3.5 w-3.5" /> Dividir total
                  </Button>
                </div>
              )}
            </section>

            {/* Pedidos */}
            <section className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Pedidos da sessão ({data.pedidos.length})
              </h2>
              {data.pedidos.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhum pedido lançado.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {data.pedidos.map((p) => {
                    const minutos = Math.floor(
                      (Date.now() - new Date(p.criado_em).getTime()) / 60000,
                    );
                    return (
                      <li
                        key={p.id}
                        className="rounded-lg border bg-background p-3 text-left transition hover:bg-muted/40 cursor-pointer w-full"
                        onClick={() => setPedidoAbertoId(p.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setPedidoAbertoId(p.id);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{minutos} min</span>
                            {p.garcom_nome && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                                {p.garcom_nome}
                              </span>
                            )}
                            {p.cliente_nome && (
                              <span className="text-[11px]">
                                · {p.cliente_nome}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            {formatBRL(p.total)}
                          </span>
                        </div>
                        {p.destino_status.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.destino_status.map((d) => (
                              <span
                                key={d.destino}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${chipClasses(d.status)}`}
                              >
                                {DESTINO_LABEL[d.destino]}:{" "}
                                {STATUS_LABEL[d.status]}
                              </span>
                            ))}
                          </div>
                        )}
                        <ul className="mt-2 space-y-0.5 text-xs">
                          {p.itens.map((it) => (
                            <li
                              key={it.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="truncate">
                                {it.quantidade}× {it.nome_produto}
                                {it.observacao && (
                                  <span className="ml-1 text-muted-foreground">
                                    ({it.observacao})
                                  </span>
                                )}
                              </span>
                              <span className="text-muted-foreground">
                                {DESTINO_LABEL[it.destino]}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {p.observacao && (
                          <p className="mt-2 text-xs italic text-muted-foreground">
                            Obs.: {p.observacao}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>

      {data && data.sessao && restauranteId && (
        <>
          <JuntarComandasDialog
            open={juntarOpen}
            onOpenChange={setJuntarOpen}
            restauranteId={restauranteId}
            mesaId={mesaId}
            sessaoId={data.sessao.id}
            comandas={data.comandas}
          />
          <DividirTotalDialog
            open={dividirOpen}
            onOpenChange={setDividirOpen}
            restauranteId={restauranteId}
            sessaoId={data.sessao.id}
            comandas={data.comandas}
            pedidos={data.pedidos}
          />
        </>
      )}

      {pedidoAberto && restauranteId && data && (
        <DetalhePedido
          pedido={{
            id: pedidoAberto.id,
            status: pedidoAberto.status,
            total: pedidoAberto.total,
            observacao: pedidoAberto.observacao,
            criado_em: pedidoAberto.criado_em,
            mesa_id: mesaId,
            restaurante_id: restauranteId,
            comanda_id: pedidoAberto.comanda_id,
          }}
          itens={pedidoAberto.itens.map((it) => ({
            id: it.id,
            pedido_id: pedidoAberto.id,
            nome_produto: it.nome_produto,
            quantidade: it.quantidade,
            preco_unit: it.preco_unit,
            observacao: it.observacao,
            cliente_nome: it.cliente_nome,
            quantidade_pronta: it.quantidade_pronta,
            destino: it.destino,
          }))}
          mesa={data.mesa.numero}
          garcomNome={pedidoAberto.garcom_nome ?? null}
          destinoStatus={pedidoAberto.destino_status}
          onClose={() => setPedidoAbertoId(null)}
          mostrarPagamento={false}
        />
      )}
    </div>
  );
}

function Linha({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{formatBRL(value)}</dd>
    </div>
  );
}