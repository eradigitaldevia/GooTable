import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { QRCodeSVG } from "qrcode.react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAlterarMesaAtiva, useExcluirMesa } from "@/hooks/use-mesas";

interface Mesa {
  id: string;
  numero: string;
  qr_token: string;
  ativa: boolean;
}

export function MesaCard({
  mesa,
  origin,
  restauranteId,
}: {
  mesa: Mesa;
  origin: string;
  restauranteId: string;
}) {
  const url = `${origin}/m/${mesa.qr_token}`;
  const alterar = useAlterarMesaAtiva(restauranteId);
  const excluir = useExcluirMesa(restauranteId);

  const toggle = useCallback(
    async (v: boolean) => {
      try {
        await alterar.mutateAsync({ id: mesa.id, ativa: v });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro");
      }
    },
    [alterar, mesa.id],
  );

  const remove = useCallback(async () => {
    if (!confirm(`Excluir mesa ${mesa.numero}?`)) return;
    try {
      await excluir.mutateAsync({ id: mesa.id });
      toast.success("Mesa excluída");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }, [excluir, mesa.id, mesa.numero]);

  return (
    <div className="break-inside-avoid rounded-2xl border border-border bg-card p-5 text-center shadow-[var(--shadow-soft)] print:border-2 print:shadow-none">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mesa</div>
      <div className="text-3xl font-extrabold tracking-tight">{mesa.numero}</div>
      <div className="mt-4 flex items-center justify-center rounded-2xl bg-white p-3">
        <QRCodeSVG value={url} size={180} level="M" />
      </div>
      <div className="mt-3 break-all text-[11px] text-muted-foreground">{url}</div>

      <div className="no-print mt-4 flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={mesa.ativa} onCheckedChange={toggle} />
          Ativa
        </label>
        <Button variant="ghost" size="icon" onClick={remove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
