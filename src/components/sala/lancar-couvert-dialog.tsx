import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLancarCouvert } from "@/hooks/use-couvert";
import { useApresentacaoAtiva } from "@/hooks/use-couvert-artistico";
import { formatBRL } from "@/lib/cart";

export interface CouvertConfig {
  couvert_mesa_habilitado: boolean;
  couvert_mesa_valor: number | null;
  couvert_artistico_habilitado: boolean;
  couvert_artistico_valor: number | null;
}

export function LancarCouvertDialog({
  open,
  onOpenChange,
  restauranteId,
  comandaId,
  comandaLabel,
  config,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  restauranteId: string;
  comandaId: string;
  comandaLabel: string;
  config: CouvertConfig;
}) {
  const podeMesa = config.couvert_mesa_habilitado;
  const podeArt = config.couvert_artistico_habilitado;
  const tipoInicial: "mesa" | "artistico" = podeMesa ? "mesa" : "artistico";
  const [tipo, setTipo] = useState<"mesa" | "artistico">(tipoInicial);
  const [quantidade, setQuantidade] = useState("1");
  const [valor, setValor] = useState("");
  const lancar = useLancarCouvert();
  const { data: apresentacaoAtiva } = useApresentacaoAtiva(restauranteId);

  useEffect(() => {
    if (!open) return;
    setTipo(tipoInicial);
    setQuantidade("1");
    setValor("");
  }, [open, tipoInicial]);

  const valorPadrao =
    tipo === "mesa"
      ? Number(config.couvert_mesa_valor ?? 0)
      : Number(config.couvert_artistico_valor ?? 0);

  const valorEfetivo = (() => {
    const t = valor.trim();
    if (t === "") return valorPadrao;
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  })();

  const qtdEfetiva = Math.max(1, Math.floor(Number(quantidade) || 1));
  const totalPrevisto = qtdEfetiva * valorEfetivo;

  async function submit() {
    if (valorEfetivo <= 0) {
      toast.error("Valor do couvert inválido.");
      return;
    }
    try {
      await lancar.mutateAsync({
        restauranteId,
        comandaId,
        tipo,
        quantidade: qtdEfetiva,
        valorUnitario: valor.trim() === "" ? undefined : valorEfetivo,
      });
      toast.success("Couvert lançado");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao lançar couvert");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Lançar couvert</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            Comanda: <span className="font-medium text-foreground">{comandaLabel}</span>
            <p className="mt-1">
              Lance apenas quando o cliente consumir (mesa) ou estiver na área com
              acesso à apresentação (artístico).
            </p>
          </div>

          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as "mesa" | "artistico")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {podeMesa && <SelectItem value="mesa">Couvert de mesa</SelectItem>}
                {podeArt && <SelectItem value="artistico">Couvert artístico</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{tipo === "artistico" ? "Pessoas" : "Porções"}</Label>
              <Input
                type="number"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Valor unitário (R$)</Label>
              <Input
                inputMode="decimal"
                placeholder={valorPadrao ? valorPadrao.toFixed(2) : "0,00"}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total a cobrar</span>
            <span className="font-semibold">{formatBRL(totalPrevisto)}</span>
          </div>
          {tipo === "artistico" && !apresentacaoAtiva && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700">
              Nenhuma apresentação ativa — o couvert será cobrado, mas não
              gerará repasse para artistas.
            </div>
          )}
          {tipo === "artistico" && apresentacaoAtiva && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs text-emerald-700">
              Vinculado à apresentação:{" "}
              <strong>{apresentacaoAtiva.nome}</strong>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={lancar.isPending}>
            {lancar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lançar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
