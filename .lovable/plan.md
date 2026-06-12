## Objetivo

Dois ajustes pontuais na página **Configurações**:

1. Na aba **Identidade**, o seletor de paletas deve abrir já na aba que corresponde à cor atualmente definida.
2. Na aba **Cardápio**, deixar claro **onde** são definidos os itens que aparecem como sugestão de acompanhamentos (upsell).

Sem persistência da origem da paleta, sem mudanças visuais, sem alterações de backend ou regras de negócio.

## Mudanças propostas

### 1. `src/components/configuracoes/identidade/paletas-tabs.tsx` — aba inicial reflete a fonte da cor

- Hoje o componente usa `defaultValue="prontas"`, abrindo sempre em "Paletas prontas".
- Alterar para calcular a aba inicial **uma única vez na montagem**, via `useState(() => ...)`:
  - Se as cores atuais (`corPrimaria`/`corSecundaria`/`corAcento` + `tema`) **coincidirem com algum preset** de `PALETAS_PRESETS` → abrir em `"prontas"`.
  - Caso contrário → abrir em `"manual"` (cobre tanto cores manuais quanto cores geradas; a aba "Gerar da minha cor" não é selecionável automaticamente porque a origem não é persistida).
- Reaproveitar a mesma comparação já usada para `paletaAtivaId` (case-insensitive nas três cores + tema).
- Manter `defaultValue` (não controlado), para o usuário poder navegar livremente entre as abas depois.

### 2. `src/routes/_authenticated/admin/configuracoes.tsx` — explicar origem dos itens de upsell

- Abaixo do texto explicativo atual do switch **"Sugestão de acompanhamentos no carrinho"**, adicionar um parágrafo `text-xs text-muted-foreground` com o seguinte conteúdo:

  > "Os itens sugeridos são os produtos marcados com **'Sugerir no carrinho (upsell)'** no cadastro do produto (aba **Cardápio** → editar produto). Sem itens marcados, o sistema completa automaticamente com bebidas, sobremesas e itens populares."

- Sem alterar o switch, o estado, o hook ou o comportamento atual.

## Arquivos afetados

- `src/components/configuracoes/identidade/paletas-tabs.tsx`
- `src/routes/_authenticated/admin/configuracoes.tsx`

## Fora de escopo

- Persistir / lembrar qual aba (prontas / gerar / manual) originou a cor (descartado por baixo ROI).
- Mudanças visuais, de tokens, layout ou textos fora dos dois pontos acima.
- Alterações em `upsell.ts`, no cadastro de produto, no cardápio público ou em qualquer regra de negócio.
- Mudanças de schema, migrations ou server functions.
