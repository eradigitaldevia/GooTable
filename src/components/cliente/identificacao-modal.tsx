import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export interface IdentificacaoValores {
  nome: string;
  telefone: string;
}

function formatTelefoneBR(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function IdentificacaoModal({
  onSubmit,
  enviando,
}: {
  onSubmit: (v: IdentificacaoValores) => void;
  enviando: boolean;
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aceite, setAceite] = useState(false);

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeTrim = nome.trim();
    const digitos = telefone.replace(/\D/g, "");
    if (nomeTrim.length < 2) {
      setErro("Informe seu nome completo.");
      return;
    }
    if (digitos.length < 10) {
      setErro("Informe um telefone válido com DDD.");
      return;
    }
    if (!aceite) {
      setErro("É necessário aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }
    setErro(null);
    onSubmit({ nome: nomeTrim, telefone: digitos });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/95 backdrop-blur sm:items-center">
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t bg-card p-6 shadow-2xl sm:rounded-3xl sm:border">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold">Bem-vindo(a)!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Para começar, identifique-se. Assim você acompanha seu pedido e ganha cashback.
          </p>
        </div>

        <form onSubmit={handle} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              autoComplete="name"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={80}
              placeholder="Seu nome"
              required
            />
          </div>

          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={telefone}
              onChange={(e) => setTelefone(formatTelefoneBR(e.target.value))}
              placeholder="(11) 99999-9999"
              required
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="aceite-lgpd"
              checked={aceite}
              onCheckedChange={(v) => setAceite(v === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="aceite-lgpd"
              className="text-xs font-normal leading-snug text-muted-foreground"
            >
              Li e aceito os{" "}
              <Link to="/termos" target="_blank" className="font-medium text-primary underline">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link to="/privacidade" target="_blank" className="font-medium text-primary underline">
                Política de Privacidade
              </Link>
              .
            </Label>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-2xl text-base font-semibold"
            disabled={enviando || !aceite}
          >
            {enviando ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Continuar
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Ao continuar, você concorda em receber atualizações do seu pedido.
          </p>
        </form>
      </div>
    </div>
  );
}
