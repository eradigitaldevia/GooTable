import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/cart";
import { GarcomBadge } from "@/components/garcons/garcom-badge";

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

export function PedidoCard({
  pedido,
  itens,
  mesaNumero,
  next,
  onClick,
  onAvancar,
  garcomNome,
}: {
  pedido: Pedido;
  itens: Item[];
  mesaNumero: string | undefined;
  next?: StatusPedido;
  onClick: () => void;
  onAvancar: (next: StatusPedido) => void;
  garcomNome?: string | null;
}) {
  const minutos = Math.floor((Date.now() - new Date(pedido.criado_em).getTime()) / 60000);
  return (
    <div
      className="cursor-pointer rounded-xl border bg-card p-3 shadow-[var(--shadow-soft)] transition hover:border-primary"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Mesa {mesaNumero ?? "?"}</span>
        <span className="text-xs text-muted-foreground">{minutos}min</span>
      </div>
      {garcomNome && (
        <div className="mt-1">
          <GarcomBadge nome={garcomNome} />
        </div>
      )}
      <ul className="mt-2 space-y-0.5 text-xs">
        {itens.slice(0, 3).map((it) => (
          <li key={it.id} className="truncate">
            {it.quantidade}× {it.nome_produto}
          </li>
        ))}
        {itens.length > 3 && (
          <li className="text-muted-foreground">+{itens.length - 3} mais…</li>
        )}
      </ul>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">{formatBRL(Number(pedido.total))}</span>
        {next && (
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onAvancar(next);
            }}
          >
            Avançar
          </Button>
        )}
      </div>
    </div>
  );
}
