import { useCallback, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { registrarConsentimentoCookiesFn } from "@/lib/lgpd.functions";
import {
  lerPreferenciasCookies,
  obterVisitanteId,
  salvarPreferenciasCookies,
  type PreferenciasCookies,
} from "@/lib/cookies";

export function useCookieConsent(origem = "landing") {
  const [hidratado, setHidratado] = useState(false);
  const [preferencias, setPreferencias] = useState<PreferenciasCookies | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);

  useEffect(() => {
    setPreferencias(lerPreferenciasCookies());
    setHidratado(true);
  }, []);

  const registrar = useServerFn(registrarConsentimentoCookiesFn);
  const mutation = useMutation({
    mutationFn: (input: { funcionais: boolean; analise: boolean }) =>
      registrar({
        data: {
          visitanteId: obterVisitanteId(),
          funcionais: input.funcionais,
          analise: input.analise,
          origem,
        },
      }),
  });

  const decidir = useCallback(
    (input: { funcionais: boolean; analise: boolean }) => {
      setPreferencias(salvarPreferenciasCookies(input));
      setDialogAberto(false);
      mutation.mutate(input);
    },
    [mutation],
  );

  return {
    /** true quando o banner deve ser exibido (sem decisão registrada nesta versão). */
    mostrarBanner: hidratado && preferencias === null,
    preferencias,
    dialogAberto,
    abrirPreferencias: () => setDialogAberto(true),
    fecharPreferencias: () => setDialogAberto(false),
    aceitarTodos: () => decidir({ funcionais: true, analise: true }),
    rejeitarNaoEssenciais: () => decidir({ funcionais: false, analise: false }),
    salvarPreferencias: decidir,
  };
}
