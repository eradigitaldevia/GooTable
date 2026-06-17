import { useItensPedido } from "@/hooks/use-pedidos";
import { DetalhePedido } from "@/components/pedidos/detalhe-pedido";

type StatusPedido = "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";

interface PedidoMin {
  id: string;
  status: StatusPedido;
  total: number;
  observacao: string | null;
  criado_em: string;
  mesa_id: string;
  restaurante_id: string;
  comanda_id: string | null;
  canal?: string | null;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  taxa_entrega?: number | null;
  endereco_cep?: string | null;
  endereco_rua?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_uf?: string | null;
  endereco_referencia?: string | null;
}

/**
 * Wrapper que carrega os itens do pedido sob demanda e exibe o DetalhePedido
 * em modo somente leitura. Usado pelas abas de Histórico e Cancelados.
 */
export function DetalhePedidoLazy({
  pedido,
  mesaNumero,
  garcomNome,
  onClose,
  deliverySlug,
  readOnly = true,
}: {
  pedido: PedidoMin | null;
  mesaNumero: string | undefined;
  garcomNome?: string | null;
  onClose: () => void;
  deliverySlug?: string | null;
  readOnly?: boolean;
}) {
  const { data: itens } = useItensPedido(pedido?.id);
  if (!pedido) return null;
  return (
    <DetalhePedido
      pedido={pedido as any}
      itens={(itens ?? []) as any}
      mesa={mesaNumero}
      garcomNome={garcomNome ?? null}
      destinoStatus={[]}
      onClose={onClose}
      deliverySlug={deliverySlug ?? null}
      mostrarPagamento={false}
      readOnly={readOnly}
    />
  );
}