import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassWater, LogOut, Maximize2, Minimize2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

export function BarHeader({
  pendentes,
  emPreparo,
  prontosHoje,
  filtro,
  onFiltroChange,
  impressaoAuto = false,
}: {
  pendentes: number;
  emPreparo: number;
  prontosHoje: number;
  filtro: "pendentes" | "em_preparo" | "todos";
  onFiltroChange: (f: "pendentes" | "em_preparo" | "todos") => void;
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
        }),
      );
    upd();
    const id = setInterval(upd, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFs = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const filtros: { id: typeof filtro; label: string; count: number }[] = [
    { id: "pendentes", label: "Pendentes", count: pendentes },
    { id: "em_preparo", label: "Em preparo", count: emPreparo },
    { id: "todos", label: "Todos", count: pendentes + emPreparo },
  ];

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
      <div className="flex items-center gap-2">
        <GlassWater className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold tracking-tight">Display do bar</h1>
        <span className="ml-3 tabular-nums text-xs text-muted-foreground" suppressHydrationWarning>
          {hora}
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
        {filtros.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFiltroChange(f.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filtro === f.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-[10px] tabular-nums opacity-70">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="hidden sm:inline">
          <strong className="text-foreground tabular-nums">{prontosHoje}</strong> prontos hoje
        </span>
        {impressaoAuto && (
          <span className="hidden items-center gap-1 sm:flex">
            <Printer className="h-3.5 w-3.5" />
            Impressão automática
          </span>
        )}
        <Button variant="outline" size="sm" onClick={toggleFs}>
          {fs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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
        </Button>
      </div>
    </header>
  );
}