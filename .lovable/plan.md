# Reconhecimento do cliente no retorno (A + B com lookup no backend, por restaurante)

Objetivo: ao ler o QR code, identificar automaticamente clientes recorrentes (mesmo dispositivo OU outro dispositivo) **no escopo do restaurante daquela mesa**, sem reabrir o modal de identificação, e mostrar um banner de boas-vindas com o primeiro nome.

Escopo intencionalmente mínimo. Sem mudanças visuais fora do banner. Sem mudanças no fluxo de pedidos, comanda, pagamento.

---

## 1. Corrigir bug atual (cenário A) — sessão/comanda obsoletas

Hoje `useClienteMesa` persiste `clienteId + nome + telefone + sessaoId + comandaId` por `qrToken` indefinidamente. Numa nova visita, `sessaoId`/`comandaId` antigos podem estar fechados no backend e quebrar pedidos/cashback.

**Mudança:** ao reidratar do `localStorage`, validar `sessaoId`/`comandaId` no backend via nova server fn. Se inválidos, manter `clienteId/nome/telefone` (cliente identificado) e **reatribuir** uma sessão/comanda atual da mesa (mesma lógica já usada quando o cliente se identifica pela primeira vez — reaproveitar helper existente em `src/lib/sessoes.server.ts`).

## 2. Lookup no backend (cenário B) — outro dispositivo

Quando `localStorage` está vazio para o `qrToken`, **antes** de abrir o `IdentificacaoModal`, oferecer um caminho rápido: campo único de telefone → server fn busca `clientes` no `restaurante_id` daquela mesa.

- Se encontrar: hidrata identidade local + cria/anexa sessão/comanda + segue para o menu (com banner).
- Se não encontrar: cai no fluxo atual (modal completo de nome + telefone).

Sem OTP (risco aceito pelo usuário). Escopo restrito ao restaurante da mesa lida (privacidade mínima razoável: ninguém descobre cliente de outro restaurante).

## 3. Banner de boas-vindas

Toast (sonner) único disparado uma vez por carregamento da rota `m.$qrToken` quando `identidade` existir após hidratação/lookup. Mensagem: `Bem-vindo(a) de volta, {primeiroNome}! 👋`. Sem persistência extra, sem componente fixo, sem alterar `ClienteHeader`.

---

## Arquivos afetados (exatos)

**Novos**
- `src/lib/cliente-mesa.functions.ts` — duas server fns:
  - `validarSessaoComanda({ sessaoId, comandaId, restauranteId })` → `{ valida: boolean }`
  - `buscarClientePorTelefone({ qrToken, telefone })` → `{ cliente: { id, nome, telefone } | null, sessaoId, comandaId, mesaId, restauranteId }` (quando encontra, já garante sessão/comanda abertas para a mesa do `qrToken`)

**Editados (mínimo)**
- `src/hooks/use-cliente-mesa.ts` — após reidratar, chamar `validarSessaoComanda`; se inválida, limpar apenas `sessaoId/comandaId` e expor flag `precisaRehidratarSessao`.
- `src/routes/m.$qrToken.tsx` — quando `precisaRehidratarSessao` ou `identidade=null`, antes do `IdentificacaoModal` montar um passo intermediário com campo de telefone (lookup); disparar toast de boas-vindas quando identidade fica disponível.
- `src/components/cliente/identificacao-modal.tsx` — **NÃO ALTERAR** (copy preservada). O passo de "tem telefone?" vira componente novo isolado.

**Novo componente**
- `src/components/cliente/lookup-telefone-step.tsx` — UI mínima reaproveitando estilo do `IdentificacaoModal` (mesmo container/botão), com link “Não estou cadastrado” que troca para o `IdentificacaoModal` atual sem alterá-lo.

---

## Backend / dados

Nenhuma migração de schema. Tabela `clientes` já tem `restaurante_id + telefone` (índice implícito por uso). Reaproveitar:
- `src/lib/sessoes.server.ts` (helpers de abrir/anexar sessão+comanda) — sem refactor.
- Tabelas: `clientes`, `mesas`, `mesa_sessoes`, `mesa_sessao_clientes`, `comandas`.

RLS: server fns rodam como anon público (igual ao fluxo atual de identificação) usando `supabaseAdmin` apenas para o lookup; validação restringe sempre por `restaurante_id` derivado do `qrToken` da mesa lida (nunca aceita `restauranteId` vindo do cliente).

---

## Fora de escopo (não fazer agora)

- OTP / verificação por SMS.
- Reconhecimento cross-restaurante.
- Mudança de copy/visual do `IdentificacaoModal`.
- Mudanças no header, carrinho, status, pagamento.
- Refactor de `useClienteMesa` além do necessário para validar sessão.

---

## Validação

1. Visita nova → modal completo (inalterado).
2. Mesmo device, mesma mesa, dias depois → entra direto + toast; pedido novo cria/usa sessão válida.
3. Outro device, mesmo restaurante → passo telefone → entra direto + toast.
4. Telefone não cadastrado → cai no modal atual.
5. Telefone cadastrado em outro restaurante → tratado como não encontrado.
