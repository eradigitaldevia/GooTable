import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCardapio } from "@/hooks/use-cardapio";
import {
  useCriarPedidoGarcom,
  useListarComandasAbertasMesa,
} from "@/hooks/use-pedidos";
import { useSalaDados } from "@/hooks/use-sala";
import { formatBRL } from "@/lib/cart";
import { CardapioDensoList } from "@/components/sala/nova-comanda/cardapio-denso-list";
import { IdentificarClienteModal } from "@/components/sala/nova-comanda/identificar-cliente-modal";
import { EscolherComandaModal } from "@/components/sala/nova-comanda/escolher-comanda-modal";
import type { ComandaAbertaInfo } from "@/lib/pedidos.functions";

export const Route = createFileRoute("/_authenticated/sala/nova-comanda/$mesaId")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) throw redirect({ to: "/login" });
  },
  component: NovaComandaPage,
});

interface CarrinhoItem {
  produto_id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

function NovaComandaPage() {
  const { mesaId } = Route.useParams();
  const navigate = useNavigate();
  const { data: sala } = useSalaDados();
  const restauranteId = sala?.garcom.restaurante_id;
  const garcomId = sala?.garcom.id;
  const mesa = sala?.mesas.find((m) => m.id === mesaId);

  const { data: cardapio, isLoading: loadingCardapio } = useCardapio(restauranteId);
  const criar = useCriarPedidoGarcom();
  const listarComandas = useListarComandasAbertasMesa();

  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [cliente, setCliente] = useState<{ id: string; nome: string } | null>(null);
  const [modalIdentificar, setModalIdentificar] = useState(false);
  const [comandasAbertas, setComandasAbertas] = useState<ComandaAbertaInfo[] | null>(null);

  const qtdNoCarrinho = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of carrinho) m.set(it.produto_id, it.quantidade);
    return m;
  }, [carrinho]);

  const totalItens = carrinho.reduce((s, it) => s + it.quantidade, 0);
  const totalValor = carrinho.reduce((s, it) => s + it.preco * it.quantidade, 0);

  const handleAdd = (produtoId: string) => {
    const prod = (cardapio?.produtos ?? []).find((p) => p.id === produtoId);
    if (!prod) return;
    setCarrinho((prev) => {
      const idx = prev.findIndex((it) => it.produto_id === produtoId);
      if (idx >= 0) {
        const copia = [...prev];
        copia[idx] = { ...copia[idx], quantidade: copia[idx].quantidade + 1 };
        return copia;
      }
      return [
        ...prev,
        {
          produto_id: produtoId,
          nome: prod.nome,
          preco: Number(prod.preco),
          quantidade: 1,
        },
      ];
    });
  };

  const handleRemove = (produtoId: string) => {
    setCarrinho((prev) => {
      const idx = prev.findIndex((it) => it.produto_id === produtoId);
      if (idx < 0) return prev;
      const copia = [...prev];
      const novaQtd = copia[idx].quantidade - 1;
      if (novaQtd <= 0) copia.splice(idx, 1);
      else copia[idx] = { ...copia[idx], quantidade: novaQtd };
      return copia;
    });
  };

  const enviar = (comandaId?: string) => {
    if (!restauranteId || !mesaId || carrinho.length === 0) return;
    criar.mutate(
      {
        restauranteId,
        mesaId,
        garcomId: garcomId ?? null,
        clienteId: cliente?.id ?? null,
        comandaId: comandaId ?? null,
        itens: carrinho.map((it) => ({
          produto_id: it.produto_id,
          quantidade: it.quantidade,
        })),
      },
      {
        onSuccess: (res) => {
          if (!res.ok && res.erro === "multiplas_comandas_abertas") {
            listarComandas.mutate(
              { restauranteId, mesaId },
              {
                onSuccess: (lista) => setComandasAbertas(lista),
                onError: (e) =>
                  toast.error(
                    e instanceof Error ? e.message : "Erro ao carregar comandas",
                  ),
              },
            );
            return;
          }
          toast.success("Pedido enviado!");
          navigate({ to: "/sala" });
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Erro ao enviar pedido"),
      },
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/sala" })}
            className="flex items-center gap-1 rounded-lg p-1 text-sm text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Mesa {mesa?.numero ?? "—"}</span>
          </button>
          {cliente ? (
            <button
              type="button"
              onClick={() => setCliente(null)}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {cliente.nome}
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModalIdentificar(true)}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Identificar
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        {loadingCardapio || !cardapio ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Carregando cardápio…
          </p>
        ) : (
          <CardapioDensoList
            categorias={cardapio.categorias}
            produtos={cardapio.produtos}
            qtdNoCarrinho={qtdNoCarrinho}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        )}
      </main>

      {totalItens > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <div className="text-sm">
              <p className="font-semibold">
                {totalItens} {totalItens === 1 ? "item" : "itens"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBRL(totalValor)}
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              className="h-12 rounded-2xl px-6 text-base font-semibold"
              onClick={() => enviar()}
              disabled={criar.isPending}
            >
              {criar.isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : null}
              Enviar pedido
            </Button>
          </div>
        </div>
      )}

      {modalIdentificar && restauranteId && (
        <IdentificarClienteModal
          restauranteId={restauranteId}
          onClose={() => setModalIdentificar(false)}
          onIdentificado={(c) => {
            setCliente({ id: c.id, nome: c.nome });
            setModalIdentificar(false);
            toast.success(`Cliente: ${c.nome}`);
          }}
        />
      )}

      {comandasAbertas && (
        <EscolherComandaModal
          comandas={comandasAbertas}
          onSelecionar={(id) => {
            setComandasAbertas(null);
            enviar(id);
          }}
          onClose={() => setComandasAbertas(null)}
        />
      )}
    </div>
  );
}