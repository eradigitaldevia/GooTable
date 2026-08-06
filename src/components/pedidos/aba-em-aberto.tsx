import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  usePedidosAbertosAntigos,
  useCancelarPedido,
  useAtualizarStatusPedido,
  useCancelarPedidosEmLote,
  useMarcarPedidosEntreguesEmLote,
} from "@/hooks/use-pedidos";
import { TabelaPedidos } from "@/components/pedidos/tabela-pedidos";
import { DetalhePedidoLazy } from "@/components/pedidos/detalhe-pedido-lazy";
import { CancelarLoteDialog } from "@/components/pedidos/cancelar-lote-dialog";
import { useGarcomLookup } from "@/hooks/use-garcom-lookup";

export function AbaEmAberto({
  restauranteId,
  deliverySlug,
}: {
  restauranteId: string;
  deliverySlug: string | null;
}) {
  const { data, isLoading } = usePedidosAbertosAntigos(restauranteId);
  const { nomeDoPedido } = useGarcomLookup(restauranteId);
  const cancelarMut = useCancelarPedido(restauranteId);
  const atualizarStatusMut = useAtualizarStatusPedido(restauranteId);
  const cancelarLoteMut = useCancelarPedidosEmLote(restauranteId);
  const entregarLoteMut = useMarcarPedidosEntreguesEmLote(restauranteId);

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [cancelLoteOpen, setCancelLoteOpen] = useState(false);
  const [cancelarUmId, setCancelarUmId] = useState<string | null>(null);
  const [aberto, setAberto] = useState<any | null>(null);

  const pedidos = (data?.pedidos ?? []) as any[];
  const mesasMap = useMemo(() => {
    const m = new Map<string, { id: string; numero: string }>();
    for (const x of data?.mesas ?? []) m.set(x.id, x);
    return m;
  }, [data?.mesas]);

  function toggle(id: string) {
    setSelecionados((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleTodos(checked: boolean) {
    if (checked) setSelecionados(new Set(pedidos.map((p) => p.id)));
    else setSelecionados(new Set());
  }

  function handleCancelarUmConfirm(motivo: string) {
    const id = cancelarUmId;
    if (!id) return;
    cancelarMut.mutate(
      { pedidoId: id, motivo: motivo || "Cancelado via auditoria" },
      {
        onSuccess: () => {
          toast.success("Pedido cancelado");
          setCancelarUmId(null);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
      },
    );
  }

  function handleEntregarUm(id: string) {
    atualizarStatusMut.mutate(
      { id, status: "entregue" },
      {
        onSuccess: () => toast.success("Pedido marcado como entregue"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
      },
    );
  }

  function handleEntregarLote() {
    const ids = Array.from(selecionados);
    if (!ids.length) return;
    if (!confirm(`Marcar ${ids.length} pedido(s) como entregue?`)) return;
    entregarLoteMut.mutate(
      { pedidoIds: ids },
      {
        onSuccess: (r) => {
          toast.success(`${r.ok} pedido(s) entregue(s)${r.erros.length ? ` · ${r.erros.length} falha(s)` : ""}`);
          setSelecionados(new Set());
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
      },
    );
  }

  function handleCancelarLoteConfirm(motivo: string) {
    const ids = Array.from(selecionados);
    if (!ids.length) return;
    cancelarLoteMut.mutate(
      { pedidoIds: ids, motivo: motivo || undefined },
      {
        onSuccess: (r) => {
          toast.success(`${r.ok} pedido(s) cancelado(s)${r.erros.length ? ` · ${r.erros.length} falha(s)` : ""}`);
          setSelecionados(new Set());
          setCancelLoteOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
      },
    );
  }

  if (isLoading) {
    return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400" />
        <span>
          Pedidos abertos há mais de 1 dia — geralmente esquecidos ou de teste.
          Use as ações para sanear sem afetar o fluxo do dia.
        </span>
      </div>

      {selecionados.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
          <span className="text-sm font-medium">{selecionados.size} selecionado(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleEntregarLote} disabled={entregarLoteMut.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar entregue
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setCancelLoteOpen(true)}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      <TabelaPedidos
        pedidos={pedidos}
        mesas={mesasMap}
        onAbrir={(p) => setAberto(p)}
        selecionados={selecionados}
        onToggleSelecionado={toggle}
        onToggleTodos={toggleTodos}
        mostrarIdade
        garcomLookup={(p) => nomeDoPedido(p as any)}
        acoesPorLinha={(p) => (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => handleEntregarUm(p.id)} title="Marcar entregue">
              <CheckCircle2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCancelarUmId(p.id)} title="Cancelar pedido">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        vazio="Nenhum pedido antigo em aberto. Tudo limpo!"
      />

      <CancelarLoteDialog
        open={cancelLoteOpen}
        onOpenChange={setCancelLoteOpen}
        quantidade={selecionados.size}
        onConfirm={handleCancelarLoteConfirm}
        loading={cancelarLoteMut.isPending}
      />

      <CancelarLoteDialog
        key={cancelarUmId ?? "nenhum"}
        open={!!cancelarUmId}
        onOpenChange={(v) => {
          if (!v) setCancelarUmId(null);
        }}
        quantidade={1}
        onConfirm={handleCancelarUmConfirm}
        loading={cancelarMut.isPending}
      />

      <DetalhePedidoLazy
        pedido={aberto}
        mesaNumero={aberto ? mesasMap.get(aberto.mesa_id)?.numero : undefined}
        garcomNome={aberto ? nomeDoPedido(aberto) : null}
        onClose={() => setAberto(null)}
        deliverySlug={deliverySlug}
        readOnly={false}
      />
    </div>
  );
}