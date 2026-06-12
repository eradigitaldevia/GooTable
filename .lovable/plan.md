## Plano final — papel Cumim (Runner)

Cumins são uma **entidade própria**, com cadastro, login e ciclo de vida separados dos garçons (sem comissão, sem mesas atribuídas, sem turnos de comissão). A estrutura espelha `garcons` mas vive numa tabela e numa página de cadastro próprias.

### 1. Banco (uma migration)

```sql
-- Tabela própria de cumins (espelha garcons, sem comissão)
CREATE TABLE public.cumins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id),
  nome            text NOT NULL,
  telefone        text,
  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cumins_restaurante ON public.cumins(restaurante_id) WHERE ativo;
CREATE UNIQUE INDEX uq_cumins_user_id ON public.cumins(user_id) WHERE user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cumins TO authenticated;
GRANT ALL ON public.cumins TO service_role;

ALTER TABLE public.cumins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cumins_rw_membro" ON public.cumins
  TO authenticated
  USING (is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid()))
  WITH CHECK (is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid()));

CREATE TRIGGER trg_cumins_touch BEFORE UPDATE ON public.cumins
  FOR EACH ROW EXECUTE FUNCTION touch_atualizado_em();

ALTER PUBLICATION supabase_realtime ADD TABLE public.cumins;

-- Rastreio da entrega no pedido (cumim OU garçom que cobriu)
ALTER TABLE public.pedidos
  ADD COLUMN entregue_por_cumim_id  uuid REFERENCES public.cumins(id),
  ADD COLUMN entregue_por_garcom_id uuid REFERENCES public.garcons(id),
  ADD COLUMN entregue_em            timestamptz;

CREATE INDEX idx_pedidos_entregue_cumim  ON public.pedidos(restaurante_id, entregue_por_cumim_id);
CREATE INDEX idx_pedidos_entregue_garcom ON public.pedidos(restaurante_id, entregue_por_garcom_id);

-- Flag no restaurante
ALTER TABLE public.restaurantes
  ADD COLUMN usa_cumim boolean NOT NULL DEFAULT false;
```

Sem `tarefas_salao`, sem triggers automáticos (já justificado: `mesas` não tem `status` e auto-geração polui mais do que ajuda). Sem alterar `garcons`.

### 2. Server functions

**`src/lib/cumins.functions.ts`** (CRUD, espelhando `garcons.functions.ts`), todas com `requireSupabaseAuth` + checagem de `restaurante_id`:
- `listarCuminsFn({ restauranteId })`
- `criarCumimFn({ restauranteId, nome, telefone? })`
- `atualizarCumimFn({ id, nome?, telefone?, ativo? })`
- `removerCumimFn({ id })` (soft delete: `ativo=false`)
- `vincularUsuarioCumimFn({ id, email })` — convite/associa `user_id` (espelha o fluxo existente de vincular usuário ao garçom)

**`src/lib/cumim.functions.ts`** (operacional, para o display):
- `carregarCumimDadosFn()` — resolve o cumim pelo `user_id` logado; retorna `cumim {id, nome, restaurante_id}`, `pedidos_prontos` (mesma forma de `SalaPedidoPronto`), `entregas_turno`, `tempo_medio_entrega_min`, `ultimas_entregas` (10).
- `carregarCumimAdminFn({ cumimId })` — admin enxerga como aquele cumim (read-only).
- `confirmarEntregaCumimFn({ pedidoId })` — UPDATE atômico: `status='entregue'`, `entregue_por_cumim_id`, `entregue_em=now()` WHERE `status='pronto'` AND `restaurante_id=...`.

No `atualizarStatusPedidoFn` existente (usado pelo `/sala`), branch `entregue`: gravar `entregue_por_garcom_id` (garçom do user logado) e `entregue_em`. Cobre o caso "garçom cobriu o cumim". `entregue_por_cumim_id` fica nulo nesse caminho.

### 3. Área do Cumim — rota `/cumim`

`src/routes/_authenticated/cumim.tsx`. Mobile-first. Acesso: usuário cujo `user_id` está em `cumins.ativo=true`. Se for garçom, redireciona para `/sala`. Senão, vai para `/admin`.

**Layout (top → bottom):**

a) **Header fixo** (`<CumimHeader />`, novo):
   - Esquerda: nome do cumim + chip "Runner".
   - Direita: três métricas compactas — **Prontos agora**, **Entregas no turno** (desde 00h local), **Tempo médio de entrega (min)**.
   - Cumim **não tem turno de comissão**, então o painel não exibe abrir/encerrar turno.

b) **Banner de alerta** quando há prato pronto há mais de 5 minutos: tarja vermelha "X prato(s) atrasado(s)" no topo da lista.

