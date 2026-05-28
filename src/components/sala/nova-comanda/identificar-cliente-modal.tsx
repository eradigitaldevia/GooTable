import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBuscarClienteRestaurantePorTelefone } from "@/hooks/use-pedidos";

function formatTelefoneBR(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function IdentificarClienteModal({
  restauranteId,
  onClose,
  onIdentificado,
}: {
  restauranteId: string;
  onClose: () => void;
  onIdentificado: (cliente: { id: string; nome: string; telefone: string }) => void;
}) {
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const buscar = useBuscarClienteRestaurantePorTelefone();

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const digitos = telefone.replace(/\D/g, "");
    if (digitos.length < 10) {
      setErro("Informe um telefone válido com DDD.");
      return;
    }
    setErro(null);
    buscar.mutate(
      { restauranteId, telefone: digitos },
      {
        onSuccess: (res) => {
          if (!res.encontrado || !res.cliente) {
            setErro("Cliente não encontrado neste restaurante.");
            return;
          }
          onIdentificado(res.cliente);
        },
        onError: (e) =>
          setErro(e instanceof Error ? e.message : "Erro ao buscar."),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/95 backdrop-blur sm:items-center">
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t bg-card p-6 shadow-2xl sm:rounded-3xl sm:border">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Identificar cliente</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Busca opcional por telefone.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handle} className="space-y-4">
          <div>
            <Label htmlFor="telefone-garcom">Telefone</Label>
            <Input
              id="telefone-garcom"
              type="tel"
              inputMode="numeric"
              autoFocus
              value={telefone}
              onChange={(e) => setTelefone(formatTelefoneBR(e.target.value))}
              placeholder="(11) 99999-9999"
            />
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-2xl text-base font-semibold"
            disabled={buscar.isPending}
          >
            {buscar.isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : null}
            Buscar
          </Button>
        </form>
      </div>
    </div>
  );
}