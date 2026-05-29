## Contexto atual

- `src/routes/_authenticated/sala.tsx` mostra **apenas** as mesas atribuídas ao garçom logado (consulta em `mesa_garcom` por `garcom_id`).
- Não existe nenhum caminho na UI para o garçom abrir uma mesa que não seja dele — para lançar pedido, ele depende de a mesa estar na sua lista.
- O backend (`criarPedidoGarcomFn` → RPC `criar_pedido_garcom`) já aceita qualquer `mesa_id` do restaurante. A comissão é registrada via `_garcom_id`, ou seja, **vai para quem lançou**, não para o "dono" da mesa. Isso é o comportamento desejado para atendimento cruzado.
- Não há flag no admin para habilitar/desabilitar esse comportamento.

## Cenário real

Garçom A precisa atender mesa atribuída ao garçom B (B está no banheiro, ocupado em outra mesa, saiu, etc.). O sistema precisa:

1. Permitir que A **encontre** a mesa de B.
2. Deixar claro que a mesa **não é sua** (evitar lançamento errado).
3. Registrar corretamente a comissão de A pelo pedido.
4. Permitir que o admin **ative ou desative** esse comportamento por restaurante.

## Proposta

### 1. Toggle no admin

Adicionar campo `permitir_atendimento_cruzado` (boolean, default `true`) em `restaurantes`.

- `true` → garçom pode lançar em qualquer mesa do restaurante.
- `false` → garçom só vê/atende suas próprias mesas (comportamento atual).

UI: novo switch em `src/routes/_authenticated/admin/configuracoes.tsx` (seção "Operação da sala" ou similar), com texto explicativo.

### 2. Localizar mesa que não é sua (na sala do garçom)

Quando o toggle está ativo, adicionar no `src/components/sala/sala-header.tsx` (ou logo abaixo dele) um botão **"Outra mesa"** que abre um modal:

```text
┌─ Outra mesa ──────────────────┐
│  🔍 [ Buscar nº da mesa... ]  │
│                               │
│  Mesa 3 · João  (livre)       │
│  Mesa 5 · Maria (2 abertos)   │
│  Mesa 7 · — (sem garçom)      │
│  ...                          │
└───────────────────────────────┘
```

- Lista todas as mesas ativas do restaurante.
- Mostra o garçom responsável (ou "—").
- Indicador leve quando há sessão aberta / pedidos pendentes.
- Filtro por número (input).
- Clicar → navega para `/sala/nova-comanda/$mesaId` (rota já existe e é agnóstica do "dono").

Quando o toggle está desativado: o botão não aparece.

### 3. Aviso visual ao lançar em mesa de outro garçom

Em `src/routes/_authenticated/sala.nova-comanda.$mesaId.tsx`, se a mesa **não pertence** ao garçom logado, mostrar uma faixa discreta no topo:

> ⚠ Mesa de **Maria**. A comissão deste pedido será sua.

Sem bloquear o fluxo — apenas para evitar engano.

### 4. Backend / regras de comissão

- Nenhuma mudança na RPC `criar_pedido_garcom`: já usa `_garcom_id` do payload, que é o garçom logado (`sala.garcom.id`). Comissão vai para quem lançou. ✅
- Acrescentar **validação server-side** em `criarPedidoGarcomFn`: se `restaurantes.permitir_atendimento_cruzado = false` **e** a mesa não está atribuída a `garcomId`, recusar com erro claro (`mesa_nao_atribuida`). Isso fecha a porta caso o front seja contornado.
- Auditoria: quando o pedido é lançado em mesa de outro garçom, registrar em `audit_logs` (`entidade='pedido'`, `acao='atendimento_cruzado'`, metadata com `garcom_dono_id` e `garcom_atendente_id`). Útil para o admin auditar abusos.

### 5. Realtime / pratos prontos / chamados

**Não** incluir mesas "alheias" nas abas **Prontos** e **Chamados** do garçom A. Isso continua escopo do dono — caso contrário, dois garçons disputariam a mesma entrega e os chamados ficariam ruidosos. O atendimento cruzado é **sob demanda** (A vai abrir a mesa de B explicitamente).

## Mudanças técnicas

**Banco:**

- Migration: `ALTER TABLE restaurantes ADD COLUMN permitir_atendimento_cruzado boolean NOT NULL DEFAULT true;`
- Atualização da RPC `criar_pedido_garcom` para validar o flag quando `_garcom_id` é passado.

**Server functions:**

- `src/lib/sala.functions.ts`: nova `listarMesasRestauranteFn` (retorna todas as mesas ativas + garçom responsável + flag de sessão aberta). Respeita o toggle (retorna vazio/erro se desativado).
- `src/lib/configuracoes.functions.ts`: incluir `permitir_atendimento_cruzado` nos getters/setters do restaurante.

**Frontend:**

- `src/components/sala/sala-header.tsx`: botão "Outra mesa" (condicional ao toggle).
- Novo `src/components/sala/outra-mesa-modal.tsx`: modal de busca/seleção.
- `src/hooks/use-sala.ts`: hook `useListarMesasRestaurante` + expor `permitir_atendimento_cruzado` em `useSalaDados`.
- `src/routes/_authenticated/sala.nova-comanda.$mesaId.tsx`: faixa de aviso quando mesa não é do garçom logado.
- `src/routes/_authenticated/admin/configuracoes.tsx`: switch do toggle.

## Pontos para confirmar antes de implementar

1. **Default do toggle**: começar como `true` (permissivo, alinhado ao mundo real) ou `false` (restritivo, exige ativação consciente)?  
Resposta: começar como `true`
2. **Comissão**: confirmar regra "quem lança recebe" — alternativa seria dividir 50/50 com o dono da mesa, mas isso adiciona complexidade. Recomendo manter "quem lança".  
Resposta: confirmo a regra "quem lança recebe" 
3. **Escopo**: também adicionar visualização das outras mesas dentro da aba "Mesas" (somente leitura) ou manter apenas via modal de busca? Recomendo só modal, para não poluir a tela principal.  
Resposta: manter apenas via modal de busca  
