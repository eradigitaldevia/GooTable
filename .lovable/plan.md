## Objetivo

Adicionar um gerador de paletas a partir de uma cor primária digitada pelo usuário, sem alterar as paletas prontas existentes nem o formulário manual de cores.

## UX

Na seção "Paletas prontas" da aba **Identidade**, substituir o título por um **toggle de 2 opções** acima da grade:

```
[ Paletas prontas ]  [ Gerar da minha cor ]
```

- **Paletas prontas** (default): mostra a grade atual com os 8 presets (`PALETAS_PRESETS`). Comportamento idêntico ao de hoje.
- **Gerar da minha cor**: mostra um campo de cor (color picker + input hex) + grade com **8 paletas geradas** (4 esquemas harmônicos × 2 temas: claro e escuro).

A seção "Tema do cardápio" (toggle Claro/Escuro) e os 3 campos manuais (Primária / Secundária / Acento) continuam intactos.

## Esquemas gerados

A partir da cor digitada (convertida HSL), gera 4 esquemas com `{cor_primaria, cor_secundaria, cor_acento}`:

| Esquema | Secundária (matiz) | Acento (matiz) |
|---|---|---|
| **Análoga** | hue +30° | hue −30° |
| **Complementar** | hue +180° | hue +30° |
| **Triádica** | hue +120° | hue +240° |
| **Monocromática** | mesmo hue, S/L ajustados | mesmo hue, S/L ajustados |

Para cada esquema gera **2 variantes** (`tema: "claro"` e `tema: "escuro"`), ajustando saturação/luminosidade das cores secundária e acento conforme o tema, para garantir legibilidade.

Total: **8 cards** na grade (mesmo layout `grid-cols-2 sm:grid-cols-4` do picker atual).

Cada card mostra: stripe das 3 cores + nome do esquema + sufixo do tema (ex.: "Análoga — Claro").

## Arquivos afetados

### Novo: `src/lib/paleta-generator.ts`
Funções puras:
- `hexToHsl(hex) → {h, s, l}`
- `hslToHex({h, s, l}) → string`
- `gerarPaletas(corPrimaria: string): PaletaPreset[]` — retorna 8 paletas (4 esquemas × 2 temas), com `id` único do tipo `gen-analoga-claro`, `nome`, `descricao`, `tema`, `cor_primaria`, `cor_secundaria`, `cor_acento`. Reusa o tipo `PaletaPreset` existente.

### Novo: `src/components/configuracoes/identidade/paleta-gerador.tsx`
- Estado local: cor digitada (default = `corPrimaria` recebida via prop).
- Campo: `<input type="color">` + `<Input>` hex (mesmo padrão de `CampoCor`).
- Chama `gerarPaletas(cor)` e renderiza o `<PaletaPicker>` existente passando as paletas geradas + `selecionadaId` calculado por comparação de hex+tema (mesma lógica de `paletaAtivaId`).
- `onSelect` propaga para o `onChange` do `IdentidadeForm`.

### Edit: `src/components/configuracoes/identidade/paleta-picker.tsx`
Aceitar prop opcional `paletas?: PaletaPreset[]` (default: `PALETAS_PRESETS`). Sem mudança visual ou comportamental.

### Edit: `src/components/configuracoes/identidade-form.tsx`
- Adicionar estado local `modoPaleta: "prontas" | "gerar"` (default `"prontas"`).
- Renderizar toggle (mesmo padrão visual do toggle Claro/Escuro em `CoresForm`, com `inline-flex rounded-lg border bg-muted/40 p-1`).
- Conforme o modo, renderizar `<PaletaPicker>` (paletas prontas) ou `<PaletaGerador>`.
- `onSelect` de ambos chama o mesmo `onChange` (já existe).

## Detalhes técnicos

- Tudo no frontend, sem backend nem nova dependência.
- Conversões HSL ↔ hex implementadas manualmente em `paleta-generator.ts` (algoritmo padrão, sem libs).
- Para o tema **escuro**, secundária/acento usam L mais alto (cores claras sobre fundo escuro); para o **claro**, L mais baixo. Saturação ajustada para evitar cores lavadas demais.
- Validação: se hex digitado for inválido (`isValidHex` de `cor-utils.ts`), grade não renderiza (mostra mensagem curta "Digite uma cor válida em hex").
- O `selecionadaId` no modo "gerar" só destaca um card se as 3 cores + tema atualmente no form baterem exatamente com uma paleta gerada — caso contrário, nenhum card fica destacado (idêntico ao comportamento atual).

## Fora de escopo

- Mudanças nas paletas prontas (`PALETAS_PRESETS`) ou no `CoresForm`.
- Persistência da cor digitada (estado puramente local; reseta ao trocar de aba).
- Geração de mais de 4 esquemas ou variantes além de claro/escuro.
- Validação WCAG nas paletas geradas (avisos de contraste em `CoresForm` continuam cobrindo após aplicação).
- Mudanças no preview, no backend ou na lógica de salvar.

## Riscos

- Paletas geradas podem ocasionalmente ter contraste fraco — o aviso existente em `CoresForm` cobre esse caso após aplicação.
- 8 cards em telas pequenas (mobile) usam 2 colunas → 4 linhas; aceitável e consistente com a grade atual.
