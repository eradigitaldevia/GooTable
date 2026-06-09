import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Users, User, CheckCircle2 } from "lucide-react";
import { useClienteMesa } from "@/hooks/use-cliente-mesa";
import { useResumoConta } from "@/hooks/use-pedidos";
import { useRealtimeMesa } from "@/hooks/use-realtime";
import { formatBRL } from "@/lib/cart";
import { CupomInput } from "@/components/cliente/cupom-input";
import { DividirContaDialog } from "@/components/cliente/dividir-conta-dialog";
import { CarrinhoPersistente } from "@/components/cliente/carrinho-persistente";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/m/$qrToken_/conta")({
  component: ContaMesa,
});

function ContaMesa() {
  const { qrToken } = Route.useParams();
  const navigate = useNavigate();
  const { identidade, hidratado } = useClienteMesa(qrToken);

  useEffect(() => {
    if (hidratado && !identidade) {
      navigate({ to: "/m/$qrToken", params: { qrToken } });
    }
  }, [hidratado, identidade, navigate, qrToken]);

  const { data, isLoading } = useResumoConta({
    qrToken,
    clienteId: identidade?.clienteId,
    comandaId: identidade?.comandaId,
    sessaoId: identidade?.sessaoId,
  });

  useRealtimeMesa(qrToken, identidade?.sessaoId);

  const taxaKey = `taxa-servico-incluir:${qrToken}`;
  const [incluirTaxa, setIncluirTaxa] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem(taxaKey);
    return v == null ? true : v === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(taxaKey, incluirTaxa ? "1" : "0");
  }, [incluirTaxa, taxaKey]);

  const taxaValor = data?.taxa_servico_habilitada ? data.taxa_servico_valor : 0;
  const totalFinal = useMemo(() => {
    const base = data?.comanda_atual?.total ?? 0;
    return base + (incluirTaxa ? taxaValor : 0);
  }, [data, incluirTaxa, taxaValor]);

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/90 px-4 py-3 backdrop-blur">
        <Link to="/m/$qrToken" params={{ qrToken }} className="rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Conta da mesa</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">
        {isLoading || !hidratado ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !data?.comanda_atual ? (
          <p className="py-16 text-center text-muted-foreground">
            Nenhum pedido ainda nesta comanda.
          </p>
        ) : (
          <>
            <section className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {data.comanda_atual.tipo === "compartilhada" ? (
                  <>
                    <Users className="h-4 w-4" /> Comanda compartilhada
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4" /> Comanda individual
                  </>
                )}
              </div>

              <div className="mt-3 space-y-3">
                {data.comanda_atual.por_cliente.map((g) => (
                  <div key={g.cliente_id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{g.cliente_nome}</span>
                      <span className="font-semibold text-primary">
                        {formatBRL(g.subtotal)}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {data.comanda_atual!.itens
                        .filter((it) => (it.cliente_id ?? "sem") === g.cliente_id)
                        .map((it, idx) => (
                          <li key={idx} className="flex justify-between gap-2">
                            <span className="truncate">
                              {it.quantidade}x {it.nome_produto}
                            </span>
                            <span>{formatBRL(it.subtotal)}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meu subtotal</span>
                  <span className="font-semibold">
                    {formatBRL(data.meu_subtotal_na_comanda)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal da comanda</span>
                  <span className="font-semibold">
                    {formatBRL(data.comanda_atual.subtotal)}
                  </span>
                </div>
                {data.comanda_atual.cashback_resgatado > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cashback aplicado</span>
                    <span className="font-semibold">
                      -{formatBRL(data.comanda_atual.cashback_resgatado)}
                    </span>
                  </div>
                )}
                {data.comanda_atual.desconto_cupom > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Desconto cupom{data.comanda_atual.cupom_codigo ? ` (${data.comanda_atual.cupom_codigo})` : ""}
                    </span>
                    <span className="font-semibold">
                      -{formatBRL(data.comanda_atual.desconto_cupom)}
                    </span>
                  </div>
                )}
                {data.comanda_atual.couverts.length > 0 && (
                  <div className="space-y-0.5 border-t pt-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Couvert
                    </div>
                    {data.comanda_atual.couverts.map((c) => (
                      <div key={c.id} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {c.tipo === "mesa" ? "Couvert de mesa" : "Couvert artístico"}
                          {" "}({c.quantidade}× {formatBRL(c.valor_unitario)})
                          {c.descricao && (
                            <span className="ml-1 text-[11px] italic">— {c.descricao}</span>
                          )}
                        </span>
                        <span className="font-semibold">{formatBRL(c.total)}</span>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground">
                      Não consumiu / não tem acesso à apresentação? Chame o garçom
                      para contestar.
                    </p>
                  </div>
                )}
                <div className="flex justify-between text-base">
                  <span className="font-semibold">Total da comanda</span>
                  <span className="font-bold text-primary">
                    {formatBRL(data.comanda_atual.total)}
                  </span>
                </div>
                {data.taxa_servico_habilitada && taxaValor > 0 && (
                  <div className="mt-2 rounded-md border bg-muted/30 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {data.taxa_servico_descricao ||
                            `Taxa de serviço (${data.taxa_servico_percentual}%)`}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Opcional — você pode incluir ou retirar a qualquer momento.
                        </p>
                      </div>
                      <Switch
                        checked={incluirTaxa}
                        onCheckedChange={setIncluirTaxa}
                        aria-label="Incluir taxa de serviço"
                      />
                    </div>
                    {incluirTaxa && (
                      <div className="mt-1 flex justify-between text-sm">
                        <span className="text-muted-foreground">+ Taxa</span>
                        <span className="font-semibold">{formatBRL(taxaValor)}</span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between border-t pt-1 text-base">
                      <span className="font-semibold">Total sugerido</span>
                      <span className="font-bold text-primary">{formatBRL(totalFinal)}</span>
                    </div>
                  </div>
                )}
                {data.comanda_atual.total > 0 &&
                  data.comanda_atual.total_pago >= data.comanda_atual.total && (
                    <div className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      Pagamento confirmado
                    </div>
                  )}
              </div>

              <div className="mt-4 border-t pt-3">
                <CupomInput
                  qrToken={qrToken}
                  comandaId={data.comanda_atual.id}
                  clienteId={identidade?.clienteId}
                  cupomCodigo={data.comanda_atual.cupom_codigo}
                />
              </div>

              <div className="mt-3">
                <DividirContaDialog
                  total={totalFinal}
                  porCliente={data.comanda_atual.por_cliente.map((g) => ({
                    cliente_id: g.cliente_id,
                    cliente_nome: g.cliente_nome,
                    subtotal: g.subtotal,
                  }))}
                />
              </div>
            </section>

            {data.comandas_da_mesa.length > 1 && (
              <section className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
                <div className="text-sm text-muted-foreground">
                  Esta mesa tem {data.comandas_da_mesa.length} comandas ativas.
                </div>
                <div className="mt-2 flex justify-between text-base">
                  <span className="font-semibold">Total da mesa</span>
                  <span className="font-bold">{formatBRL(data.total_mesa)}</span>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <CarrinhoPersistente qrToken={qrToken} />
    </div>
  );
}
