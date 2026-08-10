import { memo, useCallback, lazy, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
const QRCodeSVG = lazy(() =>
  import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })),
);
import { Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAlterarMesaAtiva, useExcluirMesa } from "@/hooks/use-mesas";
import { GarcomBadge } from "@/components/garcons/garcom-badge";

interface Mesa {
  id: string;
  numero: string;
  qr_token: string;
  ativa: boolean;
  sessao_aberta?: boolean;
}

function MesaCardComponent({
  mesa,
  origin,
  restauranteId,
  garcomNome,
  baseUrl,
}: {
  mesa: Mesa;
  origin: string;
  restauranteId: string;
  garcomNome?: string | null;
  baseUrl?: string | null;
}) {
  const base = (baseUrl?.trim() || origin).replace(/\/+$/, "");
  const url = `${base}/m/${mesa.qr_token}`;
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

  const emAtendimento = mesa.sessao_aberta === true;

  return (
    <div
      className={`break-inside-avoid rounded-2xl border bg-card p-5 text-center shadow-[var(--shadow-soft)] print:border-2 print:shadow-none print:ring-0 ${
        emAtendimento
          ? "border-emerald-500/60 ring-1 ring-emerald-500/30"
          : "border-border"
      }`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mesa</div>
      <div className="text-3xl font-extrabold tracking-tight">{mesa.numero}</div>
      {emAtendimento && (
        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Em atendimento
        </div>
      )}
      {garcomNome && (
        <div className="mt-2 flex justify-center">
          <GarcomBadge nome={garcomNome} />
        </div>
      )}
      <div className="mt-4 flex items-center justify-center rounded-2xl bg-white p-3">
        <Suspense fallback={<div style={{ width: 180, height: 180 }} />}>
          <QRCodeSVG value={url} size={180} level="M" />
        </Suspense>
      </div>
      <div className="mt-3 break-all text-[11px] text-muted-foreground">{url}</div>

      <div className="no-print mt-4 flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={mesa.ativa} onCheckedChange={toggle} />
          Ativa
        </label>
        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/mesas/$mesaId" params={{ mesaId: mesa.id }}>
              <Eye className="mr-1 h-3.5 w-3.5" /> Ver mesa
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={remove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export const MesaCard = memo(MesaCardComponent);
