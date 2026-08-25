import { useCallback } from "react";
import { toast } from "sonner";
import {
  camposImpressaoFaltando,
  type DadosImpressaoRestaurante,
} from "@/lib/impressao";

/** Chaves já impressas nesta sessão de navegação (para marcar 2ª via). */
const impressos = new Set<string>();

/**
 * Registra uma impressão e informa se aquela conta já havia sido impressa
 * antes nesta sessão (ou seja, se o cupom deve sair como "2ª VIA").
 */
export function registrarImpressao(chave: string): boolean {
  const jaImpresso = impressos.has(chave);
  impressos.add(chave);
  return jaImpresso;
}

/**
 * Dispara o diálogo de impressão do navegador.
 * O layout impresso é controlado pelas regras `@media print` em `src/styles.css`.
 *
 * Quando `restaurante` é informado, avisa o operador se faltam dados no
 * cabeçalho do comprovante (nome, CNPJ, telefone ou endereço).
 */
export function useImprimir(restaurante?: DadosImpressaoRestaurante | null) {
  return useCallback(() => {
    if (typeof window === "undefined") return;
    if (restaurante !== undefined) {
      const faltando = camposImpressaoFaltando(restaurante);
      if (faltando.length > 0) {
        toast.warning(
          `Comprovante sem ${faltando.join(", ")}. Preencha em Configurações → Geral.`,
        );
      }
    }
    window.print();
  }, [restaurante]);
}
