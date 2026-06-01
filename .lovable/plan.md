
# Corrigir comanda individual órfã ao re-identificar o mesmo cliente

## Problema

Em `src/lib/cliente-mesa.functions.ts`, `buscarClientePorTelefoneFn` decide criar individual ou compartilhada com base apenas em `ativas.length`:

```ts
const ativas = await listarComandasAtivas(sessao.id);
const comandaId =
  ativas.length > 0
    ? await garantirComandaCompartilhada(...)   // cria compartilhada NOVA
    : await criarComandaIndividual(...);
await vincularClienteSessao(sessao.id, cli.id, comandaId);
```

Quando o **mesmo cliente** se re-identifica na mesma sessão (segundo dispositivo, refresh limpando localStorage, nova leitura do QR, etc.), `ativas.length > 0` já é verdade por causa da própria comanda individual dele. O código cria uma compartilhada nova e move o vínculo do cliente para ela via `UPDATE`. A individual original fica `aberta`, sem participantes — e o card "Conta da mesa" mostra "2 comandas ativas" indevidamente.

## Solução

Tornar a re-identificação **idempotente**: se o cliente já tem vínculo ativo (`saiu_em IS NULL`) com uma comanda `aberta` nesta sessão, reutilizar essa comanda em vez de criar outra.

Esta mudança não altera o comportamento quando um cliente **diferente** entra na mesa: nesse caso `ativas.length > 0` continua disparando a criação da compartilhada como hoje.

## Alterações

**Único arquivo:** `src/lib/cliente-mesa.functions.ts`, dentro do `.handler()` de `buscarClientePorTelefoneFn`, logo após obter `cli` e `sessao` e **antes** de `listarComandasAtivas`:

1. Buscar em `mesa_sessao_clientes` um registro com `sessao_id = sessao.id`, `cliente_id = cli.id`, `saiu_em IS NULL`, retornando `comanda_id`.
2. Se encontrado, verificar em `comandas` se essa `comanda_id` tem `status = 'aberta'`.
3. Se ambos verdadeiros, pular a lógica de `ativas`/`garantirComandaCompartilhada`/`criarComandaIndividual` e usar essa comanda existente como `comandaId`. Ainda chamar `vincularClienteSessao` (que é idempotente) para manter `saiu_em = null` e atualizar `ultima_visita` como hoje.
4. Caso contrário (sem vínculo ativo, ou comanda já fechada), seguir o fluxo atual sem mudanças.

Retornar o mesmo shape `BuscarClientePorTelefoneResultado` de hoje (cliente, sessaoId, comandaId, mesaId, restauranteId).

## Fora de escopo

- Não alterar `sessoes.server.ts`, `resumoContaFn`, nem o card "Conta da mesa".
- Não mexer em comandas individuais já órfãs no banco (limpeza histórica pode ser feita depois manualmente, se desejado).
- Não alterar o comportamento quando o cliente que se identifica é diferente dos já presentes na sessão.

## Verificação

Após a mudança, reproduzir o fluxo do Alison:
1. Identificar pelo telefone → cria individual.
2. Re-identificar o mesmo telefone na mesma mesa → deve devolver a MESMA `comandaId` (a individual existente), sem criar compartilhada nova.
3. "Conta da mesa" não deve mais exibir "2 comandas ativas" nesse cenário.
