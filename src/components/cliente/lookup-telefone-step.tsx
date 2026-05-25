import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatTelefoneBR(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function LookupTelefoneStep({
  onLookup,
  onNovoCadastro,
  enviando,
}: {
  onLookup: (telefone: string) => void;
  onNovoCadastro: () => void;
  enviando: boolean;
}) {
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const digitos = telefone.replace(/\D/g, "");
    if (digitos.length < 10) {
      setErro("Informe um telefone válido com DDD.");
      return;
    }
    setErro(null);
    onLookup(digitos);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/95 backdrop-blur sm:items-center">
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t bg-card p-6 shadow-2xl sm:rounded-3xl sm:border">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold">Bem-vindo(a)!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Já é cliente? Informe seu telefone para continuar.
          </p>
        </div>

        <form onSubmit={handle} className="space-y-4">
          <div>
            <Label htmlFor="telefone-lookup">Telefone</Label>
            <Input
              id="telefone-lookup"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              autoFocus
              value={telefone}
              onChange={(e) => setTelefone(formatTelefoneBR(e.target.value))}
              placeholder="(11) 99999-9999"
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
            Continuar
          </Button>

          <button
            type="button"
            onClick={onNovoCadastro}
            disabled={enviando}
            className="block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Não estou cadastrado
          </button>
        </form>
      </div>
    </div>
  );
}
