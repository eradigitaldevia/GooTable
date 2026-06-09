import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarPedidosComandaPublicoFn } from "@/lib/status-pedido-publico.functions";

export function usePedidosComanda(qrToken: string, comandaId: string | null | undefined) {
  const fn = useServerFn(listarPedidosComandaPublicoFn);
  return useQuery({
    queryKey: ["pedidos-comanda", qrToken, comandaId ?? "none"],
    queryFn: () => fn({ data: { qrToken, comandaId: comandaId! } }),
    enabled: !!qrToken && !!comandaId,
  });
}