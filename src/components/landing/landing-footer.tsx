import { SocialIcon } from "@/components/social-icon";
import type { LegalDoc } from "@/components/legal/legal-dialog";
import type { REDES_SOCIAIS } from "@/lib/social-links";

interface LandingFooterProps {
  sociais: { chave: (typeof REDES_SOCIAIS)[number]["chave"]; rotulo: string; href: string }[];
  onAbrirCookies: () => void;
  onAbrirLegal: (doc: LegalDoc) => void;
}

export function LandingFooter({ sociais, onAbrirCookies, onAbrirLegal }: LandingFooterProps) {
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
          <button type="button" onClick={() => onAbrirLegal("termos")} className="text-left hover:text-foreground">
            Termos de Uso
          </button>
          <button type="button" onClick={() => onAbrirLegal("privacidade")} className="text-left hover:text-foreground">
            Política de Privacidade
          </button>
          <button type="button" onClick={() => onAbrirLegal("direitos")} className="text-left hover:text-foreground">
            Direitos do titular
          </button>
          <button type="button" onClick={onAbrirCookies} className="text-left hover:text-foreground">
            Preferências de cookies
          </button>
        </nav>
      </div>
    </footer>
  );
}
