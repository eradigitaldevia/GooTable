export const TIPO_MOV_LABEL: Record<string, string> = {
  entrada: "Entrada",
  saida_venda: "Venda",
  estorno: "Estorno",
  perda: "Perda/quebra",
  ajuste: "Ajuste",
  producao: "Produção",
  inventario: "Inventário",
};

export function formatQtd(n: number, unidade?: string) {
  const v = n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  return unidade ? `${v} ${unidade}` : v;
}

export function parseNum(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
