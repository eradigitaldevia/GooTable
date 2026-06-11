export interface PaletaPreset {
  id: string;
  nome: string;
  descricao: string;
  tema: "claro" | "escuro";
  cor_primaria: string;
  cor_secundaria: string;
  cor_acento: string;
}

export const PALETAS_PRESETS: PaletaPreset[] = [
  {
    id: "classica",
    nome: "Clássica",
    descricao: "Terracota apetitoso, fundo claro",
    tema: "claro",
    cor_primaria: "#c2410c",
    cor_secundaria: "#1f2937",
    cor_acento: "#f59e0b",
  },
  {
    id: "sunset",
    nome: "Sunset",
    descricao: "Laranja e magenta, vibrante",
    tema: "claro",
    cor_primaria: "#ea580c",
    cor_secundaria: "#7c2d12",
    cor_acento: "#ec4899",
  },
  {
    id: "ocean",
    nome: "Ocean",
    descricao: "Azul profundo e turquesa",
    tema: "claro",
    cor_primaria: "#0e7490",
    cor_secundaria: "#0c4a6e",
    cor_acento: "#06b6d4",
  },
  {
    id: "forest",
    nome: "Forest",
    descricao: "Verde mata e mostarda",
    tema: "claro",
    cor_primaria: "#15803d",
    cor_secundaria: "#14532d",
    cor_acento: "#ca8a04",
  },
  {
    id: "wine",
    nome: "Wine",
    descricao: "Bordô elegante, fundo escuro",
    tema: "escuro",
    cor_primaria: "#9f1239",
    cor_secundaria: "#fcd34d",
    cor_acento: "#fb7185",
  },
  {
    id: "midnight",
    nome: "Midnight",
    descricao: "Roxo e dourado em fundo escuro",
    tema: "escuro",
    cor_primaria: "#7c3aed",
    cor_secundaria: "#f59e0b",
    cor_acento: "#a78bfa",
  },
  {
    id: "mono",
    nome: "Monocromática",
    descricao: "Preto, branco e cinza",
    tema: "claro",
    cor_primaria: "#0a0a0a",
    cor_secundaria: "#404040",
    cor_acento: "#737373",
  },
  {
    id: "noite-mono",
    nome: "Mono Noturna",
    descricao: "Branco sobre preto, minimalista",
    tema: "escuro",
    cor_primaria: "#fafafa",
    cor_secundaria: "#a3a3a3",
    cor_acento: "#fbbf24",
  },
];