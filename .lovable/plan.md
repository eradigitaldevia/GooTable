## Objetivo

Reorganizar a seleção de cores em **3 abas** (Paletas prontas / Gerar da minha cor / Cores manuais) acima da seção "Tema do cardápio". A seção "Tema do cardápio" mantém o **toggle Claro/Escuro** (controle único do tema) e ganha **swatches do estado atual + mini-prévia + avisos de contraste**. Os 3 campos manuais de cor (Primária/Secundária/Acento) saem dali e vão para a nova aba "Cores manuais".

## UX

```
┌─ Identidade ───────────────────────────────────────┐
│  Logo  |  Nome do restaurante                       │
│                                                     │
│  Cores                                              │
│  [ Paletas prontas ] [ Gerar da minha cor ] [ Cores manuais ]
│  ┌─ conteúdo da aba ativa ─────────────────────┐    │
│  │ Paletas prontas → grade de presets          │    │
│  │ Gerar           → input cor + grade gerada  │    │
│  │ Cores manuais   → 3 campos editáveis        │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ── Tema do cardápio ──                            │
│  Tema: ( ☀ Claro )( 🌙 Escuro )    ← único editor  │
│                                                     │
│  Swatches:  [Primária] [Secundária] [Acento]       │
│             #c2410c    #1f2937      #f59e0b        │
│                                                     │
│  ┌─ Mini-prévia ─────────────┐                     │
│  │ Header (cor primária)     │                     │
│  │ Item de exemplo • R$ 24   │                     │
│  │ [ Adicionar ] badge       │                     │
│  └───────────────────────────┘                     │
│                                                     │
│  ⚠ Avisos de contraste (se houver)                 │
└─────────────────────────────────────────────────────┘
```

### Comportamento
- **Tema** é editado apenas no toggle da seção "Tema do cardápio".
- Clicar num **preset** ou numa **paleta gerada** aplica o tema do card (sobrescreve o toggle) — mesmo comportamento de hoje.
- Aba **Cores manuais**: edita só as 3 cores. Não tem toggle de tema (o tema vigente continua sendo o do toggle abaixo).
- A seção abaixo do tema mostra **sempre** o estado atual (swatches + mini-prévia), independente da aba ativa.

## Arquivos afetados

### Edit: `src/components/configuracoes/identidade-form.tsx`
- Substituir o bloco atual (paletas prontas + gerador via `modoPaleta`) por `<PaletasTabs>`.
- Substituir o atual `<CoresForm>` por `<TemaCardapioSecao>`.
- Remover estado local `modoPaleta` (vira estado interno do `PaletasTabs`).
- Arquivo fica curto (~80 linhas): logo + nome + `<PaletasTabs>` + `<TemaCardapioSecao>` + botão prévia + `<PreviewDrawer>`.

### Novo: `src/components/configuracoes/identidade/paletas-tabs.tsx`
- `Tabs` (shadcn) com 3 abas: `prontas` / `gerar` / `manual`.
- Conteúdo:
  - `prontas`: `<PaletaPicker>` existente (presets).
  - `gerar`: `<PaletaGerador>` existente.
  - `manual`: novo `<CoresManuaisForm>`.
- Recebe `corPrimaria`, `corSecundaria`, `corAcento`, `tema`, `onChange` por prop.

### Novo: `src/components/configuracoes/identidade/cores-manuais-form.tsx`
- 3 `CampoCor` (Primária / Secundária / Acento), extraídos do atual `cores-form.tsx`.
- Sem toggle de tema, sem avisos.

### Novo: `src/components/configuracoes/identidade/tema-cardapio-secao.tsx`
- Toggle Claro/Escuro (mesmo visual do atual em `cores-form.tsx`).
- Swatches grandes: 3 quadrados com label (Primária/Secundária/Acento) + hex.
- Renderiza `<MiniPrevia>` internamente.
- Avisos WCAG abaixo (reusa `foregroundOn` / `passesAA` de `cor-utils.ts`).

### Novo: `src/components/configuracoes/identidade/mini-previa.tsx`
- Card pequeno (~80 linhas), puramente apresentacional.
- Simula header + 1 item de produto + botão + badge, usando as cores via `style={{ backgroundColor }}` (cores são dados do form, não tokens — exceção justificada).
- Fundo conforme tema: `#fafafa` claro / `#18181b` escuro.

### Delete (após verificar referências): `src/components/configuracoes/identidade/cores-form.tsx`
- Se ninguém mais importar, deletar. Verificar com `rg "cores-form"` antes.

## Detalhes técnicos

- `Tabs` do shadcn já é usado em `configuracoes.tsx` — padrão consistente.
- Nenhuma mudança no backend, no payload `salvar`, no `abasSujas`, no `snapshot` ou no guard de alterações não salvas.
- `<MiniPrevia>` recebe as cores como props e renderiza em tempo real conforme o usuário edita (já que `form` é estado controlado).

## Fora de escopo

- Mudanças nas paletas prontas, no gerador, ou nas conversões HSL.
- Mudanças no `PreviewDrawer` ("Ver prévia ao vivo" continua igual).
- Mudanças no backend, schema, validações, ou fluxo de upload de logo.

## Riscos (mitigados)

- **Tamanho de arquivo**: extração de 4 componentes (`PaletasTabs`, `CoresManuaisForm`, `TemaCardapioSecao`, `MiniPrevia`) mantém cada arquivo bem abaixo de 150 linhas.
- **Confusão sobre onde editar tema**: eliminada — toggle único na seção dedicada, abas só editam cores.
