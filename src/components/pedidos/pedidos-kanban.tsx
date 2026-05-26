import type { LucideIcon } from "lucide-react";
import { KanbanColuna } from "@/components/pedidos/kanban-coluna";

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

interface Coluna {
  key: StatusPedido;
  label: string;
  icon: LucideIcon;
  next?: StatusPedido;
}

export function PedidosKanban({
  colunas,
  pedidos,
  itensPorPedido,
  mesas,
  onAbrir,
  onAvancar,
  garcomPorPedido,
}: {
  colunas: Coluna[];
  pedidos: Pedido[];
  itensPorPedido: Map<string, Item[]>;
  mesas: Map<string, Mesa>;
  onAbrir: (p: Pedido) => void;
  onAvancar: (p: Pedido, novo: StatusPedido) => void | Promise<void>;
  garcomPorPedido?: (p: Pedido) => string | null;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {colunas.map((col) => (
        <KanbanColuna
          key={col.key}
          label={col.label}
          icon={col.icon}
          next={col.next}
          pedidos={pedidos.filter((p) => p.status === col.key)}
          itensPorPedido={itensPorPedido}
          mesas={mesas}
          onAbrir={onAbrir}
          onAvancar={onAvancar}
          garcomPorPedido={garcomPorPedido}
        />
      ))}
    </div>
  );
}
