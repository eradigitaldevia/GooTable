import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CATEGORIAS_COOKIES, type PreferenciasCookies } from "@/lib/cookies";

export function CookiePreferenciasDialog({
  open,
  onOpenChange,
  preferencias,
  onSalvar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferencias: PreferenciasCookies | null;
  onSalvar: (input: { funcionais: boolean; analise: boolean }) => void;
}) {
  const [funcionais, setFuncionais] = useState(preferencias?.funcionais ?? false);
  const [analise, setAnalise] = useState(preferencias?.analise ?? false);

  useEffect(() => {
    if (open) {
      setFuncionais(preferencias?.funcionais ?? false);
      setAnalise(preferencias?.analise ?? false);
    }
  }, [open, preferencias]);

  const valores: Record<string, boolean> = { essenciais: true, funcionais, analise };
  const setters: Record<string, (v: boolean) => void> = {
    essenciais: () => {},
    funcionais: setFuncionais,
    analise: setAnalise,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preferências de cookies</DialogTitle>
          <DialogDescription>
            Escolha quais categorias você permite. Sua escolha fica salva neste navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {CATEGORIAS_COOKIES.map((cat) => (
            <div
              key={cat.chave}
              className="flex items-start justify-between gap-4 rounded-xl border border-border p-4"
            >
              <div className="space-y-1">
                <Label htmlFor={`cookie-${cat.chave}`} className="text-sm font-semibold">
                  {cat.titulo}
                </Label>
                <p className="text-xs text-muted-foreground">{cat.descricao}</p>
              </div>
              <Switch
                id={`cookie-${cat.chave}`}
                checked={valores[cat.chave]}
                disabled={cat.obrigatoria}
                onCheckedChange={setters[cat.chave]}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onSalvar({ funcionais: false, analise: false })}
          >
            Rejeitar não essenciais
          </Button>
          <Button onClick={() => onSalvar({ funcionais, analise })}>Salvar preferências</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
