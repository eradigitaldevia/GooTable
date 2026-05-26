
# Evolução da gestão de garçons

Plano dividido em 6 fases independentes e aprováveis em separado. Cada fase entrega valor sozinha e a ordem reflete dependências técnicas (1→2→3 são base, 4→5→6 são opcionais).

---

## Fase 1 — Badges de garçom no KDS, Mesas e Pedidos

**Objetivo:** tornar o garçom responsável visível em todas as telas operacionais (sem alterar comportamento).

### Frontend
- `src/components/cozinha/kds-card.tsx`: adicionar chip "Garçom: Nome" (ou "—") usando `pedido.garcom_id` resolvido contra a lista de garçons (já existe `useGarcons`).
- `src/components/mesas/mesa-card.tsx`: badge com nome do garçom ativo da mesa (via `useAtribuicoesMesas`).
- `src/components/pedidos/pedido-card.tsx` e `detalhe-pedido.tsx`: exibir garçom responsável.
- Novo hook utilitário `useGarcomLookup(restauranteId)` → retorna `Map<garcomId, Garcom>` para evitar prop drilling.

**Sem mudanças de banco.** Os dados já existem (`pedidos.garcom_id`, `mesa_garcom`).

---

## Fase 2 — Login próprio do garçom + rota `/sala`

**Objetivo:** garçom acessa sua tela operacional dedicada, vendo apenas suas mesas, pratos prontos e chamados.

### Decisão de autenticação
Conforme o documento anexo, há duas opções. **Recomendação: opção A (usuário Supabase Auth por garçom)** para auditoria limpa e RLS natural. Opção B (PIN) fica fora desse plano.

### Banco (migração)
- `garcons` ganha coluna `user_id uuid UNIQUE NULL` (FK lógica a `auth.users.id`, sem FK física conforme padrão do projeto).
- Novo enum/coluna em `restaurante_membros.papel`: incluir valor `'garcom'` (se ainda não existir como `app_role`).
- Função `vincular_garcom_usuario(_garcom_id uuid, _email text)` — admin convida; gera membership com papel `garcom`.
- View/RPC `sala_dados_garcom()` — retorna `{ garcom, mesas[], pedidos_prontos[], chamados_pendentes[] }` filtrados por `auth.uid()`.

### Rotas
- `src/routes/_authenticated/sala.tsx` — layout simplificado (sem sidebar admin).
- `src/routes/_authenticated.tsx` ou um novo `_authenticated/_sala.tsx` para isolar o chrome.
- Redirecionar usuários com papel `garcom` para `/sala` ao logar (em `login.tsx`).

### UI (baseada no protótipo `sala_tela_garcom.html`)
- Header: avatar + nome + mesas atribuídas + relógio + botão chamados.
- Tabs: **Pratos prontos** / **Minhas mesas** / **Chamados**.
- Realtime: canais `pedidos` (status=pronto, filtro mesas) e `chamados_garcom`.
- Sons distintos (880 Hz prato pronto, 660 Hz chamado).
- Ação "Confirmar entrega" → `status=entregue` (dispara trigger de comissão existente).
- Ação "Atendido" no chamado → reaproveita fluxo existente.

### Componentes novos
```
src/components/sala/
  sala-header.tsx
  pratos-prontos-list.tsx
  minhas-mesas-grid.tsx
  chamados-list.tsx
src/hooks/use-sala.ts
src/lib/sala.functions.ts
```

### Sidebar admin
- Em `/admin/garcons`, no roster, novo botão "Vincular usuário" (input de e-mail) que chama `vincular_garcom_usuario`.

---

## Fase 3 — Divisão de comissão entre múltiplos garçons no mesmo pedido

**Objetivo:** um pedido pode ter N garçons, cada um com peso percentual.

### Banco
- Nova tabela `pedido_garcons` (`pedido_id`, `garcom_id`, `peso numeric` — soma deve dar 100 por pedido).
- Manter `pedidos.garcom_id` como "garçom principal" (compatibilidade) — preenchido com o de maior peso.
- `comissoes` ganha `peso numeric NOT NULL DEFAULT 100`.
- Trigger `trg_pedido_gerar_comissao` reescrito: itera `pedido_garcons` (fallback para `pedidos.garcom_id` se vazio) e gera uma linha por garçom com `valor_comissao = total * percentual * peso/100`.
- RPC `definir_garcons_pedido(_pedido_id, _items jsonb)` — substitui atribuições; bloqueia se já houver comissões pagas.

