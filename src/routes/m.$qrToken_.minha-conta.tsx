import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Wallet, Receipt, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { useClienteMesa } from "@/hooks/use-cliente-mesa";
import {
  useAplicarCashback,
  useDetalheVisita,
  useMinhaConta,
} from "@/hooks/use-minha-conta";
import { useRealtimeMesa } from "@/hooks/use-realtime";
import { formatBRL } from "@/lib/cart";
import { CarrinhoPersistente } from "@/components/cliente/carrinho-persistente";
import { useCardapioPublico } from "@/hooks/use-cardapio-publico";
import { TemaCardapioProvider } from "@/components/cliente/tema-cardapio-provider";

export const Route = createFileRoute("/m/$qrToken_/minha-conta")({
  component: MinhaConta,
});

const PAGE_SIZE = 10;

function MinhaConta() {
  const { qrToken } = Route.useParams();
  const navigate = useNavigate();
  const { identidade, hidratado, sessaoEncerrada } = useClienteMesa(qrToken);
  const [page, setPage] = useState(0);
  const [sessaoSelecionada, setSessaoSelecionada] = useState<string | null>(null);

  useEffect(() => {
    if (hidratado && (!identidade || sessaoEncerrada)) {
      navigate({ to: "/m/$qrToken", params: { qrToken } });
    }
  }, [hidratado, identidade, sessaoEncerrada, navigate, qrToken]);

  const { data, isLoading } = useMinhaConta({
    qrToken,
    clienteId: identidade?.clienteId,
    comandaId: identidade?.comandaId,
    sessaoId: identidade?.sessaoId,
    page,
    pageSize: PAGE_SIZE,
  });

  useRealtimeMesa(qrToken, identidade?.sessaoId);
  const { data: cardapio } = useCardapioPublico(qrToken);
  const restauranteTema =
    cardapio && !("erro" in cardapio) ? cardapio.restaurante : null;

  const totalPages = data ? Math.max(1, Math.ceil(data.visitas_total / PAGE_SIZE)) : 1;


  return (
    <TemaCardapioProvider restaurante={restauranteTema} className="min-h-screen pb-12">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/90 px-4 py-3 backdrop-blur">
        <Link to="/m/$qrToken" params={{ qrToken }} className="rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Minha Conta</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">
        {isLoading || !hidratado || !data ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <section className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="text-sm text-muted-foreground">Olá,</div>
              <div className="text-xl font-bold">{data.cliente.nome}</div>
              <div className="text-xs text-muted-foreground">{data.cliente.telefone}</div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="h-4 w-4" /> Cashback
                </div>
                <div className="mt-1 text-lg font-bold text-primary">
                  {formatBRL(data.cliente.cashback_saldo)}
                </div>
              </div>
              <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Receipt className="h-4 w-4" /> Pedidos
                </div>
                <div className="mt-1 text-lg font-bold">{data.cliente.pedidos_count}</div>
              </div>
            </section>

            <section className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="text-sm font-semibold">
                Esta visita
                {data.cliente.ultima_visita ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {new Date(data.cliente.ultima_visita).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meu subtotal nesta comanda</span>
                  <span className="font-semibold">
                    {formatBRL(data.meu_subtotal_na_comanda)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meu consumo na mesa</span>
                  <span className="font-semibold">
                    {formatBRL(data.meu_consumo_na_sessao)}
                  </span>
                </div>
              </div>
            </section>

            <CashbackSection
              qrToken={qrToken}
              clienteId={identidade?.clienteId}
              comandaId={identidade?.comandaId}
              sessaoId={identidade?.sessaoId}
              saldo={data.cliente.cashback_saldo}
              meuSubtotalComanda={data.meu_subtotal_na_comanda}
              cashbackResgatadoComanda={data.cashback_resgatado_comanda}
              programaAtivo={data.programa.ativo}
              percentualMaxResgate={data.programa.percentual_max_resgate}
            />

            <section className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="text-sm font-semibold">Resumo do cliente</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Total gasto</div>
                  <div className="font-semibold">{formatBRL(data.cliente.total_gasto)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Ticket médio</div>
                  <div className="font-semibold">{formatBRL(data.cliente.ticket_medio)}</div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Histórico de visitas</div>
                <div className="text-xs text-muted-foreground">
                  {data.visitas_total} no total
                </div>
              </div>

              {data.visitas.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Sem visitas anteriores.</p>
              ) : (
                <ul className="mt-3 divide-y">
                  {data.visitas.map((v) => (
                    <li key={v.sessao_id}>
                      <button
                        type="button"
                        onClick={() => setSessaoSelecionada(v.sessao_id)}
                        className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm hover:bg-accent/40 rounded-md px-1"
                      >
                        <div className="min-w-0">
                          <div className="font-medium">
                            {new Date(v.aberta_em).toLocaleString("pt-BR")}
                            {v.mesa_numero ? ` · Mesa ${v.mesa_numero}` : ""}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {v.pedidos_count} {v.pedidos_count === 1 ? "pedido" : "pedidos"} · {formatBRL(v.total_cliente)}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {data.visitas_total > PAGE_SIZE && (
                <div className="mt-3 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Página {page + 1} de {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </section>

            <VisitaDetalheSheet
              qrToken={qrToken}
              clienteId={identidade?.clienteId}
              sessaoId={sessaoSelecionada}
              open={sessaoSelecionada !== null}
              onOpenChange={(o) => {
                if (!o) setSessaoSelecionada(null);
              }}
            />
          </>
        )}
      </main>
      <CarrinhoPersistente qrToken={qrToken} />
    </TemaCardapioProvider>
  );
}

function CashbackSection({
  qrToken,
  clienteId,
  comandaId,
  sessaoId,
  saldo,
  meuSubtotalComanda,
  cashbackResgatadoComanda,
  programaAtivo,
  percentualMaxResgate,
}: {
  qrToken: string;
  clienteId: string | undefined;
  comandaId: string | undefined;
  sessaoId: string | undefined;
  saldo: number;
  meuSubtotalComanda: number;
  cashbackResgatadoComanda: number;
  programaAtivo: boolean;
  percentualMaxResgate: number;
}) {
  const aplicar = useAplicarCashback(qrToken);
  const limitePct = Math.round(meuSubtotalComanda * (percentualMaxResgate / 100) * 100) / 100;
  const limite = Math.min(saldo, Math.max(0, limitePct - cashbackResgatadoComanda));
  const [valor, setValor] = useState(0);

  if (!programaAtivo) return null;

  const podeAplicar = limite > 0 && meuSubtotalComanda > 0 && saldo > 0;

  const handleAplicar = async () => {
    if (!clienteId || !comandaId || !sessaoId) return;
    if (valor <= 0) return;
    try {
      await aplicar.mutateAsync({ clienteId, comandaId, sessaoId, valor });
      toast.success(`Cashback de ${formatBRL(valor)} aplicado`);
      setValor(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao aplicar cashback");
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Wallet className="h-4 w-4" /> Aplicar cashback
      </div>
      {!podeAplicar ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {saldo <= 0
            ? "Você ainda não tem saldo de cashback."
            : meuSubtotalComanda <= 0
              ? "Adicione itens à sua comanda para aplicar cashback."
              : "Limite de resgate desta comanda já atingido."}
        </p>
      ) : (
        <>
          <div className="mt-2 text-xs text-muted-foreground">
            Saldo: <span className="font-semibold">{formatBRL(saldo)}</span> · Limite nesta
            comanda: <span className="font-semibold">{formatBRL(limite)}</span>
          </div>
          <div className="mt-3">
            <Slider
              value={[valor]}
              onValueChange={(v) => setValor(Math.min(limite, Math.max(0, v[0])))}
              min={0}
              max={limite}
              step={0.5}
            />
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-bold text-primary">{formatBRL(valor)}</span>
            </div>
          </div>
          <Button
            className="mt-3 w-full"
            disabled={valor <= 0 || aplicar.isPending}
            onClick={handleAplicar}
          >
            {aplicar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Aplicar {formatBRL(valor)}
          </Button>
        </>
      )}
    </section>
  );
}

function VisitaDetalheSheet({
  qrToken,
  clienteId,
  sessaoId,
  open,
  onOpenChange,
}: {
  qrToken: string;
  clienteId: string | undefined;
  sessaoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useDetalheVisita({ qrToken, clienteId, sessaoId });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes da visita</SheetTitle>
        </SheetHeader>

        {isLoading || !data ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <section className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="text-sm font-semibold">
                {new Date(data.sessao.aberta_em).toLocaleString("pt-BR")}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {data.sessao.mesa_numero ? `Mesa ${data.sessao.mesa_numero} · ` : ""}
                {data.sessao.status}
                {data.sessao.fechada_em
                  ? ` · Encerrada em ${new Date(data.sessao.fechada_em).toLocaleString("pt-BR")}`
                  : ""}
              </div>
            </section>

            {data.pedidos.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sem itens registrados nesta visita.
              </p>
            ) : (
              data.pedidos.map((p) => (
                <section
                  key={p.id}
                  className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">
                      {new Date(p.criado_em).toLocaleString("pt-BR")}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.status}</span>
                  </div>
                  {p.itens.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Sem itens seus neste pedido.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm">
                      {p.itens.map((it, idx) => (
                        <li
                          key={idx}
                          className="flex items-start justify-between gap-2 text-muted-foreground"
                        >
                          <span className="min-w-0 truncate">
                            {it.quantidade}x {it.nome_produto}
                            {it.observacao ? (
                              <span className="block text-xs italic">{it.observacao}</span>
                            ) : null}
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatBRL(it.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.observacao ? (
                    <p className="mt-2 text-xs italic text-muted-foreground">
                      Obs.: {p.observacao}
                    </p>
                  ) : null}
                  <div className="mt-2 flex justify-between border-t pt-2 text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{formatBRL(p.subtotal_cliente)}</span>
                  </div>
                </section>
              ))
            )}

            <section className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="text-sm font-semibold">Totais da visita</div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meu subtotal</span>
                  <span className="font-semibold">{formatBRL(data.totais.subtotal_cliente)}</span>
                </div>
                {data.totais.cashback_gerado > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cashback gerado</span>
                    <span className="font-semibold">{formatBRL(data.totais.cashback_gerado)}</span>
                  </div>
                )}
                {data.totais.cashback_resgatado > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cashback resgatado</span>
                    <span className="font-semibold">-{formatBRL(data.totais.cashback_resgatado)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-base">
                  <span className="font-semibold">Total pago da sessão</span>
                  <span className="font-bold text-primary">
                    {formatBRL(data.totais.total_pago_sessao)}
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
