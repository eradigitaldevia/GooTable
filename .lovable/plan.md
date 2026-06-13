## Decisões fundamentais (respostas às 6 perguntas)

1. **Coluna `canal` nova** em `pedidos` (`mesa|balcao|delivery|retirada`). `origem` (`cliente|garcom`) fica intacta — não quebra trigger `trg_pedido_gerar_comissao` nem demais regras existentes.
2. **Rastreio público via server fn + polling de 10s** (sem abrir `SELECT` em `pedidos` para `anon`). Evita expor PII e mantém RLS atual.
3. **NÃO** tornar `mesa_id/sessao_id/comanda_id` nullable. Cada restaurante com delivery ativo ganha **1 mesa virtual "DELIVERY"** (flag `is_virtual`); cada pedido delivery cria **1 sessão + 1 comanda** vinculadas a essa mesa. Reusa toda infra de comissão, status, cupom, KDS, caixa.
4. **Cupom reutiliza `aplicar_cupom_comanda**` (decorrente de #3 — existe comanda real).
5. **Pagamento na entrega** (cartão/dinheiro) apenas registra intenção em `pagamentos` com `status='pendente'`. **PIX** usa `pix_chave`/`pix_nome_titular` do restaurante (mesmo `PixPanel` da mesa, sem gateway).
6. **Sem nova rota de relatório.** Adicionar filtro `canal` em `/admin/relatorios` e cards de métricas delivery no dashboard existente.

---

## 1. Banco de dados (1 migration)

### 1.1 `pedidos`

- `ADD COLUMN canal TEXT NOT NULL DEFAULT 'mesa' CHECK (canal IN ('mesa','balcao','delivery','retirada'))`
- `ADD COLUMN cliente_telefone TEXT`
- `ADD COLUMN endereco_cep TEXT`, `endereco_rua TEXT`, `endereco_numero TEXT`, `endereco_complemento TEXT`, `endereco_bairro TEXT`, `endereco_cidade TEXT`, `endereco_uf TEXT`, `endereco_referencia TEXT`
- `ADD COLUMN taxa_entrega NUMERIC(10,2) DEFAULT 0`
- `ADD COLUMN previsao_entrega_min INTEGER`
- Index parcial: `(restaurante_id, canal, criado_em DESC) WHERE canal IN ('delivery','retirada')`

### 1.2 `restaurantes` — configs delivery

- `delivery_ativo BOOLEAN DEFAULT false`
- `delivery_slug TEXT UNIQUE` (slug auto-gerado)
- `delivery_taxa_entrega NUMERIC(10,2) DEFAULT 0`
- `delivery_pedido_minimo NUMERIC(10,2) DEFAULT 0`
- `delivery_tempo_estimado_min INTEGER DEFAULT 45`
- `delivery_retirada_ativa BOOLEAN DEFAULT true`
- `delivery_raio_km NUMERIC(5,2)` (informativo, sem geocoding)
- `delivery_aceita_dinheiro BOOLEAN DEFAULT true`
- `delivery_aceita_cartao_entrega BOOLEAN DEFAULT true`
- `delivery_aceita_pix BOOLEAN DEFAULT true`

### 1.3 `mesas` — mesa virtual delivery

- `ADD COLUMN is_virtual BOOLEAN NOT NULL DEFAULT false`
- Trigger `criar_mesa_delivery_virtual()`: ao ativar `delivery_ativo=true`, garante 1 mesa `numero='DELIVERY'`, `is_virtual=true` por restaurante.
- Filtrar `is_virtual=false` em todas as queries de mesas do admin (sala, mesas, KDS dashboard) — listar lista abaixo.

### 1.4 Função `gerar_delivery_slug()`

- Trigger BEFORE INSERT/UPDATE em `restaurantes` quando `delivery_slug IS NULL`: sanitiza `nome` (lower, sem acento, `-`), garante unicidade com sufixo numérico.

### 1.5 RLS / GRANTS

- `restaurantes`: nova policy `SELECT` para `anon` com filtro `delivery_ativo=true` retornando **apenas colunas públicas** (criar VIEW `restaurantes_delivery_publico` com whitelist: nome, logo, cor_primaria, slug, configs delivery, pix). `GRANT SELECT ON restaurantes_delivery_publico TO anon`.
- `produtos`, `categorias`: já têm leitura pública via cardápio QR — confirmar e reusar.
- `pedidos`/`pedido_itens`: **NÃO** abrir para `anon`. Criação e leitura por anon vão via server fn com `supabaseAdmin`.

---

## 2. Server functions (`src/lib/delivery.functions.ts`)

Todas usam `supabaseAdmin` (rota anônima validada por slug/token).

- `**getRestauranteDeliveryFn**` `{ slug }` → restaurante público + cardápio (reusa `cardapio-publico.functions`).
- `**buscarClienteDeliveryFn**` `{ restauranteId, telefone }` → reusa lógica de `buscarClientePorTelefoneFn` (nome + últimos endereços salvos em `clientes.metadata->enderecos`).
- `**criarPedidoDeliveryFn**` `{ slug, cliente:{nome,telefone}, modo:'delivery'|'retirada', endereco?, itens[], observacao?, cupom?, pagamento:{tipo:'pix'|'dinheiro'|'cartao_entrega', troco_para?} }`:
  1. Valida restaurante ativo, pedido mínimo, itens disponíveis.
  2. Upsert cliente (telefone como chave).
  3. Cria/abre sessão + comanda na mesa virtual DELIVERY.
  4. Aplica cupom via `aplicar_cupom_comanda` se enviado.
  5. Cria pedido com `canal=modo`, snapshot de endereço + taxa.
  6. Insere `pedido_itens` + dispara `pedido_destino_status` (cozinha/bar) via trigger existente.
  7. Cria `pagamentos` `status='pendente'` (PIX inclui payload copia‑e‑cola gerado por `lib/pix.ts`).
  8. Salva endereço em `clientes.metadata` (últimos 3).
  9. Retorna `{ pedidoId, comandaId, pixPayload? }`.
- `**getPedidoRastreioFn**` `{ slug, pedidoId, telefone }` → valida telefone do pedido, retorna `{ status, criado_em, previsao_entrega_min, itens:[nome,qtd], total, taxa_entrega, modo, endereco_resumo, pagamento_status, restaurante:{nome,cor_primaria,whatsapp} }`. Sem PII de outros pedidos.
- `**confirmarPagamentoPixDeliveryFn**` (admin): marca `pagamentos.status='pago'`.

Schemas Zod com limites em todos os campos.

---

## 3. Refatoração para reuso (sem duplicar componentes)

### 3.1 `src/lib/cart.ts`

- Generalizar chave: `key(scope: 'mesa'|'delivery', id: string)` → `mesa-cart:{token}` / `delivery-cart:{slug}`. Assinaturas atuais ganham wrapper compat para zero quebra.

### 3.2 Componentes cliente reutilizados com prop `contexto`

- `ProdutosListaCategorizada` → prop `contexto: 'mesa'|'delivery'` (default `'mesa'`). Em delivery: oculta `cliente_nome` no carrinho, oculta "chamar garçom".
- `CarrinhoPersistente` → idem; em delivery exibe **barra "faltam R$ X para o pedido mínimo"** quando `subtotal < pedido_minimo`.
- `TelaCarrinho` (rota `m.$qrToken_.carrinho`) — extrair corpo para `<CarrinhoView contexto>` e reusar em delivery passo 2.
- `PixPanel` → já parametrizável; reusar em delivery quando pagamento PIX.
- `TemaCardapioProvider` → reusar passando `cor_primaria` do restaurante delivery.

Nenhum componente é duplicado; props opcionais preservam comportamento atual da mesa.

---

## 4. Rotas públicas

### 4.1 `src/routes/delivery.$slug.tsx` — fluxo de 3 passos

Layout mobile-first próprio (sem `admin-sidebar`, sem `cliente-header` da mesa). Header com `cor_primaria` do restaurante e logo.

- **Passo 1 — Identificação**: telefone (máscara `(99) 99999-9999`) → autopreenche nome/endereços salvos. Escolha modo: Delivery / Retirada.
- **Passo 2 — Cardápio + carrinho**: reusa `ProdutosListaCategorizada` e `CarrinhoPersistente` com `contexto='delivery'`. Barra de pedido mínimo persistente no rodapé.
- **Passo 3 — Revisão e pagamento**: endereço (se delivery; seletor dos últimos 3 + form novo), cupom (reusa `CupomInput`), método de pagamento (PIX/Dinheiro com troco/Cartão na entrega — filtrados pelas flags do restaurante), observação, resumo (subtotal + taxa + desconto = total).
- Submissão → cria pedido → **tela de sucesso 2s** (com número do pedido + "abriremos o status") → `navigate({ to: '/delivery/$slug/pedido/$pedidoId' })`.

Search param `step` para deep-link. State entre passos em `localStorage` (`delivery-state:{slug}`).

### 4.2 `src/routes/delivery.$slug_.pedido.$pedidoId.tsx`

- Polling 10s via `useQuery({ queryFn: getPedidoRastreioFn, refetchInterval: 10000 })`.
- Telefone armazenado em `localStorage` para autenticar leitura (sem login).
- **Timeline vertical**: Recebido → Em preparo → Pronto → Saiu para entrega (delivery) / Pronto para retirada (retirada) → Entregue.
- Card endereço/modo, total, pagamento status, botão **WhatsApp** (deep link `https://wa.me/<whatsapp_restaurante>?text=...` com nº do pedido).
- Se PIX e `pagamento_status='pendente'` → `PixPanel` no topo.

### 4.3 `head()` SEO

Cada rota com `title`, `description`, `og:title`, `og:description`, `og:image` (logo do restaurante).

---

## 5. Admin

### 5.1 `/admin/pedidos` (kanban)

- Adicionar `<Tabs>` no header: **Todos | Salão | Delivery | Retirada** (filtro local sobre `canal`).
- `PedidoCard` ganha badge ícone (🛵 delivery / 🛍️ retirada) quando `canal !== 'mesa'`.
- `DetalhePedido` exibe seção "Entrega" (endereço completo + telefone + botão WhatsApp + botão "copiar endereço") quando canal=delivery, ou "Retirada" (telefone + botão "Notificar cliente" que **copia link de rastreio + toast**, sem abrir aba) quando canal=retirada.
- Som + toast destacado para pedido novo já existe — manter (cobre delivery automaticamente).

### 5.2 `/admin/configuracoes` — nova aba "Delivery & Retirada"

Form com todos os campos `delivery_*` do restaurante. Aviso quando `delivery_ativo` e PIX/cartão/dinheiro todos desligados. Mostra URL pública: `{origin}/delivery/{slug}` com botão copiar e QR opcional.

### 5.3 KDS (`/cozinha`, `/bar`)

`KdsCard` ganha badge `canal` (ícone + label "DELIVERY" / "RETIRADA") quando aplicável. Endereço NÃO aparece no KDS (operacional cozinha). Sem mudança de fluxo.

### 5.4 Dashboard e relatórios

- `/admin` (dashboard): adicionar 2 cards — "Pedidos delivery hoje" e "Ticket médio delivery". Sem nova seção dedicada.
- `/admin/relatorios`: adicionar filtro `canal` (multi-select). Métricas existentes passam a respeitar o filtro. Sem nova rota.

### 5.5 Caixa

Pedidos delivery com pagamento confirmado lançam em `movimentos_caixa` exatamente como mesa (já coberto pela comanda virtual). Sem mudança.

---

## 6. Pontos preservados (não muda)

- Triggers existentes: comissão, status histórico, destino preparo, couvert, cashback, fidelidade — todos funcionam com a comanda virtual.
- `origem` permanece `cliente|garcom`.
- Cardápio QR Code da mesa segue idêntico.
- Sidebar admin, demais rotas, RLS de tabelas internas.
- Horário de funcionamento → **fase futura** (não entra agora).
- Geocoding / mapa / cálculo de taxa por distância → **fase futura**.

---

## 7. Detalhes técnicos

- **Mesa virtual DELIVERY**: filtrar `is_virtual=false` em: `listarMesasFn`, `useSala` (minhas-mesas), `mesas-grid`, `nova-comanda` selector, dashboard mesas ocupadas, relatórios de mesas. Lista exata levantada na implementação após `rg`.
- **Auth**: todas as mutations admin via `requireSupabaseAuth`; rotas `/delivery/*` via server fns com `supabaseAdmin` (sem middleware).
- **Validação telefone**: regex BR `^\(\d{2}\)\s?\d{4,5}-?\d{4}$`, normalizado para E.164 antes de gravar.
- **PIX payload**: reusa `src/lib/pix.ts` existente (BRcode estático).
- **Realtime admin**: canal existente em `/admin/pedidos` já cobre INSERT delivery — nenhum ajuste.
- **i18n**: pt-BR, BRL, padrão atual.

---

## 8. Arquivos afetados (estimativa)

**Novos (≈12)**

- Migration `xxx_delivery_modulo.sql`
- `src/lib/delivery.functions.ts`
- `src/hooks/use-delivery.ts`
- `src/routes/delivery.$slug.tsx`
- `src/routes/delivery.$slug_.pedido.$pedidoId.tsx`
- `src/components/delivery/header-delivery.tsx`
- `src/components/delivery/passo-identificacao.tsx`
- `src/components/delivery/passo-cardapio.tsx`
- `src/components/delivery/passo-revisao.tsx`
- `src/components/delivery/timeline-rastreio.tsx`
- `src/components/delivery/endereco-form.tsx`
- `src/components/configuracoes/delivery-form.tsx`

**Editados (≈10)**

- `src/lib/cart.ts` (generalização compat)
- `src/components/cliente/produtos-lista-categorizada.tsx` (prop `contexto`)
- `src/components/cliente/carrinho-persistente.tsx` (prop `contexto` + barra pedido mínimo)
- `src/routes/m.$qrToken_.carrinho.tsx` (extrair `<CarrinhoView>`)
- `src/routes/_authenticated/admin/pedidos.tsx` (tabs canal)
- `src/components/pedidos/pedido-card.tsx` (badge canal)
- `src/components/pedidos/detalhe-pedido.tsx` (seção entrega/retirada)
- `src/components/cozinha/kds-card.tsx` (badge canal)
- `src/routes/_authenticated/admin/configuracoes.tsx` (nova aba)
- `src/routes/_authenticated/admin/index.tsx` (cards delivery)
- `src/routes/_authenticated/admin/relatorios/*` (filtro canal)
- Queries de mesas (filtro `is_virtual=false`) — lista final no patch

---

## 9. Ordem de implementação sugerida (6 PRs lógicos)

1. Migration + tipos regenerados.
2. Server functions delivery + hook.
3. Refator cart + props `contexto` em componentes cliente (zero mudança visual mesa).
4. Rotas públicas `/delivery/$slug` e rastreio.
5. Admin: aba config + tabs no kanban + badges KDS.
6. Dashboard/relatórios: cards + filtro canal.

Posso seguir nessa ordem após aprovação, ou prefere agrupar diferente?  
  
Sim, ´pde seguir a ordem.  
Garante que a impelementação será realizada de forma segura. 