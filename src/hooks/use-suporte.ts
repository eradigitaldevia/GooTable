import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { perguntarSuporteFn } from "@/lib/suporte.functions";

export type MensagemSuporte = { role: "user" | "assistant"; content: string };

export function useSuporteChat() {
  const fn = useServerFn(perguntarSuporteFn);
  const [mensagens, setMensagens] = useState<MensagemSuporte[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (historico: MensagemSuporte[]) => fn({ data: { mensagens: historico } }),
  });

  const enviar = useCallback(
    (texto: string) => {
      const t = texto.trim();
      if (!t || mutation.isPending) return;
      const historico = [...mensagens, { role: "user" as const, content: t }];
      setMensagens(historico);
      setErro(null);
      mutation.mutate(historico, {
        onSuccess: (r) => setMensagens((m) => [...m, { role: "assistant", content: r.resposta }]),
        onError: (e) => setErro(e instanceof Error ? e.message : "Erro ao consultar o assistente."),
      });
    },
    [mensagens, mutation],
  );

  const reiniciar = useCallback(() => {
    setMensagens([]);
    setErro(null);
  }, []);

  return { mensagens, enviar, reiniciar, carregando: mutation.isPending, erro };
}
