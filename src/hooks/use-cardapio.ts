import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import {
  alterarDisponibilidadeProdutoFn,
  atualizarCategoriaFn,
  atualizarProdutoFn,
  criarCategoriaFn,
  criarProdutoFn,
  excluirCategoriaFn,
  excluirProdutoFn,
  listarCardapioFn,
} from "@/lib/cardapio.functions";

const cardapioKey = (restauranteId: string) => ["cardapio", restauranteId] as const;

export function useCardapio(restauranteId: string | undefined) {
  const fn = useServerFn(listarCardapioFn);
  return useQuery({
    queryKey: restauranteId ? cardapioKey(restauranteId) : ["cardapio", "none"],
    queryFn: () => fn({ data: { restauranteId: restauranteId! } }),
    enabled: !!restauranteId,
  });
}

function useInvalidateCardapio(restauranteId: string | undefined) {
  const qc = useQueryClient();
  return () => {
    if (!restauranteId) return;
    qc.invalidateQueries({ queryKey: cardapioKey(restauranteId) });
    qc.invalidateQueries({ queryKey: queryKeys.categorias(restauranteId) });
    qc.invalidateQueries({ queryKey: queryKeys.produtos(restauranteId) });
  };
}

export function useCriarCategoria(restauranteId: string | undefined) {
  const fn = useServerFn(criarCategoriaFn);
  const invalidate = useInvalidateCardapio(restauranteId);
  return useMutation({
    mutationFn: (data: { nome: string }) =>
      fn({ data: { restauranteId: restauranteId!, nome: data.nome } }),
    onSuccess: invalidate,
  });
}

export function useAtualizarCategoria(restauranteId: string | undefined) {
  const fn = useServerFn(atualizarCategoriaFn);
  const invalidate = useInvalidateCardapio(restauranteId);
  return useMutation({
    mutationFn: (data: { id: string; nome: string }) =>
      fn({ data: { id: data.id, nome: data.nome, restauranteId: restauranteId! } }),
    onSuccess: invalidate,
  });
}

export function useExcluirCategoria(restauranteId: string | undefined) {
  const fn = useServerFn(excluirCategoriaFn);
  const invalidate = useInvalidateCardapio(restauranteId);
  return useMutation({
    mutationFn: (data: { id: string }) =>
      fn({ data: { id: data.id, restauranteId: restauranteId! } }),
    onSuccess: invalidate,
  });
}

type ProdutoPayload = {
  nome: string;
  descricao?: string | null;
  preco: number;
  categoria_id: string | null;
  imagem_url?: string | null;
};

export function useCriarProduto(restauranteId: string | undefined) {
  const fn = useServerFn(criarProdutoFn);
  const invalidate = useInvalidateCardapio(restauranteId);
  return useMutation({
    mutationFn: (payload: ProdutoPayload) =>
      fn({ data: { restauranteId: restauranteId!, payload } }),
    onSuccess: invalidate,
  });
}

export function useAtualizarProduto(restauranteId: string | undefined) {
  const fn = useServerFn(atualizarProdutoFn);
  const invalidate = useInvalidateCardapio(restauranteId);
  return useMutation({
    mutationFn: (data: { id: string; payload: ProdutoPayload }) =>
      fn({ data: { id: data.id, restauranteId: restauranteId!, payload: data.payload } }),
    onSuccess: invalidate,
  });
}

export function useExcluirProduto(restauranteId: string | undefined) {
  const fn = useServerFn(excluirProdutoFn);
  const invalidate = useInvalidateCardapio(restauranteId);
  return useMutation({
    mutationFn: (data: { id: string }) =>
      fn({ data: { id: data.id, restauranteId: restauranteId! } }),
    onSuccess: invalidate,
  });
}

export function useAlterarDisponibilidadeProduto(restauranteId: string | undefined) {
  const fn = useServerFn(alterarDisponibilidadeProdutoFn);
  const invalidate = useInvalidateCardapio(restauranteId);
  return useMutation({
    mutationFn: (data: { id: string; disponivel: boolean }) =>
      fn({ data: { id: data.id, disponivel: data.disponivel, restauranteId: restauranteId! } }),
    onSuccess: invalidate,
  });
}
