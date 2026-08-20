import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  buscarClientePorTelefoneFn,
  validarSessaoComandaFn,
} from "@/lib/cliente-mesa.functions";

export interface ClienteMesaIdentidade {
  clienteId: string;
  nome: string;
  telefone: string;
  sessaoId: string;
  comandaId: string;
}

export interface ClienteMesaConflito {
  clienteId: string;
  nome: string;
  telefone: string;
  sessaoOrigemId: string;
  comandaOrigemId: string;
  numeroMesaAtual: string;
  podeTransferir: boolean;
}

const key = (qrToken: string) => `mesa-cliente:${qrToken}`;

function readFromStorage(qrToken: string): ClienteMesaIdentidade | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(qrToken));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClienteMesaIdentidade>;
    if (
      parsed &&
      typeof parsed.clienteId === "string" &&
      typeof parsed.nome === "string" &&
      typeof parsed.telefone === "string" &&
      typeof parsed.sessaoId === "string" &&
      typeof parsed.comandaId === "string"
    ) {
      return parsed as ClienteMesaIdentidade;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Mantém a identidade do cliente persistida em localStorage por qrToken.
 *
 * Ao hidratar, valida sessão/comanda no backend. Se estiverem fechadas
 * (por exemplo, após a liberação automática de mesa ociosa), tenta recuperar
 * automaticamente pelo telefone salvo, abrindo nova sessão/comanda. A
 * recuperação vale para qualquer tela do cliente que use este hook.
 */
export function useClienteMesa(qrToken: string) {
  const [identidade, setIdentidade] = useState<ClienteMesaIdentidade | null>(null);
  const [hidratado, setHidratado] = useState(false);
  const [conflito, setConflito] = useState<ClienteMesaConflito | null>(null);
  const validar = useServerFn(validarSessaoComandaFn);
  const buscarPorTelefone = useServerFn(buscarClientePorTelefoneFn);
  const buscarRef = useRef(buscarPorTelefone);
  buscarRef.current = buscarPorTelefone;

  const persistir = useCallback(
    (next: ClienteMesaIdentidade | null) => {
      if (typeof window !== "undefined") {
        if (next) localStorage.setItem(key(qrToken), JSON.stringify(next));
        else localStorage.removeItem(key(qrToken));
      }
      setIdentidade(next);
    },
    [qrToken],
  );

  /**
   * Reabre sessão/comanda para o telefone informado e regrava a identidade.
   * Retorna a nova identidade, ou null quando não foi possível recuperar.
   */
  const recuperarSessao = useCallback(
    async (base: ClienteMesaIdentidade): Promise<ClienteMesaIdentidade | null> => {
      try {
        const r = await buscarRef.current({
          data: { qrToken, telefone: base.telefone },
        });
        if (r.encontrado && !r.conflito) {
          const next: ClienteMesaIdentidade = {
            clienteId: r.cliente.id,
            nome: r.cliente.nome,
            telefone: r.cliente.telefone,
            sessaoId: r.sessaoId,
            comandaId: r.comandaId,
          };
          setConflito(null);
          persistir(next);
          return next;
        }
        if (r.encontrado && r.conflito) {
          setConflito({
            clienteId: r.cliente.id,
            nome: r.cliente.nome,
            telefone: r.cliente.telefone,
            sessaoOrigemId: r.conflito.sessaoId,
            comandaOrigemId: r.conflito.comandaId,
            numeroMesaAtual: r.conflito.numeroMesa,
            podeTransferir: r.conflito.podeTransferir,
          });
        }
        persistir(null);
        return null;
      } catch {
        persistir(null);
        return null;
      }
    },
    [qrToken, persistir],
  );

  useEffect(() => {
    const stored = readFromStorage(qrToken);
    setIdentidade(stored);
    setConflito(null);
    setHidratado(false);
    if (!stored) {
      setHidratado(true);
      return;
    }
    let cancelado = false;
    validar({ data: { sessaoId: stored.sessaoId, comandaId: stored.comandaId } })
      .then(async (r) => {
        if (cancelado) return;
        if (!r.valida) await recuperarSessao(stored);
      })
      .catch(async () => {
        if (cancelado) return;
        await recuperarSessao(stored);
      })
      .finally(() => {
        if (!cancelado) setHidratado(true);
      });
    return () => {
      cancelado = true;
    };
  }, [qrToken, validar, recuperarSessao]);

  const salvar = useCallback(
    (next: ClienteMesaIdentidade) => {
      setConflito(null);
      persistir(next);
    },
    [persistir],
  );

  const limpar = useCallback(() => {
    setConflito(null);
    persistir(null);
  }, [persistir]);

  return { identidade, hidratado, conflito, salvar, limpar, recuperarSessao };
}
