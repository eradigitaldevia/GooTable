# Incluir dados do dono no diálogo Editar restaurante

O diálogo de edição da lista `/superadmin/restaurantes` passa a ter também os campos do dono: **Nome do dono**, **Email do dono** e **Senha**, como no cadastro.

## O que muda

- **Nome do dono** — preenchido com o nome atual; editável.
- **Email do dono** — preenchido com o email atual; editável. Se já existir outro usuário com o email informado, mostra erro claro.
- **Senha** — em branco na edição; só é alterada se o superadmin digitar uma nova (mínimo 6 caracteres). Em branco = mantém a atual.
- Demais campos (Nome, Slug, Vencimento, Notas) sem mudança.

Ao salvar, restaurante e dono são atualizados; a lista é atualizada e aparece o aviso de sucesso.

## Detalhes técnicos

- Dono = primeiro membro com papel `admin` em `restaurante_membros` do restaurante.
- `src/lib/superadmin.functions.ts`:
  - Novo `getDonoRestaurante(id)` — retorna `user_id`, nome (user_metadata) e email do dono para preencher o diálogo.
  - Novo `atualizarDonoRestaurante` — valida com Zod (`nome`, `email`, `senha` opcional min 6); usa `supabaseAdmin.auth.admin.updateUserById` para atualizar email, senha (se informada) e `user_metadata.nome`; rejeita email já usado por outro usuário; registra em `audit_logs`.
- `src/hooks/use-superadmin.ts`: hooks `useDonoRestaurante` (query) e `useAtualizarDonoRestaurante` (mutation).
- `src/components/superadmin/editar-restaurante-dialog.tsx`: adiciona seção "Dono" com os 3 campos; carrega dados atuais via `useDonoRestaurante` quando o diálogo abre; no `submit`, chama `atualizarDono` quando houver mudança em nome/email ou senha preenchida. Senha com botão de mostrar/ocultar, como no cadastro.
- Nenhuma mudança em outras rotas, schema ou RLS.
