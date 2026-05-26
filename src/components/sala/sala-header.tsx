import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function SalaHeader({
  nome,
  mesas,
  chamadosPendentes,
  onIrChamados,
}: {
  nome: string;
  mesas: { id: string; numero: string }[];
  chamadosPendentes: number;
  onIrChamados: () => void;
}) {
  const inicial = (nome.trim()[0] ?? "?").toUpperCase();
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const hora = agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
          {inicial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{nome}</div>
          <div className="truncate text-xs text-muted-foreground">
            {mesas.length === 0
              ? "Nenhuma mesa atribuída"
              : `Mesas ${mesas.map((m) => m.numero).join(", ")}`}
          </div>
        </div>
        <span className="hidden text-sm tabular-nums text-muted-foreground sm:inline">
          {hora}
        </span>
        <Button
          size="sm"
          variant={chamadosPendentes > 0 ? "default" : "outline"}
          className="relative"
          onClick={onIrChamados}
          aria-label="Ver chamados"
        >
          <Bell className="h-4 w-4" />
          {chamadosPendentes > 0 && (
            <span className="ml-1 rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
              {chamadosPendentes}
            </span>
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Sair"
          onClick={() => {
            void supabase.auth.signOut().then(() => {
              window.location.assign("/login");
            });
          }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}