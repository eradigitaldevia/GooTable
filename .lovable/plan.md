## Objetivo

Permitir que cada restaurante decida, em **Configurações → Comissão de garçons**, se pedidos lançados pelo próprio cliente (QR Code) geram comissão para os garçons atribuídos. Hoje a regra é fixa (sempre paga); passa a ser um switch, com **default ligado** para preservar o comportamento atual.

Quando desligado, esses pedidos **também não contam para metas individuais** do garçom (decisão do usuário — evita "bater meta sem atender").

## Mudanças

### 1. Banco

Nova coluna em `restaurantes`:

- `comissao_pedido_cliente boolean NOT NULL DEFAULT true`

Sem alteração de RLS. Tipos do Supabase regeneram após a migração.

### 2. UI — Configurações

Em `src/components/configuracoes/comissao-modo-form.tsx`, adicionar um terceiro bloco (mesmo padrão visual do switch de rateio):

> **Pagar comissão em pedidos do cliente (QR Code)**
> Quando ligado, pedidos lançados pelo cliente pelo QR Code geram comissão dividida entre os garçons atribuídos à mesa que estão com turno aberto. Quando desligado, apenas pedidos lançados por um garçom geram comissão. A atribuição da mesa continua obrigatória para organização da sala.

Wire em `src/routes/_authenticated/admin/configuracoes.tsx` (estado, defaults, payload do save) e em `src/hooks/use-configuracoes.ts` + `src/lib/configuracoes.functions.ts` (Zod + UPDATE).

### 3. Tipos e contrato

- `Restaurante` em `src/lib/restaurante.functions.ts`: adicionar `comissao_pedido_cliente: boolean`.
- `ConfigPayload` em `use-configuracoes.ts`: idem.
- `configSchema` em `configuracoes.functions.ts`: `comissao_pedido_cliente: z.boolean()`.

### 4. Cálculo de comissão

No ponto onde a comissão é gerada para pedidos (provavelmente no fluxo de confirmação/entrega em `src/lib/pedidos.functions.ts` ou função correlata — a confirmar na implementação):

- Se `pedido.garcom_id IS NULL` (= pedido feito pelo cliente) **e** `restaurante.comissao_pedido_cliente = false` → **não inserir** linhas em `comissoes` para esse pedido. Sair cedo do cálculo.
- Caso contrário, comportamento atual mantido (rateio entre atribuídos com turno aberto).

### 5. Metas e bônus

Em `src/lib/garcom-bonus.functions.ts` (apuração de metas), ao somar volume/quantidade por garçom:

- Quando `comissao_pedido_cliente = false`, excluir do somatório os pedidos com `garcom_id IS NULL` (mesmo que tenham passado pela mesa atribuída ao garçom).
- Quando ligado, sem mudança.

### 6. Relatórios e extrato

Sem mudança funcional, mas validar `src/components/admin/garcons/extrato-garcom-dialog.tsx` e `comissoes-panel.tsx`: como eles consomem a tabela `comissoes`, automaticamente refletem a regra (pedidos sem comissão simplesmente não aparecem). Nenhum código novo necessário.

## Arquivos a alterar

- `supabase/migrations/<novo>.sql` — adicionar coluna.
- `src/lib/restaurante.functions.ts` — tipo `Restaurante`.
- `src/lib/configuracoes.functions.ts` — schema + UPDATE.
- `src/hooks/use-configuracoes.ts` — `ConfigPayload`.
- `src/components/configuracoes/comissao-modo-form.tsx` — novo switch.
- `src/routes/_authenticated/admin/configuracoes.tsx` — estado/save.
- `src/lib/pedidos.functions.ts` (ou função de cálculo de comissão equivalente) — pular geração.
- `src/lib/garcom-bonus.functions.ts` — excluir do somatório de metas.

## Fora de escopo

- Remover obrigatoriedade de atribuição de mesa (continua).
- Configurar percentuais diferentes por canal (QR vs garçom). Aqui é só liga/desliga.
- Retroatividade: a regra vale a partir de pedidos novos; comissões já geradas não são revertidas.
