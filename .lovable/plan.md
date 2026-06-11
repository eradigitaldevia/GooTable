# Plano — Prévia ao vivo no drawer (aba Identidade)

## Objetivo

Substituir o botão **"Abrir prévia completa"** (que abre `/admin/cardapio-preview` em nova aba) por um **drawer lateral** que renderiza a prévia do cardápio usando as cores **atuais do formulário** (ainda não salvas), com feedback instantâneo a cada ajuste.

## Decisões confirmadas

1. **Remover** o mini-preview embutido (`PreviewAmostra`).
2. Renderizar a prévia **apenas em mobile (390px)** — caso real de uso do cardápio do cliente. Sem toggle de dispositivo.
3. **Manter** a rota `/admin/cardapio-preview` intacta (acessível pelo menu, útil para inspeção/QR/compartilhar). Continua com seu próprio toggle de dispositivo — não é alterada.
4. **Mobile do admin**: drawer **full-screen**.

## Mudanças

### 1. Novo componente de conteúdo da prévia (escopo do drawer)

**Novo:** `src/components/configuracoes/identidade/preview-cardapio-mobile.tsx`
- Recebe `restauranteId` e override de tema (`cor_primaria`, `cor_secundaria`, `cor_acento`, `tema_cardapio`).
- Renderiza o mesmo cardápio público que `/admin/cardapio-preview` usa, **fixo em 390px de largura** (frame mobile centralizado), sem toggle.
- Usa `TemaCardapioProvider` com as cores override → reflete mudanças não salvas em tempo real.

Não vou refatorar `/admin/cardapio-preview` — ela permanece como está (escopo mínimo).

### 2. Drawer na aba Identidade

**Novo:** `src/components/configuracoes/identidade/preview-drawer.tsx`
- Usa `Sheet` do shadcn (`side="right"`).
- Largura: `w-full sm:max-w-md` (cabe um frame mobile de 390px confortavelmente; full-screen no mobile do admin).
- Conteúdo: `<PreviewCardapioMobile restauranteId={...} {...overrideCores} />`.

### 3. Atualizar `IdentidadeForm`

`src/components/configuracoes/identidade-form.tsx`:
- Remover import/uso de `PreviewAmostra` e a seção "Amostra" completa (título, descrição e nota sobre "salve antes de abrir").
- Substituir o botão `window.open(...)` por **"Ver prévia ao vivo"** que abre o `PreviewDrawer`.
- Estado local `previewOpen` controla o drawer.

### 4. `PreviewAmostra` (arquivo morto)

Após remover o uso, deletar `src/components/configuracoes/identidade/preview-amostra.tsx` para não deixar código órfão.

## Arquivos afetados

**Novos:**
- `src/components/configuracoes/identidade/preview-cardapio-mobile.tsx`
- `src/components/configuracoes/identidade/preview-drawer.tsx`

**Editados:**
- `src/components/configuracoes/identidade-form.tsx`

**Removido:**
- `src/components/configuracoes/identidade/preview-amostra.tsx`

## Fora de escopo

- Não toco em `/admin/cardapio-preview`, `TemaCardapioProvider`, `cor-utils`, paletas, validação, salvar/hook/backend, outras abas, menu admin.

## Risco

- **Performance**: drawer só monta quando aberto. Mudanças de cor não disparam refetch — só re-render do provider (CSS vars).
- **Isolamento**: override é passado por props ao `TemaCardapioProvider`; o cache de cardápio público não é afetado.
