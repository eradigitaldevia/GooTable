# Plano: Papel `cozinheiro` + UI de membros no /admin

Objetivo: permitir que o admin do restaurante crie um usuário **só-cozinha** que entre direto no `/cozinha` e não tenha acesso ao painel admin. Hoje só existe `admin | staff`, e a UI de membros só está no superadmin.

## Decisões

1. **Novo valor do enum**: `cozinheiro` adicionado a `app_role` (mantém `admin` e `staff`).
2. **Permissões**:
   - `cozinheiro` continua sendo membro do restaurante → `is_restaurante_membro` retorna true → passa em `assertAcessoRestaurante` → pode ler pedidos e atualizar status. Zero mudança em RLS / server fns existentes.
   - Diferença é puramente de **roteamento no cliente**: cozinheiro não acessa rotas `/admin/*`, apenas `/cozinha`.
3. **Login**: após autenticar, se o papel do usuário no restaurante for `cozinheiro`, redirecionar para `/cozinha`. Platform admin continua indo para `/superadmin`.
4. **Guarda no layout admin**: `_authenticated/admin.tsx` verifica papel; se for `cozinheiro`, redireciona para `/cozinha` (defesa em profundidade).
5. **UI**: rota `/admin/equipe` reaproveitando padrão de `membros-panel.tsx` do superadmin, com seletor de papel (`admin` | `staff` | `cozinheiro`). Só `admin` do restaurante pode gerenciar membros.

## Migração de DB

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cozinheiro';
```

Nada mais. RLS já usa `is_restaurante_membro` (independente de papel). Sem mudança em policies.

## Server functions

**Novas** (`src/lib/equipe.functions.ts`, com `requireSupabaseAuth`):
- `listarMembrosFn({ restauranteId })` — lista membros (exige papel `admin` do solicitante).
- `adicionarMembroFn({ restauranteId, email, papel })` — cria/encontra user e insere em `restaurante_membros`.
- `alterarPapelMembroFn({ membroId, novoPapel })` — atualiza o `papel` de um membro existente. Validações:
  - solicitante é `admin` do mesmo restaurante;
  - não permitir rebaixar o **último admin** do restaurante (conta `papel = 'admin'` > 1 antes de aplicar);
  - não permitir o usuário rebaixar a si mesmo se for o único admin.
- `removerMembroFn({ membroId })` — remove, com as mesmas proteções de "último admin".
- `getMeuPapelFn()` — retorna `{ papel, restauranteId }` para o usuário logado. Usado no login e no guarda de rota.

**Editadas**: nenhuma. `superadmin.functions.ts` ganha `cozinheiro` no `z.enum` do `papel`.

## Cliente

**Novos**:
- `src/routes/_authenticated/admin/equipe.tsx` — página com tabela de membros + dialog "Adicionar membro".
- `src/components/admin/equipe-panel.tsx` — UI baseada em `membros-panel.tsx`. Cada linha tem:
  - **Select inline de papel** (Admin / Staff / Cozinheiro) que dispara `alterarPapelMembroFn` com confirmação (`AlertDialog`) quando é rebaixamento do próprio usuário ou de admin.
  - Botão de remover (igual ao superadmin).
  - Descrição curta de cada papel no select.
- `src/hooks/use-equipe.ts` — wrappers de React Query (`useMembros`, `useAdicionarMembro`, `useAlterarPapelMembro`, `useRemoverMembro`).
- `src/routes/forgot-password.tsx` — formulário público pedindo email → chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`. Link "Esqueci minha senha" adicionado em `/login`.
- `src/routes/reset-password.tsx` — rota pública. Lê `type=recovery` do hash, mostra formulário de nova senha, chama `supabase.auth.updateUser({ password })` e redireciona para `/login`. Acessível para qualquer membro (admin, staff, cozinheiro).

**Editados**:
- `src/routes/login.tsx` — `resolveDestination` chama `getMeuPapelFn()`; se `cozinheiro`, retorna `/cozinha`. Adicionar link "Esqueci minha senha".
- `src/routes/_authenticated/admin.tsx` — no `beforeLoad`, após resolver restaurante, buscar papel; se `cozinheiro`, `throw redirect({ to: '/cozinha' })`. Propaga `papel` para a sidebar.
- `src/components/admin/admin-sidebar.tsx` — adicionar item "Equipe" visível apenas para `papel === 'admin'`.
- `src/routes/_authenticated/cozinha.tsx` (header) — botão "Sair" para que o cozinheiro consiga deslogar.

## Fluxos

**Criar cozinheiro**: `/admin/equipe` → "Adicionar membro" → email + papel `Cozinheiro` → salvar.

**Trocar papel**: na tabela em `/admin/equipe`, admin muda o select da linha. Confirmação extra ao rebaixar admin ou a si mesmo. Bloqueado pelo backend se for o último admin.

**Login do cozinheiro**: insere credenciais → cai direto em `/cozinha`.

**Acesso indevido**: cozinheiro digita `/admin/...` → guarda redireciona para `/cozinha`.

**Reset de senha (self-service)**: em `/login`, link "Esqueci minha senha" → `/forgot-password` (informa email, recebe link por email) → `/reset-password` (define nova senha) → volta para `/login`. Funciona igualmente para admin, staff e cozinheiro — não precisa de fluxo separado.

## Validação

1. `enum_range(NULL::app_role)` retorna `{admin, staff, cozinheiro}`.
2. Adicionar cozinheiro em `/admin/equipe`, depois trocar papel para `staff` e voltar para `cozinheiro` na mesma tela.
3. Tentar rebaixar o único admin → backend rejeita com mensagem clara.
4. Login do cozinheiro cai em `/cozinha` direto; digitar `/admin` redireciona.
5. Cozinheiro consegue mover pedido de "Recebido" → "Em preparo" → "Pronto".
6. "Sair" no KDS volta para `/login`.
7. `/forgot-password` envia email; link abre `/reset-password`; nova senha funciona no próximo login.

## Fora de escopo

- Estações (cozinha quente/fria/bar) e filtros por categoria.
- Convite por link com expiração (hoje usa email + senha temporária).
