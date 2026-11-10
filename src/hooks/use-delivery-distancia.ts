import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  localizarOrigemFn,
  obterConfigDistanciaFn,
  salvarConfigDistanciaFn,
  salvarModoTaxaFn,
  type ModoTaxa,
} from "@/lib/delivery-distancia.functions";
import type { EnderecoCliente } from "@/lib/delivery.functions";
import type { FaixaKm, FalhaDistancia, ModeloKm } from "@/lib/taxa-distancia";

const key = (id: string) => ["delivery-distancia", id] as const;

export function useConfigDistancia(restauranteId: string) {
  const fn = useServerFn(obterConfigDistanciaFn);
  return useQuery({ queryKey: key(restauranteId), queryFn: () => fn({ data: { restauranteId } }) });
}

function useInvalidar(restauranteId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: key(restauranteId) }),
      qc.invalidateQueries({ queryKey: ["delivery-bairros", restauranteId] }),
    ]);
}

export function useSalvarModoTaxa(restauranteId: string) {
  const fn = useServerFn(salvarModoTaxaFn);
  const inv = useInvalidar(restauranteId);
  return useMutation({
    mutationFn: (modo: ModoTaxa) => fn({ data: { restauranteId, modo } }),
    onSuccess: inv,
  });
}

export interface ConfigDistanciaInput {
  modelo: ModeloKm;
  faixas: FaixaKm[];
  baseValor: number;
  baseKm: number;
  valorKmExtra: number;
  falha: FalhaDistancia;
  raioKm: number | null;
}

export function useSalvarConfigDistancia(restauranteId: string) {
  const fn = useServerFn(salvarConfigDistanciaFn);
  const inv = useInvalidar(restauranteId);
  return useMutation({
    mutationFn: (d: ConfigDistanciaInput) => fn({ data: { restauranteId, ...d } }),
    onSuccess: inv,
  });
}

export function useLocalizarOrigem(restauranteId: string) {
  const fn = useServerFn(localizarOrigemFn);
  const inv = useInvalidar(restauranteId);
  return useMutation({
    mutationFn: (endereco: EnderecoCliente) => fn({ data: { restauranteId, endereco } }),
    onSuccess: inv,
  });
}