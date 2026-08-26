import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChefHat, LogOut, Maximize2, Minimize2, Printer, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

export function KdsHeader({
  ativos,
  somLigado,
  onToggleSom,
  impressaoAuto = false,
}: {
  ativos: number;
  somLigado: boolean;
  onToggleSom: () => void;
  impressaoAuto?: boolean;
}) {
  const [hora, setHora] = useState("");
  const [fs, setFs] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const upd = () =>
      setHora(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    upd();
    const id = setInterval(upd, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="flex items-center justify-between gap-4 border-b bg-card px-6 py-3">
      <div className="flex items-center gap-2">
        <ChefHat className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold tracking-tight">Display de cozinha</h1>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="tabular-nums text-muted-foreground" suppressHydrationWarning>
          {hora}
        </span>
        <span className="font-semibold">
          {ativos} {ativos === 1 ? "pedido ativo" : "pedidos ativos"}
        </span>
        <Button variant="outline" size="sm" onClick={onToggleSom}>
          {somLigado ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">
            {somLigado ? "Som ligado" : "Som desligado"}
          </span>
        </Button>
        <Button variant="outline" size="sm" onClick={toggleFullscreen}>
          {fs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">{fs ? "Sair" : "Tela cheia"}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await supabase.auth.signOut();
            await navigate({ to: "/login" });
          }}
        >
          <LogOut className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}