### UI
- `/admin/pedidos` e `detalhe-pedido.tsx`: nova ação "Dividir comissão" → modal com seleção de garçons + sliders de peso (validação: soma = 100).
- Painel Comissões: agrupar por garçom mantendo visibilidade do peso aplicado.

---

## Fase 4 — Comissão sobre item (opção configurável)

**Objetivo:** permitir cálculo por item, não pelo total do pedido.

### Banco
- `restaurantes` (ou nova tabela `restaurante_configuracoes`) ganha `comissao_modo text CHECK IN ('pedido','item') DEFAULT 'pedido'`.
- `produtos` ganha `percentual_comissao numeric NULL` (sobrepõe % do garçom) e `comissao_aplicavel boolean DEFAULT true` (ex: combos zerados).
- Trigger de comissão passa a:
  - Se modo `pedido`: comportamento atual.
  - Se modo `item`: percorrer `pedido_itens` do pedido, calcular `Σ (preco_unit * qtd * (produto.percentual_comissao ?? garcom.percentual_comissao))`.
- Comissão fica registrada em uma única linha por garçom×pedido (campo `valor_pedido` passa a refletir a base calculada).

### UI
- `/admin/configuracoes`: novo card "Comissão de garçons" (radio Pedido/Item).
- `/admin/cardapio` (produto-form-fields): inputs `% comissão` e toggle "aplicável".
- Painel Comissões: badge "por item" quando aplicável.

---

## Fase 5 — Bônus por meta / horários

**Objetivo:** premiar garçons que atingem metas (faturamento, número de pedidos) ou trabalham em horários específicos.

### Banco
- `garcom_metas` (`garcom_id`, `tipo enum('faturamento','pedidos','horario')`, `periodo enum('diario','semanal','mensal')`, `alvo numeric`, `bonus_valor numeric`, `bonus_percentual numeric`, `ativo`, `vigencia_inicio`, `vigencia_fim`).
- `garcom_bonus` (`garcom_id`, `meta_id`, `periodo_ref date`, `valor`, `status enum('pendente','pago')`, `calculado_em`, `pago_em`).
- Função `calcular_bonus_garcom(_garcom_id, _periodo_ref)` — chamada por job (pg_cron diário) ou via botão admin.
- Horários: meta tipo `horario` aplica bônus % sobre comissões geradas dentro do intervalo (ex: 18h-23h sábado).

### UI
- Nova aba em `/admin/garcons`: **Metas & Bônus**.
  - CRUD de metas por garçom (ou globais).
  - Tabela de bônus calculados, com botão "Pagar" (integrado ao fluxo de comissões).
- Painel Comissões: linha agregada por garçom passa a mostrar `Comissão + Bônus = Total`.

---

## Fase 6 — Relatório PDF / Exportação

**Objetivo:** admin exporta extrato por garçom para fechamento.

### Backend
- Server function `gerarRelatorioComissoesFn({ garcomId?, periodo: {inicio,fim}, formato: 'pdf'|'csv' })`.
- PDF gerado server-side com `@react-pdf/renderer` ou `pdfkit` (escolher na implementação após teste no Worker runtime — fallback CSV garantido).
- CSV: stream simples, sempre disponível.

### Conteúdo do relatório
- Cabeçalho: restaurante, garçom, período.
- Resumo: total pedidos, total vendido, comissão (pendente/paga), bônus, total a pagar.
- Detalhamento: tabela de comissões linha-a-linha (data, pedido, mesa, valor, %, peso, comissão).
- Rodapé: assinatura, data de emissão.

### UI
- `/admin/garcons` aba Comissões: filtros de período + botões **Exportar CSV** e **Gerar PDF**.
- Roster (por garçom): botão "Extrato" abre relatório individual.

---

## Limites / fora de escopo deste plano
- PIN curto (opção B do doc) — fica como opção futura caso login por e-mail seja muito pesado para o turno.
- App mobile dedicado para garçom.
- Comissão sobre lucro (margem por produto).
- Pagamento de comissões via Pix integrado.
- Notificações push/SMS para garçom.

---

## Ordem sugerida de aprovação/execução
1. **Fase 1 (Badges)** — risco baixo, valor imediato.
2. **Fase 3 (Divisão de comissão)** — desbloqueia regras de negócio.
3. **Fase 2 (Login + /sala)** — entrega operacional grande, justifica esforço.
4. **Fase 4 (Comissão por item)** — refinamento de regra.
5. **Fase 5 (Bônus)** — gestão avançada.
6. **Fase 6 (Relatório PDF)** — fechamento contábil.

Confirme quais fases (e em que ordem) devo implementar. Posso entregar 1 fase por iteração para manter cada deploy estável.
