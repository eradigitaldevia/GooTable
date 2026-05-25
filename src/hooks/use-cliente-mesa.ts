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
 * Retorna `identidade=null` enquanto não identificado.
 * Após hidratar, valida sessão/comanda no backend; se inválidas, expõe
 * `precisaRehidratarSessao=true` mantendo os dados do cliente.
 */
export function useClienteMesa(qrToken: string) {
  const [identidade, setIdentidade] = useState<ClienteMesaIdentidade | null>(null);
  const [hidratado, setHidratado] = useState(false);
  const [precisaRehidratarSessao, setPrecisaRehidratarSessao] = useState(false);
  const validar = useServerFn(validarSessaoComandaFn);

  useEffect(() => {
    const stored = readFromStorage(qrToken);
    setIdentidade(stored);
    setPrecisaRehidratarSessao(false);
    if (!stored) {
      setHidratado(true);
      return;
    }
    let cancelado = false;
    validar({ data: { sessaoId: stored.sessaoId, comandaId: stored.comandaId } })
      .then((r) => {
        if (cancelado) return;
        if (!r.valida) setPrecisaRehidratarSessao(true);
        setHidratado(true);
      })
      .catch(() => {
        if (cancelado) return;
        setPrecisaRehidratarSessao(true);
        setHidratado(true);
      });
    return () => {
      cancelado = true;
    };
  }, [qrToken, validar]);

  const salvar = useCallback(
    (next: ClienteMesaIdentidade) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(key(qrToken), JSON.stringify(next));
      }
      setIdentidade(next);
      setPrecisaRehidratarSessao(false);
    },
    [qrToken],
  );

  const limpar = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key(qrToken));
    }
    setIdentidade(null);
    setPrecisaRehidratarSessao(false);
  }, [qrToken]);

  return { identidade, hidratado, precisaRehidratarSessao, salvar, limpar };
}
