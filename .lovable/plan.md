## Objetivo

Avisar o usuário antes de sair da página `/admin/configuracoes` quando houver alterações não salvas em qualquer aba, com um dialog simples de 2 ações.

## Comportamento

- **Dispara apenas ao sair da página `/admin/configuracoes`** (ex.: clicar em outro item da sidebar, voltar do navegador, fechar a aba).
- **Não dispara** ao trocar entre abas internas (Identidade ↔ Pagamentos ↔ Taxas etc.) — o pontinho na aba já indica o estado.
- **Não dispara** se nenhuma aba estiver suja.

## Dialog (AlertDialog do shadcn)

Título: **Você tem alterações não salvas**

Texto:
> As alterações realizadas só serão efetivadas após você clicar em **Salvar** dentro de cada aba destacada com um ponto (•).

Ações:
- **Voltar e salvar** (primary) — fecha o dialog, mantém o usuário na página.
- **Sair sem salvar** (destructive/ghost) — descarta alterações (reset do form para o snapshot) e prossegue com a navegação.
- ESC / clique fora = equivalente a "Voltar e salvar" (cancela navegação).

## Arquivos afetados

### Novo: `src/hooks/use-unsaved-changes-guard.ts`
Hook genérico que recebe `{ isDirty: boolean, currentPathname: string }` e:
- Usa `useBlocker({ withResolver: true, shouldBlockFn: ({ next, current }) => isDirty && next.pathname !== current.pathname })` do TanStack Router — assim navegação que mantém o mesmo `pathname` (troca de aba interna via `search`) não é bloqueada.
- Registra/remove listener `beforeunload` para cobrir fechar aba / recarregar / fechar navegador.
- Retorna `{ status, proceed, reset }` para a UI controlar o dialog.

### Novo: `src/components/configuracoes/unsaved-changes-dialog.tsx`
Componente `AlertDialog` controlado por `open`/`onCancel`/`onConfirm`. Texto e botões conforme acima. Componente pequeno, focado apenas em renderização.

### Edit: `src/routes/_authenticated/admin/configuracoes.tsx`
- Calcular `isDirty = Object.values(abasSujas).some(Boolean)`.
- Chamar `useUnsavedChangesGuard({ isDirty, currentPathname: "/admin/configuracoes" })`.
- Quando `status === "blocked"`, renderizar `<UnsavedChangesDialog>`:
  - **Voltar e salvar** → `reset()` (fecha dialog, permanece na página).
  - **Sair sem salvar** → resetar `form` para `snapshot`, atualizar `prevSnapshotRef.current` para evitar re-mesclagem, e chamar `proceed()`.

## Detalhes técnicos

- `useBlocker` com `withResolver: true` não dispara o confirm nativo; a UI é 100% controlada pelo `AlertDialog`.
- `beforeunload` é nativo do browser; mostra o alerta padrão ao fechar aba/recarregar (só funciona após interação real do usuário, regra do browser).
- A comparação `next.pathname !== current.pathname` garante que mudanças apenas em `search` (que é como as abas internas funcionam via `navigate({ search: { tab } })`) não disparem o bloqueio.
- "Sair sem salvar" não chama nenhuma mutation/backend — apenas reseta o estado local do form.

## Fora de escopo

- Outras páginas com formulários (somente `/admin/configuracoes`).
- Auto-save.
- Refatoração de `abasSujas`, `snapshot`, ou da lógica de `salvar(aba)` existente.
- Mudanças no visual do pontinho ou nas abas.
- Mudanças em backend, mutations ou validações.

## Riscos

- `beforeunload` exibe texto genérico do browser (não dá pra customizar) — comportamento esperado e padrão da web.
- Se o usuário tiver alterações em mais de uma aba e escolher "Sair sem salvar", todas serão descartadas — coerente com a ação escolhida.
