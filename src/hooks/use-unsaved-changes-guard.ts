import { useBlocker } from "@tanstack/react-router";

/**
 * Bloqueia navegação para fora da página atual quando há alterações não salvas.
 *
 * - Não bloqueia mudanças que mantêm o mesmo `pathname` (ex.: troca de aba via
 *   `search` params).
 * - Cobre fechar aba / recarregar via `enableBeforeUnload` nativo.
 * - `withResolver: true` deixa a UI controlar o dialog de confirmação.
 */
export function useUnsavedChangesGuard({ isDirty }: { isDirty: boolean }) {
  return useBlocker({
    withResolver: true,
    enableBeforeUnload: () => isDirty,
    shouldBlockFn: ({ next, current }) => {
      if (!isDirty) return false;
      return next.pathname !== current.pathname;
    },
  });
}