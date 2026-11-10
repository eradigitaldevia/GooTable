import { Link } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import gootableLogo from "@/assets/gootable-logo.png.asset.json";

export function LegalLayout({
  titulo,
  atualizadoEm,
  children,
}: {
  titulo: string;
  atualizadoEm?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={gootableLogo.url} alt="GooTable" className="h-8 w-auto" />
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/termos" className="hover:text-foreground">
              Termos
            </Link>
            <Link to="/privacidade" className="hover:text-foreground">
              Privacidade
            </Link>
            <Link to="/direitos" className="hover:text-foreground">
              Direitos
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
        {atualizadoEm && (
          <p className="mt-2 text-sm text-muted-foreground">
            Última atualização: {atualizadoEm}
          </p>
        )}
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </main>
    </div>
  );
}

export function LegalSecao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">{titulo}</h2>
      {children}
    </section>
  );
}
