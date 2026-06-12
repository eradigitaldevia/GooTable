## Análise

No mobile (390 px) em `/admin/configuracoes`, dois conjuntos de abas têm o mesmo defeito:

### A) Abas principais (`Configuracoes`) — 6 abas

`src/routes/_authenticated/admin/configuracoes.tsx`, linha 533:

```tsx
<TabsList className="flex w-full flex-wrap justify-start gap-1">
```

Com `flex-wrap` e rótulos de larguras diferentes (ex.: "Taxas e couverts" vs "Caixa"), as 6 abas quebram em linhas irregulares (3+2+1), sem alinhamento.

### B) Abas de paleta (`PaletasTabs`) — 3 abas

`src/components/configuracoes/identidade/paletas-tabs.tsx`, linha ~62:

```tsx
<TabsList className="flex w-full flex-wrap justify-start gap-1">
  <TabsTrigger value="prontas">Paletas prontas</TabsTrigger>
  <TabsTrigger value="gerar">Gerar da minha cor</TabsTrigger>
  <TabsTrigger value="manual">Cores manuais</TabsTrigger>
</TabsList>
```

Mesma situação: três rótulos longos e desiguais que quebram em 2+1.

### C) Sobreposição com a seção "Identidade"

O `<Tabs>` pai (linha 529 de `configuracoes.tsx`) não tem `gap`/`space-y`, então a `TabsList` cresce em altura ao quebrar e visualmente cola no topo do cartão `<IdentidadeForm />` (que tem `rounded-2xl border p-6`).

## Proposta (somente UI, escopo mínimo)

### 1) `configuracoes.tsx` — abas em grade 2×3 no mobile

Linha 533 — trocar:

```tsx
<TabsList className="flex w-full flex-wrap justify-start gap-1">
```

por:

```tsx
<TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:justify-start">
```

Linha 544 — em `TabsTrigger`:

```tsx
<TabsTrigger key={id} value={id} className="w-full sm:w-auto">
```

Resultado: mobile = grade 2×3 alinhada; ≥640 px = comportamento atual.

### 2) `configuracoes.tsx` — respiro entre TabsList e conteúdo

Linha 529 — adicionar `className="space-y-4"` no `<Tabs>`:

```tsx
<Tabs
  value={tab}
  onValueChange={(v) => navigate({ search: { tab: v as TabId } })}
  className="space-y-4"
>
```

Elimina a sensação de sobreposição entre a barra de abas e o cartão da Identidade (e demais).

### 3) `paletas-tabs.tsx` — 3 abas em grade no mobile

Linha ~62 — trocar:

```tsx
<TabsList className="flex w-full flex-wrap justify-start gap-1">
```

por:

```tsx
<TabsList className="grid h-auto w-full grid-cols-3 gap-1 sm:flex sm:flex-wrap sm:justify-start">
```

E em cada `TabsTrigger`:

```tsx
<TabsTrigger value="prontas" className="w-full sm:w-auto">Paletas prontas</TabsTrigger>
<TabsTrigger value="gerar" className="w-full sm:w-auto">Gerar da minha cor</TabsTrigger>
<TabsTrigger value="manual" className="w-full sm:w-auto">Cores manuais</TabsTrigger>
```

Resultado: mobile = 3 abas lado a lado, mesma largura e altura, sem quebra; ≥640 px = comportamento atual. O texto pode ficar mais apertado em 390 px, mas legível (cabe em uma linha em cada coluna ≈ 120 px).

Observação técnica: o `TabsList` shadcn fixa `h-10`. A classe `h-auto` é necessária para grades que ocupam mais de uma linha (caso A); no caso C (1 linha) é inócuo mas mantém consistência.

## Fora de escopo

- Não renomear rótulos.
- Não alterar cores, tipografia, espaçamentos internos dos cartões.
- Não tocar no componente shadcn `Tabs` nem em outras páginas.
- Não modificar o conteúdo das abas (`IdentidadeForm`, `PaletaPicker`, etc.).

&nbsp;

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.