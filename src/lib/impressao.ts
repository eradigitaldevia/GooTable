/**
 * Helpers de impressão de comprovantes (cupom térmico 80mm).
 */

export type DadosImpressaoRestaurante = {
  nome?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  endereco?: string | null;
};

const CAMPOS: Array<{ chave: keyof DadosImpressaoRestaurante; label: string }> = [
  { chave: "nome", label: "Nome do restaurante" },
  { chave: "cnpj", label: "CNPJ" },
  { chave: "telefone", label: "Telefone" },
  { chave: "endereco", label: "Endereço" },
];

/**
 * Retorna os rótulos dos campos usados no cabeçalho do comprovante que estão
 * vazios. Lista vazia = cabeçalho completo.
 */
export function camposImpressaoFaltando(
  restaurante?: DadosImpressaoRestaurante | null,
): string[] {
  if (!restaurante) return CAMPOS.map((c) => c.label);
  return CAMPOS.filter((c) => {
    const v = restaurante[c.chave];
    return !v || String(v).trim() === "";
  }).map((c) => c.label);
}
