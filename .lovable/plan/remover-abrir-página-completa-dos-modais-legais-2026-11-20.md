# Remover "Abrir página completa" dos modais legais

## O que muda

- O rodapé do modal (Termos, Privacidade e Direitos do titular) com o link "Abrir página completa" será removido.
- O conteúdo e a rolagem interna continuam iguais.
- As páginas `/termos`, `/privacidade` e `/direitos` continuam existindo (acesso direto por URL).

## Detalhes técnicos

Arquivo único: `src/components/legal/legal-dialog.tsx`

- Remover o bloco `{atual && (<div className="border-t ..."><Link ...>Abrir página completa</Link></div>)}`.
- Remover os imports não usados `Link` e `ExternalLink`.
- Manter o campo `rota` em `DOCS` (sem alterar estrutura).

&nbsp;

&nbsp;

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.