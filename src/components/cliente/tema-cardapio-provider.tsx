import { useMemo, type CSSProperties, type ReactNode } from "react";
import { foregroundOn, isValidHex } from "@/lib/cor-utils";

/**
 * Aplica o tema visual (cores + claro/escuro) escolhido pelo restaurante
 * APENAS dentro de sua subárvore, via override de CSS variables.
 * Não modifica o tema global do admin.
 */
export interface TemaCardapioInput {
  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_acento: string | null;
  tema_cardapio: string | null; // 'claro' | 'escuro'
}

const DEFAULT_PRIMARIA = "#c2410c";
const DEFAULT_SECUNDARIA = "#1f2937";
const DEFAULT_ACENTO = "#f59e0b";

function safeHex(value: string | null | undefined, fallback: string): string {
  if (value && isValidHex(value)) return value;
  return fallback;
}

export function TemaCardapioProvider({
  restaurante,
  children,
  className,
}: {
  restaurante: TemaCardapioInput | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  const { style, escuro } = useMemo(() => {
    if (!restaurante) {
      return { style: undefined as CSSProperties | undefined, escuro: false };
    }
    const primaria = safeHex(restaurante.cor_primaria, DEFAULT_PRIMARIA);
    const secundaria = safeHex(restaurante.cor_secundaria, DEFAULT_SECUNDARIA);
    const acento = safeHex(restaurante.cor_acento, DEFAULT_ACENTO);
    const escuro = restaurante.tema_cardapio === "escuro";

    const vars: Record<string, string> = {
      "--primary": primaria,
      "--primary-foreground": foregroundOn(primaria),
      "--primary-glow": primaria,
      "--secondary": secundaria,
      "--secondary-foreground": foregroundOn(secundaria),
      "--accent": acento,
      "--accent-foreground": foregroundOn(acento),
      "--ring": primaria,
    };
    return { style: vars as CSSProperties, escuro };
  }, [restaurante]);

  return (
    <div className={[escuro ? "dark" : "", className ?? ""].join(" ").trim()} style={style}>
      <div className="bg-background text-foreground">{children}</div>
    </div>
  );
}