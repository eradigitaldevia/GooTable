# Financeiro — Editar e excluir em Categorias e Fornecedores

## Problema confirmado

Na aba **Cadastros** do Financeiro:

- **Não existe edição**: nenhum botão/fluxo para renomear categoria ou alterar fornecedor.
- **Exclusão de categorias nunca aparece**: todas as categorias foram criadas como "padrão" pela semente do sistema, e a tela esconde o botão de excluir para categorias padrão — então nenhuma categoria pode ser excluída.
- Exclusão de fornecedor existe, mas exclui na hora, sem confirmação no padrão do app.
- Excluir categoria/fornecedor com lançamentos vinculados falharia com erro técnico (vínculo no banco), sem mensagem amigável.

Decisões do usuário: **todas** as categorias (inclusive as padrão) podem ser editadas e excluídas; exclusão de item em uso é **bloqueada com aviso** mostrando a quantidade de lançamentos vinculados.

## Implementação

### Backend (cálculo e validação no servidor)

`src/lib/financeiro.functions.ts`:

- `salvarCategoriaFn`: passa a aceitar `id` opcional. Com `id`, faz atualização do nome (respeitando tipo e restaurante); sem `id`, mantém o comportamento atual de criação.
- Novo `salvarFornecedorFn` atualizado: aceita `id` opcional para atualizar nome, CNPJ/CPF, telefone e e-mail.
- `excluirCadastroFn`: antes de excluir, conta os lançamentos vinculados (categoria via `categoria_id`, fornecedor via `fornecedor_id`). Se houver vínculos, retorna erro em português: "Esta categoria está em uso por X lançamentos…" (mesmo padrão do diálogo de exclusão de categoria do cardápio).

Sem mudanças no banco: as políticas de acesso já permitem atualização e exclusão para membros do restaurante.

### Hooks

`src/hooks/use-financeiro.ts`: apenas se necessário para tipagem dos novos parâmetros (os tipos derivam das funções).

### Frontend

`src/components/financeiro/aba-categorias-fornecedores.tsx`:

- Cada linha de categoria ganha botão de **editar** (lápis, padrão do app) e o botão de **excluir** passa a aparecer para todas as categorias, sem exceção de "padrao".
- Editar abre um diálogo shadcn (`Dialog`) com o campo Nome (máx. 80) e o tipo fixo; salvar chama o backend com o `id`.
- Excluir abre `AlertDialog` de confirmação (padrão do app); o bloqueio por uso vem da mensagem do backend exibida como toast.
- Arquivo segue abaixo de 150 linhas: extrair `Dialog`/`AlertDialog` para `src/components/financeiro/categoria-dialog.tsx` e `src/components/financeiro/categoria-excluir-dialog.tsx` se necessário.

`src/components/financeiro/fornecedores-card.tsx`:

- Cada fornecedor ganha botão de **editar** abrindo diálogo com os mesmos 4 campos do cadastro (Nome, CNPJ/CPF, Telefone, E-mail) pré-preenchidos.
- Excluir passa a abrir `AlertDialog` de confirmação antes de chamar o backend.

### Não é alterado

- Listas, KPIs, DRE, fluxo de caixa, lançamentos e demais abas do Financeiro.
- Nenhuma mudança visual além dos novos botões e diálogos na aba Cadastros.

## Verificação

- `tsgo --noEmit` limpo.
- No preview: renomear uma categoria padrão; excluir categoria sem lançamentos; tentar excluir categoria em uso e ver o aviso; editar e excluir fornecedores.

&nbsp;

Garanta que esse plano seja implementado corretamente e de forma cirúrgica, sem afetar outras funcionalidades da aplicação.

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.