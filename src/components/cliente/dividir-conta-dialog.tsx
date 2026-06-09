import { useState } from "react";
import { Split, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/cart";

interface PorCliente {
  cliente_id: string;
  cliente_nome: string;
  subtotal: number;
}

/**
 * Diálogo somente visual para ajudar os clientes a combinarem entre si
 * quanto cada um deve pagar. NÃO altera a separação de comandas nem
 * persiste nada — puro cálculo sobre os dados já carregados.
 */
export function DividirContaDialog({
  total,
  porCliente,
}: {
  total: number;
  porCliente: PorCliente[];
}) {
  const [modo, setModo] = useState<"igual" | "pessoa">("igual");
  const [n, setN] = useState(Math.max(porCliente.length || 2, 2));

  const safeN = Math.max(1, Math.floor(n) || 1);
  const porPessoa = total / safeN;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full h-11 rounded-xl">
          <Split className="mr-2 h-4 w-4" />
          Dividir conta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dividir conta</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Apenas um cálculo para vocês combinarem o pagamento entre si. A cobrança do
          restaurante segue exatamente como está nas comandas.
        </p>

        <div className="inline-flex rounded-full bg-muted p-1">
          <button
            onClick={() => setModo("igual")}
            className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              modo === "igual" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Igualmente
          </button>
          <button
            onClick={() => setModo("pessoa")}
            className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              modo === "pessoa" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5" /> Por pessoa
          </button>
        </div>

        {modo === "igual" ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="num">Entre quantas pessoas?</Label>
              <Input
                id="num"
                type="number"
                min={1}
                value={n}
                onChange={(e) => setN(Number(e.target.value))}
                className="h-11 mt-1"
              />
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <div className="text-xs text-muted-foreground">Cada pessoa paga</div>
              <div className="mt-1 text-3xl font-bold text-primary">{formatBRL(porPessoa)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Total: {formatBRL(total)}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {porCliente.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem agrupamento por pessoa ainda.
              </p>
            ) : (
              porCliente.map((g) => (
                <div
                  key={g.cliente_id}
                  className="flex items-center justify-between rounded-xl border p-3"
                >
                  <span className="font-medium">{g.cliente_nome}</span>
                  <span className="font-bold text-primary">{formatBRL(g.subtotal)}</span>
                </div>
              ))
            )}
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Total da comanda</span>
              <span className="font-bold">{formatBRL(total)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}