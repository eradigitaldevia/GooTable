import { useEffect, useMemo, useRef, useState } from "react";
import type { ComandaPreparoProps } from "@/components/impressao/comanda-preparo";

export type PedidoImpressao = {
  pedidoId: string;
  mesaNumero?: string | number | null;
  comandaTitular?: string | null;
  garcomNome?: string | null;
  canal?: string | null;
  observacao?: string | null;
  criadoEm?: string | null;
  cancelado?: boolean;
  itens: Array<{
    id: string;
    nome: string;
    quantidade: number;
    observacao?: string | null;
  }>;
};

type Job = ComandaPreparoProps & { chave: string };

const MAX_CHAVES = 800;

function storageKey(destino: "cozinha" | "bar", restauranteId: string) {
  return `impressao-auto:${destino}:${restauranteId}`;
}

function lerChaves(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function gravarChaves(key: string, chaves: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    const arr = Array.from(chaves).slice(-MAX_CHAVES);
    window.localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

/**
 * Impressão automática de comandas de preparo nas telas de Cozinha/Bar.
 *
 * - Só imprime o que chega enquanto a tela está aberta (o que já existia no
 *   primeiro carregamento entra como "já impresso").
 * - As chaves impressas ficam no `localStorage` do dispositivo, então recarregar
 *   a página não reimprime cupons.
 * - Os cupons são enfileirados e impressos um a um via `window.print()`.
 */
export function useImpressaoAuto({
  enabled,
  destino,
  restauranteId,
  pedidos,
}: {
  enabled: boolean;
  destino: "cozinha" | "bar";
  restauranteId: string | null;
  pedidos: PedidoImpressao[];
}) {
  const [fila, setFila] = useState<Job[]>([]);
  const [atual, setAtual] = useState<Job | null>(null);
  const chavesRef = useRef<Set<string> | null>(null);
  const inicializadoRef = useRef(false);
  const skey = restauranteId ? storageKey(destino, restauranteId) : null;

  // Snapshot estável do que deve ser considerado para impressão.
  const snapshot = useMemo(() => pedidos, [pedidos]);

  useEffect(() => {
    if (!enabled || !skey) return;
    if (chavesRef.current === null) chavesRef.current = lerChaves(skey);
    const chaves = chavesRef.current;
    const primeiraCarga = !inicializadoRef.current;

    const novos: Job[] = [];

    for (const p of snapshot) {
      if (p.cancelado) {
        const chave = `cancel:${p.pedidoId}`;
        if (chaves.has(chave)) continue;
        // Só avisa cancelamento de pedido que esta tela já imprimiu.
        const jaImpresso = p.itens.some((it) =>
          chaves.has(`item:${p.pedidoId}:${it.id}:${it.quantidade}`),
        );
        chaves.add(chave);
        if (!jaImpresso || primeiraCarga) continue;
        novos.push({
          chave,
          destino,
          variante: "cancelamento",
          mesaNumero: p.mesaNumero,
          comandaTitular: p.comandaTitular,
          garcomNome: p.garcomNome,
          canal: p.canal,
          observacao: p.observacao,
          itens: p.itens.map((it) => ({
            nome: it.nome,
            quantidade: it.quantidade,
            observacao: it.observacao,
          })),
          pedidoId: p.pedidoId,
          criadoEm: p.criadoEm,
        });
        continue;
      }

      const itensNovos = p.itens.filter(
        (it) => !chaves.has(`item:${p.pedidoId}:${it.id}:${it.quantidade}`),
      );
      if (itensNovos.length === 0) continue;

      const pedidoJaImpresso = p.itens.some((it) =>
        chaves.has(`item:${p.pedidoId}:${it.id}:${it.quantidade}`),
      );

      for (const it of itensNovos) {
        chaves.add(`item:${p.pedidoId}:${it.id}:${it.quantidade}`);
      }
      if (primeiraCarga) continue;

      novos.push({
        chave: `pedido:${p.pedidoId}:${itensNovos.map((i) => i.id).join(",")}`,
        destino,
        variante: pedidoJaImpresso ? "adicional" : "novo",
        mesaNumero: p.mesaNumero,
        comandaTitular: p.comandaTitular,
        garcomNome: p.garcomNome,
        canal: p.canal,
        observacao: p.observacao,
        itens: itensNovos.map((it) => ({
          nome: it.nome,
          quantidade: it.quantidade,
          observacao: it.observacao,
        })),
        pedidoId: p.pedidoId,
        criadoEm: p.criadoEm,
      });
    }

    if (snapshot.length > 0 || primeiraCarga) inicializadoRef.current = true;
    gravarChaves(skey, chaves);
    if (novos.length > 0) setFila((f) => [...f, ...novos]);
  }, [enabled, destino, skey, snapshot]);

  // Processa a fila: um cupom por vez.
  useEffect(() => {
    if (atual || fila.length === 0) return;
    const [proximo, ...resto] = fila;
    setFila(resto);
    setAtual(proximo ?? null);
  }, [fila, atual]);

  useEffect(() => {
    if (!atual) return;
    // Aguarda o cupom montar no DOM antes de abrir a impressão.
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {
        /* ignore */
      }
      setAtual(null);
    }, 250);
    return () => clearTimeout(t);
  }, [atual]);

  return { jobAtual: atual };
}
