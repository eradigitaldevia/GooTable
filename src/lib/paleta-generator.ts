import type { PaletaPreset } from "@/components/configuracoes/identidade/paleta-presets";

type HSL = { h: number; s: number; l: number };

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToHsl(hex: string): HSL | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let h = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: HSL): string {
  const sN = Math.max(0, Math.min(100, s)) / 100;
  const lN = Math.max(0, Math.min(100, l)) / 100;
  const hN = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((hN / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hN < 60) [r, g, b] = [c, x, 0];
  else if (hN < 120) [r, g, b] = [x, c, 0];
  else if (hN < 180) [r, g, b] = [0, c, x];
  else if (hN < 240) [r, g, b] = [0, x, c];
  else if (hN < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

type Tema = "claro" | "escuro";

type Esquema = {
  id: "analoga" | "complementar" | "triadica" | "monocromatica";
  nome: string;
  deltaSec: number;
  deltaAce: number;
};

const ESQUEMAS: Esquema[] = [
  { id: "analoga", nome: "Análoga", deltaSec: 30, deltaAce: -30 },
  { id: "complementar", nome: "Complementar", deltaSec: 180, deltaAce: 30 },
  { id: "triadica", nome: "Triádica", deltaSec: 120, deltaAce: 240 },
  { id: "monocromatica", nome: "Monocromática", deltaSec: 0, deltaAce: 0 },
];

function ajustarParaTema(
  base: HSL,
  tema: Tema,
  papel: "secundaria" | "acento",
  esquema: Esquema["id"],
): HSL {
  // Saturação alvo: evita cinzas lavados e neon estridente.
  const s = Math.max(35, Math.min(80, base.s));

  // Luminosidade alvo: clara para fundo escuro, escura para fundo claro.
  // Acento puxa para o tom oposto ao da secundária para criar hierarquia.
  let l: number;
  if (tema === "escuro") {
    l = papel === "secundaria" ? 75 : 65;
  } else {
    l = papel === "secundaria" ? 30 : 50;
  }

  // Monocromática: varia mais a L para diferenciar das outras matizes iguais.
  if (esquema === "monocromatica") {
    if (tema === "escuro") l = papel === "secundaria" ? 85 : 55;
    else l = papel === "secundaria" ? 25 : 60;
  }

  return { h: base.h, s, l };
}

export function gerarPaletas(corPrimaria: string): PaletaPreset[] {
  const hsl = hexToHsl(corPrimaria);
  if (!hsl) return [];
  const out: PaletaPreset[] = [];

  for (const esq of ESQUEMAS) {
    for (const tema of ["claro", "escuro"] as Tema[]) {
      const sec = ajustarParaTema(
        { h: hsl.h + esq.deltaSec, s: hsl.s, l: hsl.l },
        tema,
        "secundaria",
        esq.id,
      );
      const ace = ajustarParaTema(
        { h: hsl.h + esq.deltaAce, s: hsl.s, l: hsl.l },
        tema,
        "acento",
        esq.id,
      );
      out.push({
        id: `gen-${esq.id}-${tema}`,
        nome: esq.nome,
        descricao: tema === "claro" ? "Tema claro" : "Tema escuro",
        tema,
        cor_primaria: corPrimaria.toLowerCase(),
        cor_secundaria: hslToHex(sec),
        cor_acento: hslToHex(ace),
      });
    }
  }

  return out;
}