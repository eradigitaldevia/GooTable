import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listarArtistasFn,
  criarArtistaFn,
  atualizarArtistaFn,
  removerArtistaFn,
} from "@/lib/artistas.functions";
import {
  listarApresentacoesFn,
  apresentacaoAtivaFn,
  abrirApresentacaoFn,
  atualizarPesosApresentacaoFn,
  encerrarApresentacaoFn,
} from "@/lib/apresentacoes.functions";
import {
  listarRepassesCouvertFn,
  pagarRepassesCouvertFn,
} from "@/lib/repasses-couvert.functions";

const kArtistas = (rid: string) => ["artistas", rid] as const;
const kApres = (rid: string) => ["apresentacoes", rid] as const;
const kApresAtiva = (rid: string) => ["apresentacao-ativa", rid] as const;
const kRepasses = (rid: string, f: Record<string, unknown>) =>
  ["repasses-couvert", rid, f] as const;

export function useArtistas(restauranteId: string | undefined, apenasAtivos = false) {
  const fn = useServerFn(listarArtistasFn);
  return useQuery({
    queryKey: restauranteId ? [...kArtistas(restauranteId), apenasAtivos] : ["artistas", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId!, apenasAtivos } }),
    enabled: !!restauranteId,
  });
}

export function useCriarArtista(restauranteId: string | undefined) {
  const fn = useServerFn(criarArtistaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]["data"]) => fn({ data }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: kArtistas(restauranteId) });
    },
  });
}

export function useAtualizarArtista(restauranteId: string | undefined) {
  const fn = useServerFn(atualizarArtistaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]["data"]) => fn({ data }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: kArtistas(restauranteId) });
    },
  });
}

export function useRemoverArtista(restauranteId: string | undefined) {
  const fn = useServerFn(removerArtistaFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]["data"]) => fn({ data }),
    onSuccess: () => {
      if (restauranteId) qc.invalidateQueries({ queryKey: kArtistas(restauranteId) });
    },
  });
}

export function useApresentacoes(restauranteId: string | undefined) {
  const fn = useServerFn(listarApresentacoesFn);
  return useQuery({
    queryKey: restauranteId ? kApres(restauranteId) : ["apresentacoes", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useApresentacaoAtiva(restauranteId: string | undefined) {
  const fn = useServerFn(apresentacaoAtivaFn);
  return useQuery({
    queryKey: restauranteId ? kApresAtiva(restauranteId) : ["apresentacao-ativa", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

export function useAbrirApresentacao(restauranteId: string | undefined) {
  const fn = useServerFn(abrirApresentacaoFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]["data"]) => fn({ data }),
    onSuccess: () => {
      if (!restauranteId) return;
      qc.invalidateQueries({ queryKey: kApres(restauranteId) });
      qc.invalidateQueries({ queryKey: kApresAtiva(restauranteId) });
    },
  });
}

export function useAtualizarPesosApresentacao(restauranteId: string | undefined) {
  const fn = useServerFn(atualizarPesosApresentacaoFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]["data"]) => fn({ data }),
    onSuccess: () => {
      if (!restauranteId) return;
      qc.invalidateQueries({ queryKey: kApres(restauranteId) });
      qc.invalidateQueries({ queryKey: kApresAtiva(restauranteId) });
    },
  });
}

export function useEncerrarApresentacao(restauranteId: string | undefined) {
  const fn = useServerFn(encerrarApresentacaoFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof fn>[0]["data"]) => fn({ data }),
    onSuccess: () => {
      if (!restauranteId) return;
      qc.invalidateQueries({ queryKey: kApres(restauranteId) });
      qc.invalidateQueries({ queryKey: kApresAtiva(restauranteId) });
      qc.invalidateQueries({ queryKey: ["repasses-couvert", restauranteId] });
    },
  });
}

export function useRepassesCouvert(
  restauranteId: string | undefined,
  filtros: { status?: "pendente" | "pago" | "todos"; artistaId?: string } = {},
) {
  const fn = useServerFn(listarRepassesCouvertFn);
  const status = filtros.status ?? "pendente";
  return useQuery({
    queryKey: restauranteId
      ? kRepasses(restauranteId, { status, artistaId: filtros.artistaId })
      : ["repasses-couvert", "none"],
    queryFn: () =>
      fn({
        data: {
          restauranteId: restauranteId!,
          status,
          artistaId: filtros.artistaId,
        },
      }),
    enabled: !!restauranteId,
  });
}

export function usePagarRepassesCouvert(restauranteId: string | undefined) {
  const fn = useServerFn(pagarRepassesCouvertFn);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { ids: string[] }) =>
      fn({ data: { restauranteId: restauranteId!, ids: data.ids } }),
    onSuccess: () => {
      if (restauranteId)
        qc.invalidateQueries({ queryKey: ["repasses-couvert", restauranteId] });
    },
  });
}