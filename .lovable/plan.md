# Plano — Personalização visual do cardápio (aba Identidade)

## Contexto (o que existe hoje)

- A aba Identidade salva `nome`, `logo_url` e `cor_primaria`.
- A `cor_primaria` é lida pelo cardápio público (`cardapio-publico.functions.ts`), mas **não é aplicada em lugar nenhum** — o cardápio do cliente usa o tema padrão do app (laranja `--primary`).
- A personalização atual é, na prática, inoperante.

## Objetivo

Permitir que o admin defina cor primária, secundária, cor de acento e tema (claro/escuro) — e que isso seja efetivamente aplicado no cardápio do cliente (`/m/$qrToken/*`) e na rota de pré-visualização (`/admin/cardapio-preview`). Sem afetar o restante do app admin.

## Decisões já validadas com o usuário

- Tematização **completa** (header + acentos + cards/bordas/hover).
- Tema **claro ou escuro**, escolha do admin.
- **Primária + paletas pré-definidas** (admin pode usar uma paleta pronta ou ajustar as 3 cores manualmente).
- Preview por **botão "Abrir prévia"** que abre `/admin/cardapio-preview` em nova aba (reaproveita rota existente, sem mini-preview embutido).

## Mudanças propostas

### 1. Banco (1 migration)

Adicionar à tabela `restaurantes`:

- `cor_secundaria text` (default `#1f2937`)
- `cor_acento text` (default `#f59e0b`)
- `tema_cardapio text not null default 'claro'` + CHECK (`'claro'`, `'escuro'`)

GRANTs e RLS já cobrem (colunas novas na tabela existente).

### 2. Backend (`src/lib/configuracoes.functions.ts`)

No ramo `identidade` do discriminated union, adicionar os 3 campos novos com validação:

- Cores: `z.string().regex(/^#[0-9a-fA-F]{6}$/)`
- Tema: `z.enum(['claro','escuro'])`

Mapear para o `TablesUpdate<"restaurantes">` no `switch`.

### 3. Backend público (`src/lib/cardapio-publico.functions.ts`)

Incluir `cor_secundaria, cor_acento, tema_cardapio` no `SELECT` do restaurante e no tipo `RestaurantePublico`.

### 4. Provider de tema do cardápio (novo)

