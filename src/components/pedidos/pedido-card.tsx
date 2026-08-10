import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/cart";
import { GarcomBadge } from "@/components/garcons/garcom-badge";
import { CanalBadge } from "@/components/pedidos/canal-badge";

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
  canal?: string | null;
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

interface DestinoStatusInfo {
  destino: "cozinha" | "bar";
  status: StatusPedido;
}

const DESTINO_LABEL: Record<"cozinha" | "bar", string> = {
  cozinha: "Cozinha",
  bar: "Bar",
};

const STATUS_LABEL: Record<StatusPedido, string> = {
  recebido: "recebido",
  em_preparo: "em preparo",
  pronto: "pronto",
  entregue: "entregue",
  cancelado: "cancelado",
};

function destinoChipClasses(status: StatusPedido) {
  switch (status) {
    case "pronto":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "em_preparo":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "cancelado":
      return "bg-destructive/15 text-destructive";
    case "entregue":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
  }
}

export function PedidoCard({
  pedido,
  itens,
  mesaNumero,
  next,
  onClick,
  onAvancar,
  garcomNome,
  destinoStatus,
}: {
  pedido: Pedido;
  itens: Item[];
  mesaNumero: string | undefined;
  next?: StatusPedido;
  onClick: () => void;
  onAvancar: (next: StatusPedido) => void;
  garcomNome?: string | null;
  destinoStatus?: DestinoStatusInfo[];
}) {
  const minutos = Math.floor((Date.now() - new Date(pedido.criado_em).getTime()) / 60000);
  return (
    <div
      className="cursor-pointer rounded-xl border bg-card p-3 shadow-[var(--shadow-soft)] transition hover:border-primary"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pedido.canal && pedido.canal !== "mesa" ? (
            <span className="text-sm font-bold">
              {pedido.canal === "delivery"
                ? "Delivery"
                : pedido.canal === "retirada"
                  ? "Retirada"
                  : `Mesa ${mesaNumero ?? "?"}`}
            </span>
          ) : (
            <Link
              to="/admin/mesas/$mesaId"
              params={{ mesaId: pedido.mesa_id }}
              className="text-sm font-bold text-primary underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Mesa {mesaNumero ?? "?"}
            </Link>
          )}
          <CanalBadge canal={pedido.canal} showLabel={false} />
        </div>
        <span className="text-xs text-muted-foreground">{minutos}min</span>
      </div>
      {garcomNome && (
        <div className="mt-1">
          <GarcomBadge nome={garcomNome} />
        </div>
      )}
      {destinoStatus && destinoStatus.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {destinoStatus.map((d) => (
            <span
              key={d.destino}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${destinoChipClasses(d.status)}`}
            >
              {DESTINO_LABEL[d.destino]}: {STATUS_LABEL[d.status]}
            </span>
          ))}
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
