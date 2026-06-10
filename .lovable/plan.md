## Repasse de Couvert Artístico — rota única com abas

Substituir as duas rotas separadas (`/admin/artistas` e `/admin/apresentacoes`) por uma única rota **`/admin/couvert-artistico`** com 3 abas.

### 1) Rota e navegação

Nova rota: `src/routes/_authenticated/admin/couvert-artistico.tsx`

Layout com `Tabs` (shadcn) controladas via search param `?tab=artistas|apresentacoes|repasses` (assim links externos e refresh preservam a aba):

- **Aba "Artistas"** — CRUD de artistas/músicos cadastrados.
- **Aba "Apresentações"** — abrir, encerrar, listar apresentações e configurar artistas + pesos.
- **Aba "Repasses"** — listar repasses gerados, filtrar por período/artista, marcar como pago.

Link no menu admin: **"Couvert artístico"** (ícone Music). Aparece somente quando `couvert_artistico_habilitado = true` nas configurações do restaurante.

### 2) Configuração (Configurações → Couvert)

No `CouvertForm`, dentro do bloco "Couvert artístico" (quando habilitado), adicionar sub-bloco **"Repasse aos artistas"**:
- Switch `couvert_artistico_repasse_habilitado`
- Input `couvert_artistico_repasse_percentual` (0–100, default 100)
- Texto auxiliar e link "Gerenciar artistas e apresentações →" apontando para `/admin/couvert-artistico`.

Novas colunas em `restaurantes`:
- `couvert_artistico_repasse_habilitado boolean default false`
- `couvert_artistico_repasse_percentual numeric(5,2) default 100`

### 3) Schema

**`artistas`** — `id`, `restaurante_id`, `nome`, `documento` (opc.), `chave_pix` (opc.), `tipo_chave_pix`, `observacao`, `ativo`, timestamps. RLS `rw_membro` + GRANTs.

**`apresentacoes`** — `id`, `restaurante_id`, `nome`, `inicio_em`, `fim_em` (NULL = aberta), `encerrada_por`, `criada_por`, timestamps. Índice parcial único `(restaurante_id) where fim_em is null` (1 apresentação aberta por restaurante).

**`apresentacao_artistas`** — `id`, `apresentacao_id`, `artista_id`, `peso numeric(5,2)`. Unique `(apresentacao_id, artista_id)`. Validação no serverFn: soma de pesos = 100 (±0.01); ao menos 1 artista.

**Alteração em `comanda_couverts`** — adicionar `apresentacao_id uuid NULL`. Trigger `BEFORE INSERT` quando `tipo='artistico'` busca a apresentação aberta do restaurante e popula. Sem apresentação aberta → fica NULL (não bloqueia a cobrança).

**`repasses_couvert_artistico`** — `id`, `restaurante_id`, `apresentacao_id`, `artista_id`, `valor_couvert_total`, `percentual_repasse`, `peso`, `valor_repasse`, `status` (`pendente|pago`), `calculado_em`, `pago_em`, `pago_por`. Unique `(apresentacao_id, artista_id)`. RLS + GRANTs.

### 4) Funções SQL

- `gerar_repasse_couvert_artistico(p_apresentacao_id)` — soma `comanda_couverts.valor_total` (tipo=artistico, mesma apresentação), multiplica por `percentual_repasse`, distribui por peso, `INSERT … ON CONFLICT DO UPDATE` (idempotente).
- `pagar_repasses_couvert_artistico(_ids uuid[])` — marca `status='pago'`, registra `pago_em/pago_por`.

**Gatilho:** ação "Encerrar apresentação" → serverFn `encerrarApresentacaoFn` faz `update fim_em = now()` + chama `gerar_repasse_couvert_artistico`.

### 5) UI da rota — componentes

`src/components/couvert-artistico/`:
- `artistas-tab.tsx` — tabela + dialog de criar/editar artista.
- `apresentacoes-tab.tsx` — lista (aberta destacada no topo); botão "Abrir apresentação" abre dialog com seleção de artistas e pesos (default igualitário, ajustável; validação 100%); botão "Encerrar" na apresentação aberta com confirmação.
- `repasses-tab.tsx` — tabela de repasses com filtros (período, artista, status), checkboxes para marcar como pago em lote (reusando padrão visual de `comissoes-panel.tsx`).

UI `LancarCouvertDialog`: quando tipo=artístico e não há apresentação aberta, exibir aviso amarelo "Nenhuma apresentação ativa — o repasse não será gerado" (não bloqueia).

### 6) Relatórios

`relatorios.functions.ts` + `relatorios-export.ts`: adicionar seção/coluna "Repasse couvert artístico" agrupado por artista no período (CSV + PDF).

### 7) Fora de escopo

- Repasse parcial por pagamento (somente no encerramento da apresentação).
- Retenção fiscal/INSS.
- Couvert de mesa não gera repasse (100% casa).

### Arquivos

**Migrations:**
- Colunas em `restaurantes` (repasse habilitado + %)
- `artistas`
- `apresentacoes` + `apresentacao_artistas`
- `alter comanda_couverts` + trigger
- `repasses_couvert_artistico` + funções `gerar_repasse_couvert_artistico` e `pagar_repasses_couvert_artistico`

**Backend:**
- `src/lib/configuracoes.functions.ts` (campos novos)
- `src/lib/artistas.functions.ts` (novo)
- `src/lib/apresentacoes.functions.ts` (novo)
- `src/lib/repasses-couvert.functions.ts` (novo — listar/pagar)
- `src/lib/relatorios.functions.ts` + `relatorios-export.ts`

**Frontend:**
- `src/components/configuracoes/couvert-form.tsx` (sub-bloco repasse)
- `src/components/sala/lancar-couvert-dialog.tsx` (aviso sem apresentação)
- `src/routes/_authenticated/admin/couvert-artistico.tsx` (rota com tabs)
- `src/components/couvert-artistico/{artistas-tab,apresentacoes-tab,repasses-tab}.tsx`
- Menu admin: adicionar entrada condicional
- `src/integrations/supabase/types.ts` (regenerado)
