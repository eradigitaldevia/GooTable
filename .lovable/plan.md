## Objetivo

Tornar o switch **"Pagar comissão em pedidos do cliente (QR Code)"** confiável em 100% dos cenários — incluindo o caso comum em que a mesa tem garçom atribuído e o trigger `trg_pedidos_set_garcom` preenche `pedidos.garcom_id` automaticamente. Hoje, com a mesa atribuída, desligar o flag **não impede** a geração de comissão.

Adicionalmente, permitir definir um **percentual específico para pedidos do cliente (QR)**, opcional, que sobrescreve o percentual normal do garçom (e do produto, no modo "item") quando preenchido.

A obrigatoriedade de atribuição de mesa **permanece como está** (recomendação + alerta), sem novos bloqueios técnicos.

## Mudanças

### 1. Banco — coluna `pedidos.origem`

Migration adiciona:

- `pedidos.origem text NOT NULL DEFAULT 'garcom' CHECK (origem IN ('cliente','garcom'))`
- Backfill via default (histórico fica como `'garcom'`; comissões antigas não são revertidas).

Ajustes em funções SQL:

- `**criar_pedido_publico**` (QR cliente): insere `origem = 'cliente'`.
- **Demais fluxos**: usam o default `'garcom'`.
- `**trg_pedido_gerar_comissao**`: trocar `NEW.garcom_id IS NULL AND v_pagar_cliente = false` por `NEW.origem = 'cliente' AND v_pagar_cliente = false`. Assim o flag funciona mesmo com `garcom_id` preenchido pelo `trg_pedidos_set_garcom`.
- `**calcular_bonus_garcom**` (metas): trocar `p.garcom_id IS NOT NULL` por `p.origem = 'garcom'` nos filtros condicionais ao flag.

### 2. Banco — coluna `restaurantes.comissao_pedido_cliente_percentual`

Migration adiciona:

- `restaurantes.comissao_pedido_cliente_percentual numeric NULL CHECK (comissao_pedido_cliente_percentual IS NULL OR (comissao_pedido_cliente_percentual >= 0 AND comissao_pedido_cliente_percentual <= 100))`
- `NULL` = comportamento atual (usa `garcons.percentual_comissao` e, no modo item, `produtos.percentual_comissao`).
- Valor preenchido = **sobrescreve tudo** para pedidos com `origem = 'cliente'` (regra única, previsível: "pedido QR paga X%").

Ajuste em `**trg_pedido_gerar_comissao**`:

- Quando `NEW.origem = 'cliente'` e flag ligado e `restaurantes.comissao_pedido_cliente_percentual IS NOT NULL`: usar esse percentual no cálculo de `valor_comissao`, ignorando o percentual do garçom e o do produto (modo item).
- Caso contrário, cálculo atual.

### 3. UI — `comissao-modo-form.tsx`

Ajustar a copy do switch e adicionar o input do percentual dentro do mesmo bloco, visível apenas quando o switch está ligado:

> **Pagar comissão em pedidos do cliente (QR Code)**
> Quando ligado, pedidos do cliente (QR) geram comissão dividida entre os garçons atribuídos à mesa com turno aberto. Recomendamos manter cada mesa com pelo menos um garçom atribuído para que a comissão tenha destinatário. Quando desligado, somente pedidos lançados por um garçom geram comissão, e os pedidos do cliente também deixam de contar para as metas individuais.
>
> **Percentual específico para pedidos do cliente (opcional)**
> Deixe vazio para usar o percentual padrão de cada garçom. Quando preenchido, substitui o percentual do garçom (e do produto, no modo Por item) apenas para pedidos lançados pelo cliente.

Input numérico com sufixo `%`, range 0–100, placeholder "Usar percentual padrão", desabilitado quando o switch está OFF.

### 4. UI — `mesas-garcom-panel.tsx`

Alerta "X mesas sem garçom atribuído" condicional ao flag `comissao_pedido_cliente`:

- ON: copy atual (tom de alerta — comissão sem destinatário).
- OFF: copy neutra/informativa (comissão QR desligada).

Para isso:

- `src/routes/_authenticated/admin/garcons.tsx` passa `comissaoPedidoCliente={restaurante.comissao_pedido_cliente}` para `<MesasGarcomPanel />`.
- `MesasGarcomPanel` aceita a prop opcional e troca apenas a copy/tom.

### 5. Contrato TypeScript

- `Restaurante` em `src/lib/restaurante.functions.ts`: adicionar `comissao_pedido_cliente_percentual: number | null`.
- `ConfigPayload` em `src/hooks/use-configuracoes.ts`: idem.
- `configSchema` em `src/lib/configuracoes.functions.ts`: `comissao_pedido_cliente_percentual: z.number().min(0).max(100).nullable()` + incluir no `UPDATE`.
- `src/routes/_authenticated/admin/configuracoes.tsx`: estado do form (`""` quando vazio), hidratação a partir do restaurante, envio normalizado (`""` → `null`).

### 6. Verificação

Após a migração ser aprovada, busca rápida em `src/routes/_authenticated/sala*` e `src/components/sala/*` para confirmar que nenhum texto de UI promete bloqueio de mesa sem garçom (mantemos apenas recomendação).

## Arquivos a alterar

- `supabase/migrations/<novo>.sql` — `pedidos.origem`, `restaurantes.comissao_pedido_cliente_percentual`, ajustes em `criar_pedido_publico`, `trg_pedido_gerar_comissao` e `calcular_bonus_garcom`.
- `src/lib/restaurante.functions.ts` — tipo `Restaurante`.
- `src/lib/configuracoes.functions.ts` — schema + UPDATE.
- `src/hooks/use-configuracoes.ts` — `ConfigPayload`.
- `src/components/configuracoes/comissao-modo-form.tsx` — copy + input de percentual.
- `src/routes/_authenticated/admin/configuracoes.tsx` — estado/hidratação/save.
- `src/components/admin/garcons/mesas-garcom-panel.tsx` — alerta condicional.
- `src/routes/_authenticated/admin/garcons.tsx` — passar a prop.

## Fora de escopo

- Bloqueio técnico de mesa sem garçom (continua só recomendação + alerta).
- Percentual de QR diferenciado por garçom ou por produto (apenas um valor global).
- Retroatividade: comissões já geradas não são revertidas; histórico fica como `origem = 'garcom'`.
- RLS, comandas, fluxo do QR cliente, reversão de comissão.

&nbsp;

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.