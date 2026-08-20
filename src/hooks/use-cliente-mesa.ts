import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { validarSessaoComandaFn } from "@/lib/cliente-mesa.functions";

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
 * (por exemplo, após a liberação automática de mesa ociosa), a identidade
 * é apagada e o componente consumidor deve exigir reidentificação — o cliente
 * precisa ler o QR Code da mesa novamente para continuar.
 */
export function useClienteMesa(qrToken: string) {
  const [identidade, setIdentidade] = useState<ClienteMesaIdentidade | null>(null);
  const [hidratado, setHidratado] = useState(false);
  const [conflito, setConflito] = useState<ClienteMesaConflito | null>(null);
  const [sessaoEncerrada, setSessaoEncerrada] = useState(false);
  const validar = useServerFn(validarSessaoComandaFn);

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

  useEffect(() => {
    const stored = readFromStorage(qrToken);
    setSessaoEncerrada(false);
    setConflito(null);
    setHidratado(false);
    setIdentidade(stored);
    if (!stored) {
      setHidratado(true);
      return;
    }
    let cancelado = false;
    validar({ data: { sessaoId: stored.sessaoId, comandaId: stored.comandaId } })
      .then((r) => {
        if (cancelado) return;
        if (!r.valida) {
          persistir(null);
          setSessaoEncerrada(true);
        }
      })
      .catch(() => {
        if (cancelado) return;
        persistir(null);
        setSessaoEncerrada(true);
      })
      .finally(() => {
        if (!cancelado) setHidratado(true);
      });
    return () => {
      cancelado = true;
    };
  }, [qrToken, validar, persistir]);

  const salvar = useCallback(
    (next: ClienteMesaIdentidade) => {
      setConflito(null);
      setSessaoEncerrada(false);
      persistir(next);
    },
    [persistir],
  );

  const limpar = useCallback(() => {
    setConflito(null);
    setSessaoEncerrada(false);
    persistir(null);
  }, [persistir]);

  return { identidade, hidratado, conflito, sessaoEncerrada, salvar, limpar };
}
