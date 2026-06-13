import { useCallback } from "react";

/**
 * Dispara o diálogo de impressão do navegador.
 * O layout impresso é controlado pelas regras `@media print` em `src/styles.css`,
 * que escondem todo o conteúdo exceto elementos com a classe `.print-only`.
 */
export function useImprimir() {
  return useCallback(() => {
    if (typeof window === "undefined") return;
    window.print();
  }, []);
}