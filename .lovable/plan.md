# Ponto: Impedir cliente em duas mesas simultaneamente

## Regra acordada

- **Bloqueio por telefone (backend).** Se o cliente (mesmo telefone, no mesmo restaurante) já tem comanda `aberta` em outra mesa, não pode abrir/entrar em uma nova mesa.
- **Saída oferecida:** o cliente pode (a) voltar para a mesa anterior ou (b) **transferir-se** para a nova mesa — o que fecha o vínculo dele na mesa antiga e abre na nova.
- Não há permissão para ficar com duas mesas ativas em paralelo.

## Escopo

Vale para os dois pontos de entrada do cliente via QR:

1. `LookupTelefoneStep` (telefone já cadastrado) — `buscarClientePorTelefoneFn`.
2. `IdentificacaoModal` (novo cadastro / identifica nome+telefone) — `identificarClienteFn`.

Sem mudanças no fluxo do garçom/admin (eles continuam podendo movimentar mesas como hoje).

## Detecção de conflito (backend)

Considera-se "cliente já em outra mesa" quando existe registro em `mesa_sessao_clientes` ligado a:

- uma `comanda` com `status = 'aberta'`,
- cuja `mesa_sessoes.status = 'aberta'`,
- `mesa_sessoes.restaurante_id = restaurante atual`,
- `mesa_sessoes.mesa_id ≠ mesa do QR atual`,
- `mesa_sessao_clientes.saiu_em IS NULL`,
- `cliente_id = cliente identificado pelo telefone`.

Retorna dados da mesa em conflito: `{ mesaId, numero, sessaoId, comandaId, comandaTipo }`.

## Mudanças no backend (server functions)

### 1) `buscarClientePorTelefoneFn` (`src/lib/cliente-mesa.functions.ts`)

- Após localizar o cliente pelo telefone, antes de chamar `garantirSessaoAberta`/vincular na mesa do QR, rodar a checagem de conflito.
- Se houver conflito, **não** criar/vincular nada; retornar shape novo:
  ```ts
  { encontrado: true, conflito: { mesaId, numeroMesa, sessaoIdAtual, comandaIdAtual, tipo }, cliente: {...} }
  ```
- Se não houver conflito, mantém o comportamento atual (retorna `sessaoId`/`comandaId` da mesa nova).

### 2) `identificarClienteFn` (`src/lib/clientes.functions.ts`)

- Mesmo padrão: após upsert do cliente por telefone, checar conflito **antes** de retornar `comandas_ativas` da mesa nova.
- Se houver conflito, retornar `{ conflito: {...}, cliente }` em vez de `sessao_id`/`comandas_ativas`.

### 3) Nova função `transferirClienteParaMesaFn` (em `src/lib/cliente-mesa.functions.ts`)

Input: `{ qrToken (novo), clienteId, sessaoOrigemId, comandaOrigemId }`.
Passos atômicos (via `supabaseAdmin`):

1. Validar QR token → mesa/restaurante novo.
2. Validar que o cliente realmente está em `mesa_sessao_clientes` da comanda de origem com `saiu_em IS NULL`.
3. **Encerrar vínculo na origem:** `update mesa_sessao_clientes set saiu_em = now()` para esse cliente+comanda.
4. **Tratar comanda de origem:**
  - Se `comandas.tipo = 'individual'` e o cliente era o titular: marcar `comandas.status = 'fechada'` apenas se **não houver itens em `pedido_itens**` vinculados a essa comanda (proteção: se há consumo, não fechar — manter aberta, apenas remover vínculo do cliente; o garçom/caixa fecha depois).
  - Se `comandas.tipo = 'compartilhada'`: apenas remove o vínculo; comanda continua viva para os demais.
5. **Sessão de origem:** se não restar nenhum vínculo ativo e nenhuma outra comanda aberta naquela sessão, fechar `mesa_sessoes` (`status='fechada'`, `fechada_em=now()`).
6. **Abrir/vincular na mesa nova:** reaproveitar `garantirSessaoAberta` + `criarComandaIndividual` (default) e `vincularClienteSessao`.
7. Retornar `{ sessaoId, comandaId }` da mesa nova.

Observação importante: a regra "não fechar comanda com itens" garante que o cliente não escape de uma conta já consumida. Nesse caso a UI mostra mensagem clara: "Você tem consumo em aberto na Mesa X. Procure um garçom/caixa para encerrar antes de mudar de mesa."

## Mudanças no frontend

### 4) Hook `useClienteMesa` — sem mudança estrutural.

### 5) `src/routes/m.$qrToken.tsx`

- Tratar o novo retorno `{ conflito }` em `handleLookup` e `handleIdentificar`.
- Quando vier `conflito`, abrir um novo modal `ConflitoMesaModal` em vez de salvar identidade.

### 6) Novo componente `src/components/cliente/conflito-mesa-modal.tsx`

Props: `{ clienteNome, numeroMesaAtual, podeTransferir: boolean, motivoBloqueio?: string, onTransferir(), onCancelar() }`.

- Texto: "Olá, {nome}! Você já tem uma conta aberta na **Mesa {numeroAtual}**. Para abrir uma comanda nesta mesa, encerre a anterior."
- Botões:
  - **Transferir minha conta para esta mesa** (chama `transferirClienteParaMesaFn`) — habilitado apenas quando `podeTransferir = true` (sem itens consumidos na comanda origem, conforme regra acima; backend retorna essa flag junto do conflito).
  - **Cancelar** (fecha modal; cliente continua sem identidade nesta mesa).
- Quando há consumo (`podeTransferir = false`), só mostra o aviso para procurar o garçom + botão Cancelar.

### 7) Fluxo após transferência bem-sucedida

- Chamar `salvar(...)` no `useClienteMesa` com os dados retornados (nova `sessaoId`/`comandaId`).
- Toast: "Conta transferida para a Mesa {nova}".
- Fechar modal.

## O que NÃO está no escopo

- Não mexer no fluxo de garçom/admin abrindo comanda manualmente (`sala_.nova-comanda`), nem em chamados, KDS, pagamentos.
- Não alterar `escolher-comanda-modal` quando o cliente já está legitimamente na mesma mesa.
- Não mudar como o `localStorage` por `qrToken` funciona (continua independente por mesa no device — o bloqueio efetivo vem do backend por telefone).

## Validação manual após implementar

1. Mesa A: identificar com telefone X, fazer 1 pedido.
2. Escanear QR da Mesa B com o mesmo telefone → modal de conflito aparece, **sem** opção de transferir (há itens).
3. Cancelar → continua sem entrar na Mesa B.
4. Mesa C (telefone Y novo, sem comanda em lugar nenhum): entra normalmente.
5. Em uma mesa sem itens consumidos, testar "Transferir" → fecha vínculo (e comanda quando elegível) na origem, abre na nova.

## Arquivos previstos

- Editar: `src/lib/cliente-mesa.functions.ts`, `src/lib/clientes.functions.ts`, `src/lib/sessoes.server.ts` (helper de detecção de conflito + transferência), `src/routes/m.$qrToken.tsx`.
- Criar: `src/components/cliente/conflito-mesa-modal.tsx`.
- Sem migrations: a estrutura atual de `mesa_sessao_clientes` + `comandas` + `mesa_sessoes` já suporta a regra.

&nbsp;

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.