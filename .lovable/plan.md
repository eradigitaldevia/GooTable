## Objetivo

Aplicar **Opção B**: restaurar Realtime nos hooks admin (`useRealtimePedidos`, `useRealtimeClientes`) e marcar a finding `realtime_messages_no_policy` como não-aplicável, com justificativa técnica precisa.

## Justificativa técnica

O app usa **exclusivamente `postgres_changes`** (verificado: zero ocorrências de `.send()`, `.track()`, `.on('broadcast'/'presence')` em `src/`). A autorização de `postgres_changes` no Supabase Realtime é feita pela **RLS da tabela de origem** (`pedidos`, `pedido_itens`, `clientes`), que já está corretamente escopada por `is_restaurante_membro(auth.uid(), restaurante_id)`. Logo, a tabela `realtime.messages` não é o vetor de proteção para este padrão de uso — a finding genérica do scanner não se aplica.

## Escopo das alterações

### 1) `src/hooks/use-realtime.ts` — reverter parcialmente para o estado original

Restaurar a implementação **original com Realtime** das seguintes funções, sem fallback de polling:

- `useRealtimePedidos(restauranteId)` — canal `rt-pedidos-{restauranteId}`, escutando `pedidos` e `pedido_itens`.
- `useRealtimeClientes(restauranteId)` — canal `rt-clientes-{restauranteId}`, escutando `clientes`.

**Manter como polling** (cliente público, intencional para Etapa 2):

- `useRealtimePedido(pedidoId)` — polling 5s.
- `useRealtimeMesa(qrToken, sessaoId)` — polling 5s.

O arquivo voltará a importar `supabase` de `@/integrations/supabase/client` para os dois hooks revertidos.

### 2) Marcar finding como ignorada

Chamar `security--manage_security_finding` em `realtime_messages_no_policy` com operação `ignore` e explicação:

> "App usa exclusivamente `postgres_changes` (sem broadcast/presence). A autorização desses eventos é feita pela RLS das tabelas de origem (`pedidos`, `pedido_itens`, `clientes`), já escopada por `is_restaurante_membro`. `realtime.messages` não é vetor de proteção neste padrão de uso."

### 3) Atualizar `security-memory`

Adicionar nota explicando:
- Padrão de uso de Realtime no app (apenas `postgres_changes`).
- Por que `realtime.messages` não precisa de RLS adicional.
- Cliente público intencionalmente em polling (não usa Realtime) para minimizar superfície anônima.

## Fora de escopo (não mexer)

- `src/routes/_authenticated/cozinha.tsx` e `bar.tsx` — KDS já usa `useRealtimeStatus` diretamente, nunca foi alterado nesta sessão.
- `src/routes/m.$qrToken.status.$pedidoId.tsx` — fluxo público com server fn + polling permanece.
- Migrações da Etapa 2 (RLS de `pedidos`, `mesas`, `restaurantes`, `produtos`, etc.) — todas mantidas.
- Demais findings já tratadas.

## Verificação

- `rg "useRealtimePedidos|useRealtimeClientes"` mostra callers intactos (`admin/clientes.tsx`, `admin/clientes.$id.tsx`).
- Após reverter, `git diff` em `use-realtime.ts` deve mostrar apenas as duas funções voltando ao código original, com `useRealtimePedido`/`useRealtimeMesa` inalterados (polling).
- Build TypeScript ok (import de `supabase` reintroduzido).
