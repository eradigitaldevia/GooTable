# Plano: Comandas sempre individuais + Juntar/Dividir no fechamento

## Objetivo

Eliminar para sempre comandas compartilhadas "Sem titular" e o atrito do modal "Escolher comanda" na entrada. Toda entrada de cliente cria uma comanda **individual** com titular. O caso "rachar / juntar conta" migra para o **fechamento da mesa**, onde o garçom (ou caixa) escolhe quais comandas combinar ou como dividir o total entre N clientes.

## Princípios

- **Entrada simples**: 1 cliente = 1 comanda individual. Sem escolha, sem modal, sem "Sem titular".
- **Decisão de pagamento no momento certo**: rachar/juntar acontece quando alguém pede a conta, não na chegada.
- **Schema preservado**: `comandas.tipo` continua existindo (apenas o uso de `compartilhada` na entrada é descontinuado). Nada de migração destrutiva.
- **Histórico intacto**: comandas compartilhadas antigas (já abertas/fechadas) continuam válidas e visíveis.

## Mudanças por área

### 1. Entrada do cliente (cliente via QR)

**Arquivos:** `src/routes/m.$qrToken.tsx`, `src/components/cliente/escolher-comanda-modal.tsx`, `src/components/cliente/lookup-telefone-step.tsx`, `src/components/cliente/identificacao-modal.tsx`, `src/lib/clientes.functions.ts`, `src/lib/cliente-mesa.functions.ts`.

- Remover `EscolherComandaModal` do fluxo: o cliente nunca mais vê "Participar de existente / Abrir separada".
- `buscarClientePorTelefoneFn`: sempre criar/retomar a **individual** do cliente. Substituir o ramo `ativas.length > 0 ? garantirComandaCompartilhada(...) : criarComandaIndividual(...)` por sempre `criarComandaIndividual(...)` (com reuso idempotente quando já existe vínculo ativo).
- `identificarOuCriarClienteFn` (em `clientes.functions.ts`): mesma regra — sempre individual.
- Manter `transferirClienteParaMesaFn` e `detectarConflitoMesa` como estão.
- Manter `garantirComandaCompartilhada` no `sessoes.server.ts` apenas como utilitário interno (não chamado pela entrada), reservado para a ação de "Juntar" do garçom.

### 2. Sanitização de comandas órfãs já existentes

**Arquivo:** `src/lib/sessoes.server.ts` (novo helper) + chamada em `garantirSessaoAberta` ou em `resumoContaMesaFn`.

- Novo helper `sanitizarComandasOrfas(sessaoId)`: fecha (`status='fechada'`, `fechada_em=now()`) qualquer comanda `aberta` na sessão que tenha 0 `pedido_itens` E 0 vínculos ativos em `mesa_sessao_clientes` (`saiu_em IS NULL`). Idempotente.
- Chamado uma vez ao carregar o detalhe da mesa (`resumoContaMesaFn`) e ao abrir/garantir sessão, para limpar o passivo das compartilhadas "Sem titular" que ficaram da versão anterior.

### 3. Visualização do garçom

**Arquivo:** `src/routes/_authenticated/sala_.mesa.$mesaId.tsx`.

- Em "Comandas ativas", para cada comanda mostrar: nome do titular (sempre presente para individuais novas) + participantes (caso a compartilhada legada apareça).
- Remover (ou rotular como "Legado") badges "Sem titular" — após sanitização não devem mais aparecer.
- Adicionar 2 botões no rodapé do card "Comandas ativas" quando houver >1 comanda aberta:
  - **Juntar comandas** → abre `JuntarComandasDialog`.
  - **Dividir total** → abre `DividirTotalDialog`.

### 4. Ação "Juntar comandas desta mesa" (garçom)

**Novos arquivos:** `src/components/sala/juntar-comandas-dialog.tsx`, server fn `juntarComandasFn` em `src/lib/sessoes.server.ts` + wrapper em `cliente-mesa.functions.ts` (ou novo `comandas-acoes.functions.ts`).

UX:

- Dialog lista todas as comandas `aberta` da sessão com checkbox (titular, total parcial, nº de itens). Default: todas marcadas.
- Garçom marca ≥2 comandas → confirma.
- Opcional: campo "Titular da comanda resultante" (default = titular da comanda mais antiga; pode escolher "Sem titular = compartilhada").

Backend (`juntarComandasFn`):

- Entrada: `sessaoId`, `comandaIds: string[]` (≥2), `titularClienteId?: string | null`.
- Validações: todas pertencem à mesma sessão, todas `aberta`, sem pagamentos confirmados em nenhuma.
- Cria/escolhe comanda destino:
  - Se `titularClienteId` informado: `tipo='individual'`, titular = informado.
  - Se `null`: `tipo='compartilhada'`, sem titular.
  - Reusa a comanda mais antiga do conjunto como destino para preservar histórico.
