import { Link } from "@tanstack/react-router";
import { SocialIcon } from "@/components/social-icon";
import type { REDES_SOCIAIS } from "@/lib/social-links";

interface LandingFooterProps {
  sociais: { chave: (typeof REDES_SOCIAIS)[number]["chave"]; rotulo: string; href: string }[];
  onAbrirCookies: () => void;
}

export function LandingFooter({ sociais, onAbrirCookies }: LandingFooterProps) {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          © {new Date().getFullYear()} GooTable. Feito para restaurantes que querem servir mais rápido.
        </span>
        {sociais.length > 0 && (
          <nav className="flex items-center gap-3">
            {sociais.map((s) => (
              <a
                key={s.chave}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.rotulo}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <SocialIcon rede={s.chave} className="h-5 w-5" />
              </a>
            ))}
          </nav>
        )}
        <nav className="flex flex-wrap gap-4">
          <Link to="/termos" className="hover:text-foreground">Termos de Uso</Link>
          <Link to="/privacidade" className="hover:text-foreground">Política de Privacidade</Link>
          <Link to="/direitos" className="hover:text-foreground">Direitos do titular</Link>
          <button type="button" onClick={onAbrirCookies} className="text-left hover:text-foreground">
            Preferências de cookies
          </button>
        </nav>
      </div>
    </footer>
  );
}
