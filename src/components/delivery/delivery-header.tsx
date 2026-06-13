import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function DeliveryHeader({
  nome,
  logoUrl,
  backTo,
  onBack,
  subtitulo,
}: {
  nome: string;
  logoUrl?: string | null;
  backTo?: { to: string; params: Record<string, string> };
  onBack?: () => void;
  subtitulo?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        {(backTo || onBack) &&
          (onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 rounded-full p-2 hover:bg-white/10"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : backTo ? (
            <Link
              to={backTo.to}
              params={backTo.params}
              className="-ml-1 rounded-full p-2 hover:bg-white/10"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : null)}
        {logoUrl && (
          <img
            src={logoUrl}
            alt={nome}
            className="h-9 w-9 rounded-full border border-white/30 object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold leading-tight">{nome}</h1>
          {subtitulo && (
            <p className="truncate text-xs opacity-80">{subtitulo}</p>
          )}
        </div>
      </div>
    </header>
  );
}