- `UPDATE pedidos SET comanda_id = destinoId WHERE comanda_id IN (origens)`.
- `UPDATE pedido_itens` via `pedido_id` herda automaticamente (não precisa tocar).
- `UPDATE mesa_sessao_clientes SET comanda_id = destinoId WHERE comanda_id IN (origens) AND saiu_em IS NULL`.
- Recalcula `subtotal/total` da destino (somando) e zera + fecha as origens (`status='fechada'`, `fechada_em=now()`, totais zerados pois pedidos foram migrados).
- Retorna `{ comandaDestinoId }`.

### 5. Ação "Dividir total entre N clientes" (garçom/caixa)

**Novos arquivos:** `src/components/sala/dividir-total-dialog.tsx`, server fn `gerarDivisaoContaFn` em `sessoes.server.ts`.

UX:

- Dialog mostra: total consolidado da mesa (soma das comandas selecionadas) + seletor de quais comandas entram na divisão (default: todas abertas).
- Modo 1: **Igual entre N** — input numérico N (default = nº de participantes ativos), gera N "fatias" iguais.
- Modo 2: **Por participante** — lista os participantes da sessão; garçom marca quem entra; divide igual entre marcados.
- Modo 3: **Por item** (fora do escopo desta entrega — anotar como follow-up futuro).
- Preview do valor por pessoa e do troco/arredondamento (último paga a diferença em centavos).

Backend:

- Esta ação **não fragmenta a comanda no banco** — gera um plano de pagamento (snapshot calculado) que o fluxo de pagamento já existente consome (`pagamentos` com múltiplos registros parciais por comanda).
- Retorna `{ fatias: Array<{ valor: number; clienteId?: string; label: string }> }`.
- O dialog encaminha cada fatia para o fluxo de pagamento parcial (PIX/dinheiro/cartão) que já existe; o garçom confirma cada uma à medida que recebe.
- Não altera `comandas` exceto fechar quando `total_pago >= total` (lógica já existente).

### 6. Resumo de conta

**Arquivo:** `src/lib/pedidos.functions.ts` (`resumoContaMesaFn`).

- Adicionar campo `participantes: { cliente_id, nome }[]` por comanda (lido de `mesa_sessao_clientes` com `saiu_em IS NULL` + join em `clientes`). Reutilizado por:
  - Detalhe da mesa do garçom (passo 3).
  - `JuntarComandasDialog` e `DividirTotalDialog`.
- Chamar `sanitizarComandasOrfas` antes de montar o resumo.

### 7. Conflito entre mesas (`transferirCliente`)

- Sem mudanças. O caso "cliente já está em outra mesa" continua resolvido pela transferência que já existe.

## O que NÃO muda

- Schema do banco (sem migration). `comandas.tipo` permanece com valores `individual | compartilhada` — só muda o uso.
- Fluxo de pagamento existente (`pagamentos`, cashback, fidelidade, cupons): continuam tratando uma comanda por vez.
- KDS, fila, comissões, garçom roster, admin: nada muda.
- `EscolherComandaModal` do **garçom** (em `src/components/sala/nova-comanda/escolher-comanda-modal.tsx`) continua para a tela "Nova comanda do garçom" — lá o garçom escolhe a comanda para lançar pedido manualmente, contexto diferente da entrada do cliente.

## Arquivos resumo

```text
modificar:
  src/lib/sessoes.server.ts                  (+ sanitizarComandasOrfas, juntarComandas, gerarDivisaoConta)
  src/lib/cliente-mesa.functions.ts          (sempre individual; expor juntar/dividir)
  src/lib/clientes.functions.ts              (sempre individual)
  src/lib/pedidos.functions.ts               (participantes + sanitizar)
  src/routes/m.$qrToken.tsx                  (remover modal de escolher comanda)
  src/routes/_authenticated/sala_.mesa.$mesaId.tsx  (mostrar participantes + 2 botões)

criar:
  src/components/sala/juntar-comandas-dialog.tsx
  src/components/sala/dividir-total-dialog.tsx

remover do fluxo (manter arquivo se reutilizado):
  src/components/cliente/escolher-comanda-modal.tsx  (deletar se não usado em outro lugar)
```

## Riscos & mitigação

- **Comandas órfãs legadas**: sanitização automática + idempotente resolve no primeiro acesso à mesa.
- **Juntar com pagamento parcial pendente**: bloqueado por validação no `juntarComandasFn`.
- **Concorrência (dois garçons clicando junto)**: usar `for update` ou checagem de status `aberta` antes de cada `UPDATE`; última atualização vence sem corromper.

## Pendências para confirmar antes de implementar

1. **Titular da comanda juntada**: prefere default = titular da mais antiga, ou sempre perguntar?  
Resposta: sempre perguntar
2. **"Dividir total" Modo 3 (por item)**: implementar agora ou deixar como follow-up?  
Resposta: implementar
3. **Quem aciona Dividir/Juntar**: só garçom da sala, ou também caixa na tela de pagamento?  
Resposta: o garçom e o caixa.