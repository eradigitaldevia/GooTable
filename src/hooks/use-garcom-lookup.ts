import { useMemo } from "react";
import { useGarcons, useAtribuicoesMesas } from "@/hooks/use-garcons";

/**
 * Lookup helper: dado um restauranteId, retorna mapas para resolver
 * o nome do garçom a partir do garcom_id (pedido) ou mesa_id (mesa ativa).
 */
export function useGarcomLookup(restauranteId: string | undefined) {
  const { data: garcons } = useGarcons(restauranteId, true);
  const { data: atribuicoes } = useAtribuicoesMesas(restauranteId);

  return useMemo(() => {
    const porGarcomId = new Map<string, string>();
    for (const g of (garcons ?? []) as Array<{ id: string; nome: string }>) {
      porGarcomId.set(g.id, g.nome);
    }

    const porMesaId = new Map<string, { garcomId: string; nome: string }>();
    for (const a of (atribuicoes ?? []) as Array<{
      mesa_id: string;
      garcom_id: string | null;
      garcom_nome?: string | null;
    }>) {
      if (!a.garcom_id) continue;
      const nome = a.garcom_nome ?? porGarcomId.get(a.garcom_id) ?? null;
      if (nome) porMesaId.set(a.mesa_id, { garcomId: a.garcom_id, nome });
    }

    function nomeDoPedido(pedido: {
      garcom_id?: string | null;
      mesa_id: string;
    }): string | null {
      if (pedido.garcom_id) return porGarcomId.get(pedido.garcom_id) ?? null;
      return porMesaId.get(pedido.mesa_id)?.nome ?? null;
    }

    function nomeDaMesa(mesaId: string): string | null {
      return porMesaId.get(mesaId)?.nome ?? null;
    }

    return { porGarcomId, porMesaId, nomeDoPedido, nomeDaMesa };
  }, [garcons, atribuicoes]);
}