- `src/components/cliente/tema-cardapio-provider.tsx`: recebe as 3 cores + tema e injeta CSS variables (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--accent`, `--card`, `--border`, `--muted`, …) **só na sua subárvore**, via `style={{ ...vars }}`. Não toca no tema global.
- `src/lib/cor-utils.ts`: utilidades puras para
  - converter hex → OKLCH (formato dos tokens do projeto),
  - calcular `foreground` por contraste (preto/branco conforme luminância),
  - derivar tonalidades (`hover`, `muted`, `border`) a partir da primária.

Como os componentes do cliente já usam `bg-primary`, `text-primary-foreground`, `bg-background`, `border-border` etc., basta sobrescrever as CSS vars no escopo — **zero alteração nos componentes filhos**.

### 5. Aplicação do provider

Envolver o conteúdo de:

- `src/routes/m.$qrToken.tsx`
- `src/routes/m.$qrToken_.carrinho.tsx`
- `src/routes/m.$qrToken_.conta.tsx`
- `src/routes/m.$qrToken_.minha-conta.tsx`
- `src/routes/m.$qrToken_.status.$pedidoId.tsx`
- `src/routes/_authenticated/admin/cardapio-preview.tsx`

com `<TemaCardapioProvider restaurante={...}>` no nível mais externo do JSX.

### 6. Frontend da aba Identidade

Refatorar `src/components/configuracoes/identidade-form.tsx` (hoje 104 linhas) extraindo subcomponentes para respeitar o limite de 150 linhas:

- `src/components/configuracoes/identidade/paleta-presets.ts` — dados das paletas (ex.: *Clássica*, *Sunset*, *Ocean*, *Forest*, *Wine*, *Monocromática*; cada uma com `{ primaria, secundaria, acento }`).
- `src/components/configuracoes/identidade/paleta-picker.tsx` — grid de cartões de paleta com swatches; ao clicar, popula os 3 campos de cor.
- `src/components/configuracoes/identidade/cores-form.tsx` — 3 color pickers (primária / secundária / acento) + toggle `claro/escuro` + aviso de contraste WCAG AA não bloqueante.
- `src/components/configuracoes/identidade/preview-amostra.tsx` — amostra estática local (botão, chip de categoria, mini-card) mostrando combinação atual sem precisar abrir a prévia.
- Botão **"Abrir prévia do cardápio"** que faz `window.open('/admin/cardapio-preview', '_blank')`.

Logo e nome continuam exatamente como estão.

### 7. Tela `configuracoes.tsx` (mínimo necessário)

- `formInicial` e hidratação ganham os 3 novos campos.
- O array `tabFields.identidade` (linha 233) passa a incluir `cor_secundaria`, `cor_acento`, `tema_cardapio` — assim a bolinha de "alterações não salvas" continua funcionando corretamente.
- O `salvar('identidade', ...)` (linha 334) inclui os novos campos.
- Nenhuma outra aba é tocada.

### 8. Hook (`src/hooks/use-configuracoes.ts`)

O `ConfigPayload['identidade']` ganha os 3 campos opcionais novos. Nenhuma outra ramificação muda.

## Arquivos afetados (lista fechada)

Novos:

```
supabase/migrations/<timestamp>_restaurantes_tema_cardapio.sql
src/lib/cor-utils.ts
src/components/cliente/tema-cardapio-provider.tsx
src/components/configuracoes/identidade/paleta-presets.ts
src/components/configuracoes/identidade/paleta-picker.tsx
src/components/configuracoes/identidade/cores-form.tsx
src/components/configuracoes/identidade/preview-amostra.tsx
```

Editados:

```
src/lib/configuracoes.functions.ts            (ramo 'identidade')
src/lib/cardapio-publico.functions.ts         (SELECT + tipo)
src/hooks/use-configuracoes.ts                (tipo do payload)
src/components/configuracoes/identidade-form.tsx  (orquestrador enxuto)
src/routes/_authenticated/admin/configuracoes.tsx (formInicial, tabFields, salvar)
src/routes/m.$qrToken.tsx                     (envolver com provider)
src/routes/m.$qrToken_.carrinho.tsx           (envolver com provider)
src/routes/m.$qrToken_.conta.tsx              (envolver com provider)
src/routes/m.$qrToken_.minha-conta.tsx        (envolver com provider)
src/routes/m.$qrToken_.status.$pedidoId.tsx   (envolver com provider)
src/routes/_authenticated/admin/cardapio-preview.tsx (envolver com provider)
```

## Riscos e mitigações

- **Contraste ruim** (texto ilegível sobre cor escolhida): `foreground` calculado automaticamente por luminância + aviso visual WCAG AA não bloqueante na própria aba.
- **Vazamento do tema para o admin**: provider escopa via `style` na subárvore — `cor-utils` é puro, sem efeitos globais.
- **Tema escuro com paleta clara (ou vice-versa)**: tokens de `background/card/border/muted` derivados do tema, não da cor primária; primária só fornece o acento.
- **Compat com tema atual**: defaults das colunas novas reproduzem o visual de hoje (`#1f2937` / `#f59e0b` / `claro`), então restaurantes existentes não mudam até o admin editar.
- **Cache**: `useCardapioPublico` é invalidado por `queryKeys.cardapioPublico` ao salvar — o cliente vê a nova cor no próximo refetch (mesmo comportamento já em vigor para `nome`/`logo_url`).

## Fora de escopo (não vou fazer)

- Fontes customizadas, imagem de capa/banner, modo automático por horário.
- Mudar layout/estrutura do cardápio do cliente.
- Aplicar tema do restaurante em qualquer tela do admin.
- Alterações em outras abas da página de configurações.