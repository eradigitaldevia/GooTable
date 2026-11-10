import { useEffect, useRef, useState } from "react";
import { LifeBuoy, RotateCcw, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSuporteChat } from "@/hooks/use-suporte";
import { SuporteMensagem } from "./suporte-mensagem";

const SUGESTOES = [
  "Como ativo o módulo de estoque?",
  "Como configuro o horário de funcionamento do delivery?",
  "Como lanço uma conta a pagar no Financeiro?",
  "Como imprimo a conta de uma mesa?",
];

export function SuporteChat() {
  const { mensagens, enviar, reiniciar, carregando, erro } = useSuporteChat();
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!carregando) inputRef.current?.focus();
  }, [mensagens, carregando]);

  const submit = (t: string) => {
    enviar(t);
    setTexto("");
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-primary" />
          <span className="font-semibold">Assistente GooTable</span>
        </div>
        <Button variant="ghost" size="sm" onClick={reiniciar} disabled={!mensagens.length}>
          <RotateCcw className="mr-1 h-4 w-4" /> Nova conversa
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {mensagens.length === 0 && (
          <div className="mx-auto max-w-lg space-y-3 pt-8 text-center">
            <p className="text-muted-foreground">
              Tire suas dúvidas sobre como usar o GooTable. Experimente:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGESTOES.map((s) => (
                <Button key={s} variant="outline" className="h-auto whitespace-normal py-2 text-left" onClick={() => submit(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
        {mensagens.map((m, i) => (
          <SuporteMensagem key={i} mensagem={m} />
        ))}
        {carregando && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Pensando...
          </div>
        )}
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <div ref={fimRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit(texto);
        }}
      >
        <Textarea
          ref={inputRef}
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(texto);
            }
          }}
          placeholder="Digite sua dúvida..."
          rows={2}
          maxLength={4000}
          className="resize-none"
        />
        <Button type="submit" size="icon" disabled={carregando || !texto.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
