/**
 * Fábrica centralizada de query keys para TanStack Query.
 * Mantém consistência e facilita invalidações.
 */
export const queryKeys = {
  // Restaurante atual do usuário autenticado
  meuRestaurante: (userId: string) => ["meu-restaurante", userId] as const,

  // Cardápio (admin)
  categorias: (restauranteId: string) => ["categorias", restauranteId] as const,
  produtos: (restauranteId: string) => ["produtos", restauranteId] as const,

  // Pedidos
  pedidos: (restauranteId: string) => ["pedidos", restauranteId] as const,
  pedido: (pedidoId: string) => ["pedido", pedidoId] as const,

  // Mesas
  mesas: (restauranteId: string) => ["mesas", restauranteId] as const,

  // Membros do restaurante
  membros: (restauranteId: string) => ["membros", restauranteId] as const,

  // Super-admin
  restaurantes: (filtros?: Record<string, unknown>) =>
    filtros ? (["restaurantes", filtros] as const) : (["restaurantes"] as const),
  restaurante: (id: string) => ["restaurante", id] as const,
  pedidosRestaurante: (restauranteId: string) => ["pedidos-restaurante", restauranteId] as const,
  logs: (filtros?: Record<string, unknown>) =>
    filtros ? (["logs", filtros] as const) : (["logs"] as const),

  // Cardápio público (cliente via QR)
  cardapioPublico: (qrToken: string) => ["cardapio-publico", qrToken] as const,

  // Garçons / comissões
  garcons: (restauranteId: string) => ["garcons", restauranteId] as const,
  atribuicoesMesas: (restauranteId: string) => ["atribuicoes-mesas", restauranteId] as const,
  comissoes: (restauranteId: string, filtros?: Record<string, unknown>) =>
    filtros
      ? (["comissoes", restauranteId, filtros] as const)
      : (["comissoes", restauranteId] as const),
  resumoComissoes: (restauranteId: string) => ["resumo-comissoes", restauranteId] as const,
} as const;
