import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Clock } from "lucide-react";
import { cartTotal, clearCart, formatBRL, getCart, setCart, type CartItem } from "@/lib/cart";
import { toast } from "sonner";
import { CarrinhoItemRow } from "@/components/cliente/carrinho-item-row";
import { ConfirmarPedidoDialog } from "@/components/cliente/confirmar-pedido-dialog";
import { estimarTempoCart } from "@/lib/tempo-preparo";
import { useCriarPedidoPublico } from "@/hooks/use-pedidos";
import { useClienteMesa } from "@/hooks/use-cliente-mesa";

export const Route = createFileRoute("/m/$qrToken_/carrinho")({
  component: Carrinho,
});

function Carrinho() {
  const { qrToken } = Route.useParams();
  const navigate = useNavigate();
  const { identidade, hidratado } = useClienteMesa(qrToken);
  const [items, setItems] = useState<CartItem[]>([]);
  const [obsGeral, setObsGeral] = useState("");
  const criarPedido = useCriarPedidoPublico();

  useEffect(() => {
    setItems(getCart(qrToken));
  }, [qrToken]);

  useEffect(() => {
    if (hidratado && !identidade) {
      navigate({ to: "/m/$qrToken", params: { qrToken } });
    }
  }, [hidratado, identidade, navigate, qrToken]);

  const atualizar = (next: CartItem[]) => {
    setItems(next);
    setCart(qrToken, next);
  };

  const setQtd = (idx: number, q: number) => {
    if (q < 1) return atualizar(items.filter((_, i) => i !== idx));
    atualizar(items.map((it, i) => (i === idx ? { ...it, quantidade: q } : it)));
  };

  const setNome = (idx: number, nome: string) => {
    atualizar(items.map((it, i) => (i === idx ? { ...it, cliente_nome: nome || undefined } : it)));
  };

  const setObs = (idx: number, obs: string) => {
    atualizar(items.map((it, i) => (i === idx ? { ...it, observacao: obs || undefined } : it)));
  };

  const enviarPedido = async () => {
    if (items.length === 0) return;
    if (!identidade) {
      toast.error("Identifique-se primeiro");
      return;
    }
    try {
      const { id } = await criarPedido.mutateAsync({
        qrToken,
        clienteId: identidade.clienteId,
        comandaId: identidade.comandaId,
        sessaoId: identidade.sessaoId,
        observacao: obsGeral.trim() || undefined,
        itens: items.map((it) => ({
          produto_id: it.produto_id,
          nome: it.nome,
          preco: it.preco,
          quantidade: it.quantidade,
          observacao: it.observacao ?? undefined,
          cliente_nome: it.cliente_nome ?? identidade.nome,
          cliente_id: it.cliente_id ?? identidade.clienteId,
        })),
      });
      clearCart(qrToken);
      toast.success("Pedido enviado!");
      navigate({ to: "/m/$qrToken/status/$pedidoId", params: { qrToken, pedidoId: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar pedido");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/90 px-4 py-3 backdrop-blur">
        <Link to="/m/$qrToken" params={{ qrToken }} className="rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Seu pedido</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        {items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">Seu carrinho está vazio.</p>
            <Button className="mt-4" onClick={() => navigate({ to: "/m/$qrToken", params: { qrToken } })}>
              Ver cardápio
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <CarrinhoItemRow
                  key={idx}
                  item={it}
                  idx={idx}
                  onSetQtd={setQtd}
                  onSetNome={setNome}
                  onSetObs={setObs}
                />
              ))}
            </div>

            <div className="mt-6">
              <Label htmlFor="obs">Observação geral (opcional)</Label>
              <Textarea id="obs" value={obsGeral} onChange={(e) => setObsGeral(e.target.value)} rows={2} />
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border bg-card p-4">
              <span className="text-muted-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">{formatBRL(cartTotal(items))}</span>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Estimativa de preparo ~{estimarTempoCart(items)} min
            </div>
          </>
        )}
      </main>

      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <ConfirmarPedidoDialog
              items={items}
              obsGeral={obsGeral.trim()}
              enviando={criarPedido.isPending}
              onConfirm={enviarPedido}
            />
          </div>
        </div>
      )}
    </div>
  );
}
