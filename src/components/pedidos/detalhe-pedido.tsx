import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Wallet, CheckCircle2, Trash2, ChefHat, Wine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/cart";
import { usePagamentosComanda } from "@/hooks/use-pagamentos";
import { ConfirmarPagamentoDialog } from "@/components/admin/confirmar-pagamento-dialog";
import { GarcomBadge } from "@/components/garcons/garcom-badge";
import { useCancelarPedido, useCancelarItemPedido } from "@/hooks/use-pedidos";
import { toast } from "sonner";

type StatusPedido = "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";

interface Pedido {
  id: string;
  status: StatusPedido;
  total: number;
  observacao: string | null;
  criado_em: string;
  mesa_id: string;
  restaurante_id: string;
  comanda_id: string | null;
}
interface Item {
  id: string;
  pedido_id: string;
  nome_produto: string;
  quantidade: number;
  preco_unit: number;
  observacao: string | null;
  cliente_nome: string | null;
  quantidade_pronta?: number;
  destino?: "cozinha" | "bar";
}

interface DestinoStatusInfo {
  destino: "cozinha" | "bar";
  status: StatusPedido;
}

const DESTINO_STATUS_LABEL: Record<StatusPedido, string> = {
  recebido: "Recebido",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const METODO_LABEL: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

export function DetalhePedido({
  pedido,
  itens,
  mesa,
  onClose,
  garcomNome,
  destinoStatus,
  mostrarPagamento = true,
}: {
  pedido: Pedido | null;
  itens: Item[];
  mesa: string | undefined;
  onClose: () => void;
  garcomNome?: string | null;
  destinoStatus?: DestinoStatusInfo[];
  mostrarPagamento?: boolean;
}) {
  const [pagOpen, setPagOpen] = useState(false);
  const [cancelarPedidoOpen, setCancelarPedidoOpen] = useState(false);
  const [motivoPedido, setMotivoPedido] = useState("");
  const [itemCancelar, setItemCancelar] = useState<Item | null>(null);
  const [motivoItem, setMotivoItem] = useState("");

  const cancelarPedidoMut = useCancelarPedido(pedido?.restaurante_id);
  const cancelarItemMut = useCancelarItemPedido(pedido?.restaurante_id);

  const { data: pagInfo } = usePagamentosComanda(
    pedido?.restaurante_id,
    pedido?.comanda_id ?? undefined,
  );

  if (!pedido) return null;

  const grupos = new Map<string, Item[]>();
  for (const it of itens) {
    const k = it.cliente_nome?.trim() || "Sem nome";
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(it);
  }

  const totalComanda = pagInfo?.total ?? 0;
  const totalPago = pagInfo?.total_pago ?? 0;
  const saldo = pagInfo?.saldo ?? 0;
  const quitada = totalComanda > 0 && totalPago >= totalComanda;

  const algumItemPronto = itens.some((it) => (it.quantidade_pronta ?? 0) > 0);
  const pedidoEmAndamento = pedido.status === "em_preparo" || pedido.status === "pronto";
  const exigeMotivoPedido = pedidoEmAndamento || algumItemPronto;
  const podeCancelarItem = pedido.status !== "entregue" && pedido.status !== "cancelado";

  const handleConfirmarCancelarPedido = () => {
    if (exigeMotivoPedido && motivoPedido.trim().length < 3) {
      toast.error("Informe um motivo (mínimo 3 caracteres)");
      return;
    }
    cancelarPedidoMut.mutate(
      { pedidoId: pedido.id, motivo: motivoPedido.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Pedido cancelado");
          setCancelarPedidoOpen(false);
          setMotivoPedido("");
          onClose();
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Erro ao cancelar pedido"),
      },
    );
  };

  const exigeMotivoItem =
    !!itemCancelar &&
    (pedidoEmAndamento || (itemCancelar.quantidade_pronta ?? 0) > 0);

  const handleConfirmarCancelarItem = () => {
    if (!itemCancelar) return;
    if (exigeMotivoItem && motivoItem.trim().length < 3) {
      toast.error("Informe um motivo (mínimo 3 caracteres)");
      return;
    }
    cancelarItemMut.mutate(
      {
        itemId: itemCancelar.id,
        pedidoId: pedido.id,
        motivo: motivoItem.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Item cancelado");
          setItemCancelar(null);
          setMotivoItem("");
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Erro ao cancelar item"),
      },
    );
  };

  return (
    <Dialog open={!!pedido} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mesa {mesa ?? "?"} — Pedido #{pedido.id.slice(0, 8)}</DialogTitle>
        </DialogHeader>
        {garcomNome && (
          <div className="-mt-2">
            <GarcomBadge nome={garcomNome} />
          </div>
        )}
        {destinoStatus && destinoStatus.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {destinoStatus.map((d) => (
              <Badge key={d.destino} variant="secondary" className="gap-1">
                {d.destino === "bar" ? (
                  <Wine className="h-3 w-3" />
                ) : (
                  <ChefHat className="h-3 w-3" />
                )}
                {d.destino === "bar" ? "Bar" : "Cozinha"}: {DESTINO_STATUS_LABEL[d.status]}
              </Badge>
            ))}
          </div>
        )}
        {pedido.observacao && (
          <div className="rounded-xl bg-warning/10 p-3 text-sm">
            <span className="font-semibold">Observação: </span>
            {pedido.observacao}
          </div>
        )}
        <div className="space-y-3 max-h-[40vh] overflow-y-auto">
          {[...grupos.entries()].map(([nome, lista]) => {
            const sub = lista.reduce((s, it) => s + Number(it.preco_unit) * it.quantidade, 0);
            return (
              <div key={nome} className="rounded-xl border p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold">{nome}</span>
                  <span className="font-semibold text-primary">{formatBRL(sub)}</span>
                </div>
                <ul className="space-y-1 text-sm">
                  {lista.map((it) => (
                    <li key={it.id} className="flex items-start justify-between gap-2">
                      <span className="flex-1">
                        {it.quantidade}× {it.nome_produto}
                        {it.destino === "bar" ? (
                          <Wine className="ml-1 inline h-3 w-3 text-muted-foreground" />
                        ) : it.destino === "cozinha" ? (
                          <ChefHat className="ml-1 inline h-3 w-3 text-muted-foreground" />
                        ) : null}
                        {it.observacao && <span className="block text-xs text-muted-foreground">↳ {it.observacao}</span>}
                      </span>
                      <span className="text-muted-foreground">{formatBRL(Number(it.preco_unit) * it.quantidade)}</span>
                      {podeCancelarItem && (
                        <button
                          type="button"
                          onClick={() => {
                            setItemCancelar(it);
                            setMotivoItem("");
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Cancelar item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="font-semibold">Total do pedido</span>
          <span className="text-xl font-bold text-primary">{formatBRL(Number(pedido.total))}</span>
        </div>

        {pedido.comanda_id && mostrarPagamento && pedido.status !== "cancelado" && (
          <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total da comanda</span>
              <span className="font-semibold">{formatBRL(totalComanda)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Já pago</span>
              <span className="font-semibold">{formatBRL(totalPago)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Saldo</span>
              <span className={`font-semibold ${quitada ? "text-success" : ""}`}>
                {quitada ? "Quitada" : formatBRL(saldo)}
              </span>
            </div>

            {pagInfo && pagInfo.pagamentos.length > 0 && (
              <ul className="space-y-1 border-t pt-2 text-xs">
                {pagInfo.pagamentos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      {METODO_LABEL[p.metodo] ?? p.metodo} ·{" "}
                      {new Date(p.criado_em).toLocaleString("pt-BR")}
                    </span>
                    <span className="font-semibold">{formatBRL(Number(p.valor))}</span>
                  </li>
                ))}
              </ul>
            )}

            <Button
              size="sm"
              className="w-full"
              onClick={() => setPagOpen(true)}
              disabled={quitada}
            >
              <Wallet className="mr-2 h-4 w-4" />
              Confirmar pagamento
            </Button>
          </div>
        )}

        {pedido.status !== "cancelado" && pedido.status !== "entregue" && (
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => {
              setMotivoPedido("");
              setCancelarPedidoOpen(true);
            }}
          >
            <X className="mr-2 h-4 w-4" /> Cancelar pedido
          </Button>
        )}

        {pedido.status !== "cancelado" && (
          <Button variant="outline" onClick={() => setDivOpen(true)}>
            <Users className="mr-2 h-4 w-4" /> Dividir comissão
          </Button>
        )}

        {pedido.comanda_id && (
          <ConfirmarPagamentoDialog
            open={pagOpen}
            onOpenChange={setPagOpen}
            restauranteId={pedido.restaurante_id}
            comandaId={pedido.comanda_id}
            saldoSugerido={saldo}
          />
        )}

        <DividirComissaoDialog
          open={divOpen}
          onOpenChange={setDivOpen}
          restauranteId={pedido.restaurante_id}
          pedidoId={pedido.id}
        />

        <AlertDialog open={cancelarPedidoOpen} onOpenChange={setCancelarPedidoOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                {exigeMotivoPedido
                  ? "A cozinha já começou a preparar. Informe o motivo do cancelamento."
                  : "Esta ação reverte o valor do pedido na comanda."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {exigeMotivoPedido && (
              <Textarea
                placeholder="Motivo do cancelamento (mínimo 3 caracteres)"
                value={motivoPedido}
                onChange={(e) => setMotivoPedido(e.target.value)}
                rows={3}
              />
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelarPedidoMut.isPending}>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmarCancelarPedido();
                }}
                disabled={cancelarPedidoMut.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirmar cancelamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!itemCancelar} onOpenChange={(o) => !o && setItemCancelar(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar item?</AlertDialogTitle>
              <AlertDialogDescription>
                {itemCancelar
                  ? `${itemCancelar.quantidade}× ${itemCancelar.nome_produto}`
                  : ""}
                {exigeMotivoItem
                  ? " — a cozinha já começou a preparar. Informe o motivo."
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {exigeMotivoItem && (
              <Textarea
                placeholder="Motivo do cancelamento (mínimo 3 caracteres)"
                value={motivoItem}
                onChange={(e) => setMotivoItem(e.target.value)}
                rows={3}
              />
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelarItemMut.isPending}>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmarCancelarItem();
                }}
                disabled={cancelarItemMut.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirmar cancelamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
