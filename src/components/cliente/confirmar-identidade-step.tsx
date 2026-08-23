import { useState } from "react";
import { HelpCircle, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConfirmarIdentidadeStep({
  onConfirmar,
  onCancelar,
  onSeguirSemVincular,
  onChamarGarcom,
  enviando,
  falhas,
}: {
  onConfirmar: (v: { nome: string; ultimos4: string }) => void;
  onCancelar: () => void;
  onSeguirSemVincular: (nome: string) => void;
  onChamarGarcom: () => void;
  enviando: boolean;
  falhas: number;
}) {
  const [nome, setNome] = useState("");
  const [ultimos4, setUltimos4] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const mostrarAjuda = falhas >= 2;

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim().length < 2 || ultimos4.length !== 4) {
      setErro("Informe seu nome e os 4 últimos dígitos do telefone.");
      return;
    }
    setErro(null);
    onConfirmar({ nome: nome.trim(), ultimos4 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/95 backdrop-blur sm:items-center">
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t bg-card p-6 shadow-2xl sm:rounded-3xl sm:border">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Confirme sua identidade</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Para sua segurança, confirme seu nome e os 4 últimos dígitos do
            telefone para continuar.
          </p>
        </div>

        <form onSubmit={handle} className="space-y-4">
          <div>
            <Label htmlFor="confirma-nome">Nome</Label>
            <Input
              id="confirma-nome"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              required
            />
          </div>

          <div>
            <Label htmlFor="confirma-digitos">4 últimos dígitos do telefone</Label>
            <Input
              id="confirma-digitos"
              inputMode="numeric"
              maxLength={4}
              value={ultimos4}
              onChange={(e) => setUltimos4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              required
            />
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-2xl text-base font-semibold"
            disabled={enviando}
          >
            {enviando ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Confirmar
          </Button>

          {mostrarAjuda && (
            <div className="space-y-3 rounded-2xl border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">
                Não conseguiu confirmar? Você pode continuar seu pedido nesta
                mesa ou pedir ajuda a um atendente.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-full rounded-2xl"
                disabled={enviando || nome.trim().length < 2}
                onClick={() => onSeguirSemVincular(nome.trim())}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Continuar sem vincular
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-2xl"
                disabled={enviando}
                onClick={onChamarGarcom}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Chamar garçom para me identificar
              </Button>
              {nome.trim().length < 2 && (
                <p className="text-xs text-muted-foreground">
                  Informe seu nome acima para continuar sem vincular.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onCancelar}
            disabled={enviando}
            className="block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Voltar
          </button>
        </form>
      </div>
    </div>
  );
}
