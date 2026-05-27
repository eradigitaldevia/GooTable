import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Wallet, CheckCircle2, Users } from "lucide-react";
import { formatBRL } from "@/lib/cart";
import { usePagamentosComanda } from "@/hooks/use-pagamentos";
import { ConfirmarPagamentoDialog } from "@/components/admin/confirmar-pagamento-dialog";
import { GarcomBadge } from "@/components/garcons/garcom-badge";
import { DividirComissaoDialog } from "@/components/pedidos/dividir-comissao-dialog";

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
}

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
  onCancelar,
  garcomNome,
}: {
  pedido: Pedido | null;
  itens: Item[];
  mesa: string | undefined;
  onClose: () => void;
  onCancelar: () => void;
  garcomNome?: string | null;
}) {
  const [pagOpen, setPagOpen] = useState(false);
  const [divOpen, setDivOpen] = useState(false);

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
                    <li key={it.id} className="flex justify-between">
                      <span>
                        {it.quantidade}× {it.nome_produto}
                        {it.observacao && <span className="block text-xs text-muted-foreground">↳ {it.observacao}</span>}
                      </span>
                      <span className="text-muted-foreground">{formatBRL(Number(it.preco_unit) * it.quantidade)}</span>
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

        {pedido.comanda_id && (
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
          <Button variant="outline" className="text-destructive" onClick={onCancelar}>
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
      </DialogContent>
    </Dialog>
  );
}
