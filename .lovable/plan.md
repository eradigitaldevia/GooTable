# Substituir "Ver" por "Editar" na lista de restaurantes

A ação **Ver** na lista `/superadmin/restaurantes` sai e dá lugar a **Editar**, que abre um diálogo com os dados principais do restaurante — sem sair da lista.

## O que muda

| Ação | Comportamento |
| --- | --- |
| **Editar** (nova, substitui Ver) | Abre o mesmo formulário do cadastro em modo edição: Nome, Slug, Vencimento do contrato e Notas comerciais (os campos de dono/senha ficam ocultos, pois só se aplicam na criação) |
| **Contrato** | Sem mudança — vencimento, notas, suspensão automática |
| **Suspender / Reativar** | Sem mudança — diálogo de confirmação |
| **Excluir** | Sem mudança — diálogo destrutivo |

O clique no nome do restaurante continua abrindo a tela de detalhe (abas Dados, Membros, Atividade), que segue existindo sem alterações.

Após salvar, a lista é atualizada automaticamente e aparece um aviso de sucesso.

## Detalhes técnicos

- Novo `src/components/superadmin/editar-restaurante-dialog.tsx`, no mesmo padrão de `editar-contrato-dialog.tsx`: `Dialog` do shadcn, estado local inicializado a partir da linha, `toast` de sucesso/erro.
- Usa o hook existente de atualização (`atualizarRestauranteAdmin` via `use-superadmin.ts`) — nenhuma mudança de backend, RPC ou schema.
- `src/components/superadmin/restaurante-row.tsx`: remove o botão `Ver` e o `useNavigate`, adiciona botão `Editar` chamando nova prop `onEditar`.
- `src/routes/superadmin.restaurantes.tsx`: estado `editando` + montagem do novo diálogo, seguindo o mesmo padrão já usado para o diálogo de contrato; invalida a query da lista ao salvar.
- Validação mínima no diálogo: nome e slug obrigatórios; slug em minúsculas sem espaços.
