import { Badge } from "@/components/ui/badge";
import { PedidoCard } from "./pedido-card";

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
  garcom_id?: string | null;
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
interface Mesa { id: string; numero: string; }

interface DestinoStatusInfo {
  destino: "cozinha" | "bar";
  status: StatusPedido;
}

export function KanbanColuna({
  label,
  icon: Icon,
  next,
  pedidos,
  itensPorPedido,
  mesas,
  onAbrir,
  onAvancar,
  garcomPorPedido,
  destinoStatusPorPedido,
}: {
  label: string;
  icon: any;
  next?: StatusPedido;
  pedidos: Pedido[];
  itensPorPedido: Map<string, Item[]>;
  mesas: Map<string, Mesa>;
  onAbrir: (p: Pedido) => void;
  onAvancar: (p: Pedido, next: StatusPedido) => void;
  garcomPorPedido?: (p: Pedido) => string | null;
  destinoStatusPorPedido?: Map<string, DestinoStatusInfo[]>;
}) {
  return (
    <div className="flex flex-col rounded-2xl border bg-card/50 p-3">
      <div className="mb-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="font-semibold">{label}</span>
        </div>
        <Badge variant="secondary">{pedidos.length}</Badge>
      </div>
      <div className="space-y-2">
        {pedidos.length === 0 && (
          <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            Vazio
          </div>
        )}
        {pedidos.map((p) => (
          <PedidoCard
            key={p.id}
            pedido={p}
            itens={itensPorPedido.get(p.id) ?? []}
            mesaNumero={mesas.get(p.mesa_id)?.numero}
            next={next}
            onClick={() => onAbrir(p)}
            onAvancar={(n) => onAvancar(p, n)}
            garcomNome={garcomPorPedido?.(p) ?? null}
            destinoStatus={destinoStatusPorPedido?.get(p.id) ?? []}
          />
        ))}
      </div>
    </div>
  );
}
