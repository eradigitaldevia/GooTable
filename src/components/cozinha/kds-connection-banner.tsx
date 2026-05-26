import { AlertTriangle, Loader2, RefreshCw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RealtimeStatus } from "@/hooks/use-realtime-status";

interface Props {
  status: RealtimeStatus;
  onReconnect: () => void;
  onReload: () => void;
}

export function KdsConnectionBanner({ status, onReconnect, onReload }: Props) {
  if (status === "connected" || status === "connecting") return null;

  if (status === "degraded") {
    return (
      <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-sm font-medium text-amber-700 dark:text-amber-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reconectando ao tempo real…
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-6 py-2 text-sm font-medium text-destructive">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Conexão em tempo real perdida. Novos pedidos podem demorar a aparecer.
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onReconnect}>
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="ml-2">Tentar novamente</span>
        </Button>
        <Button variant="destructive" size="sm" onClick={onReload}>
          <RotateCw className="h-3.5 w-3.5" />
          <span className="ml-2">Recarregar página</span>
        </Button>
      </div>
    </div>
  );
}