c) **Lista única "Pratos prontos para entregar"** — reaproveita `<PratosProntosList />` (zero duplicação visual):
   - Cards com **Mesa**, itens, observações, cronômetro "pronto há N min" e cor de urgência (verde < 2 min, âmbar 2–5 min, vermelho ≥ 5 min — limiares já existentes em `pratos-prontos-list.tsx`).
   - Botão único largura total **"Confirmar entrega"** → `confirmarEntregaCumimFn`. Loading no botão clicado.
   - Estado vazio: card discreto "Nenhum prato pronto. Aguardando a cozinha."

d) **Histórico do turno** (collapsible no rodapé, fechado por padrão): últimas 10 entregas do cumim — Mesa, horário, tempo entre pronto e entregue.

**Realtime e som:**
- Hook `useRealtimeCumim(restauranteId)` (espelho enxuto de `useRealtimeSala`, escutando só `pedidos`). Invalida a query `['cumim-dados']` em mudanças.
- Beep no novo `pronto` reaproveitando o utilitário de `use-notificar-pedido-pronto.ts`.

**Bloqueios:** o cumim só vê pratos prontos. Sem mesas, comandas, chamados, fechamento, cozinha, admin.

### 4. Rota `/admin/cumim` (configuração + cadastro + visualização)

`src/routes/_authenticated/admin/cumim.tsx` — página única, sem abas:

- **Topo:** `Switch` **"Usar função de runner (cumim)"** ligado a `restaurantes.usa_cumim`. Persistido via `atualizarRestauranteFn` (incluir campo no validator). **Toggle mora aqui**, não em `/admin/configuracoes`. Texto auxiliar curto + `Alert` informativo.
- **Desligado:** restante da página esmaecido com mensagem "Ative para cadastrar e acompanhar seus cumins".
- **Ligado:**
  - **Cadastro de cumins** (`<CuminsRoster />`, novo componente em `src/components/admin/cumins/cumins-roster.tsx`, espelhando `garcons-roster.tsx` mas sem campo de comissão):
    - Linha: nome, telefone, status do vínculo de login (sem usuário / convidar / vinculado), botão **Visualizar tela** → `/admin/cumins/$cumimId/display`, botão **Editar**, switch **Ativo**.
    - Botão **Novo cumim** abre dialog com nome + telefone.
    - Dialog **Vincular usuário** com campo e-mail (mesmo fluxo já usado para garçom).
  - **Bloco "Últimas entregas"** (top 10 do restaurante): cumim, mesa, horário (read-only).

### 5. Rota admin de visualização do display do cumim (read-only)

`src/routes/_authenticated/admin/cumins_.$cumimId.display.tsx` — espelha `admin/garcons_.$garcomId.sala.tsx`, mas renderiza o shell de `/cumim` em modo `readOnly` (botão Confirmar entrega desabilitado — já suportado por `PratosProntosList`). Faixa âmbar "Visualizando como X — modo somente leitura" + Voltar para `/admin/cumim`.

### 6. Tela do garçom (`/sala`)

**Nenhuma mudança visual.** Aba "Prontos" permanece para todos — o garçom continua podendo cobrir entregas. Única mudança invisível: `atualizarStatusPedidoFn` passa a gravar `entregue_por_garcom_id` e `entregue_em`. As métricas de "tempo médio" no `/cumim` consideram apenas entregas com `entregue_por_cumim_id IS NOT NULL`; entregas feitas pelo garçom alimentam relatório futuro mas não distorcem o painel do cumim.

### 7. Menu admin

`src/components/admin/admin-sidebar.tsx` — item **"Cumim"** sempre visível, apontando para `/admin/cumim`. A própria página decide o que mostrar conforme `usa_cumim`.

### 8. Login do cumim

Cumins entram pelo mesmo `/login` que garçons. O `beforeLoad` de `/cumim` resolve via `user_id` na tabela `cumins`. Sem alteração no fluxo de login.

## Fora de escopo

- Comissão, bônus, metas e turnos de comissão para cumim.
- Tabela `tarefas_salao` e triggers de limpeza/montagem/retirada.
- Papel `operador` (caixa).
- Estado `em_transporte`.
- Mudanças visuais em `/sala`, `/admin/configuracoes`, `/admin/garcons` ou outras telas.

## Efeito visível

- **`usa_cumim = false`** (default): nada muda. `/admin/cumim` aparece com switch desligado e resto esmaecido. Garçom segue confirmando pela aba "Prontos". `entregue_por_garcom_id`/`entregue_em` já passam a ser gravados (base para relatórios).
- **`usa_cumim = true`**: admin cadastra cumins em `/admin/cumim` (nome, telefone, vínculo de login). O cumim faz login e entra em `/cumim` — tela enxuta, mobile, só com pratos prontos, timer, urgência colorida, métricas no header, alerta de atrasos, beep e histórico recolhível. Admin acompanha em `/admin/cumim` (cadastro + últimas entregas) e pode espiar a tela de qualquer cumim em modo somente leitura. Garçom **continua** com a aba "Prontos" disponível para cobrir.
