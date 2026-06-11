
# Opção B — Salvar por aba (slice) + indicador de "alterações não salvas"

## Objetivo

Cada aba passa a ter ciclo de vida independente: o botão **Salvar** de uma aba persiste **apenas** os campos daquela aba. Em seguida, exibir um indicador visual (•) no rótulo das abas que possuem alterações ainda não salvas.

## Escopo

- Refatorar o servidor (`atualizarConfiguracoesFn`) para aceitar payload parcial por aba.
- Refatorar o hook (`useAtualizarConfiguracoes`) para refletir o novo contrato.
- Refatorar `salvar(aba)` em `configuracoes.tsx` para enviar somente o slice da aba.
- Adicionar snapshot por aba + diff para sinalizar abas "sujas" no `TabsList`.

## Fora do escopo

- Mudanças visuais nas abas (layout, cores, espaçamento).
- Mudanças em qualquer outro arquivo (componentes filhos `IdentidadeForm`, `PixForm`, `TaxaServicoForm`, `CouvertForm`, `ComissaoModoForm`).
- Mudanças no banco de dados (sem migração).
- Mudanças em outras telas, hooks ou rotas.

## Mapeamento dos slices por aba

| Aba | Campos persistidos |
|---|---|
| `identidade` | `nome`, `cor_primaria`, `logo_url` |
| `pagamentos` | `pix_habilitado`, `pix_chave`, `pix_nome_titular` |
| `taxas` | `taxa_servico_habilitada`, `taxa_servico_percentual`, `taxa_servico_descricao`, `taxa_servico_repasse_habilitado`, `taxa_servico_repasse_percentual`, `couvert_mesa_habilitado`, `couvert_mesa_valor`, `couvert_mesa_descricao`, `couvert_artistico_habilitado`, `couvert_artistico_valor`, `couvert_artistico_descricao`, `couvert_artistico_repasse_habilitado`, `couvert_artistico_repasse_percentual` |
| `comissoes` | `comissao_modo`, `comissao_rateio_troca_turno`, `comissao_pedido_cliente`, `comissao_pedido_cliente_percentual`, `permitir_atendimento_cruzado` |
| `caixa` | `caixa_alerta_horas`, `caixa_teto_dinheiro`, `caixa_conferencia_cega`, `caixa_obrigatorio_para_pagamento` |
| `cardapio` | `upsell_habilitado` |

Todas as validações cruzadas existentes são **intra-slice** (PIX ↔ chave; taxa ↔ repasse de taxa; couvert artístico ↔ repasse de couvert). Nada cruza abas. Confirmado lendo `atualizarConfiguracoesFn`.

## Implementação

### 1. Servidor — `src/lib/configuracoes.functions.ts`

Substituir o `configSchema` único por um `z.discriminatedUnion("aba", [...])`:

- `aba: "identidade"` → `restauranteId` + campos de identidade.
- `aba: "pagamentos"` → `restauranteId` + campos PIX.
- `aba: "taxas"` → `restauranteId` + campos de taxa e couverts.
- `aba: "comissoes"` → `restauranteId` + campos de comissão.
- `aba: "caixa"` → `restauranteId` + campos de caixa.
- `aba: "cardapio"` → `restauranteId` + `upsell_habilitado`.

No `.handler()`:
- `assertAcessoRestaurante(...)` permanece igual.
- `switch(data.aba)` monta o objeto de `UPDATE` apenas com as colunas do slice.
- Mantém as validações de negócio existentes, mas **apenas as do slice**:
  - `pagamentos`: PIX habilitado exige chave.
  - `taxas`: regras de taxa/couvert/repasse (idênticas às atuais; todas intra-slice).
- `.update({...})` envia somente as colunas do slice → preserva os demais campos no banco.

### 2. Hook — `src/hooks/use-configuracoes.ts`

Substituir o tipo `ConfigPayload` único por uma união discriminada `ConfigPayload = IdentidadePayload | PagamentosPayload | TaxasPayload | ComissoesPayload | CaixaPayload | CardapioPayload`, todos com `restauranteId` + `aba` + campos do slice.

`useAtualizarConfiguracoes` mantém a mesma assinatura externa; muda apenas o tipo do `data`.

### 3. Frontend — `src/routes/_authenticated/admin/configuracoes.tsx`

Refatorar `salvar(aba, overrides?)`:

- Validações por aba: manter as atuais (já estão segregadas).
- Remover toda a lógica de `parseSilent(...)` (não é mais necessária — campos de outras abas não vão no payload).
- Montar o payload do slice (`{ aba, restauranteId, ...sliceCampos }`) e chamar `atualizar.mutateAsync(...)`.
- Para `cardapio` (auto-save no toggle do switch): segue chamando `salvar("cardapio", { upsell_habilitado: v })`.

### 4. Indicador visual de alterações não salvas

- Snapshot `restauranteSnapshot` derivado do `restaurante` carregado (mesma forma do `form`, recomputado quando `restaurante` muda) via `useMemo`.
- Função `abaTemAlteracoes(aba: TabId): boolean` compara `form` vs `restauranteSnapshot` apenas nos campos do slice daquela aba.
- Estado derivado `abasSujas: Record<TabId, boolean>` via `useMemo` dependente de `form` e `restauranteSnapshot`.
- No `TabsTrigger`: quando `abasSujas[aba]` for `true`, renderizar um `<span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-label="alterações não salvas" />` ao lado do rótulo.
- Após `atualizar.mutateAsync` bem-sucedido, a `queryKeys.meuRestaurante` é invalidada (já acontece no hook) → `restaurante` atualiza → snapshot recompõe → indicador da aba salva desaparece automaticamente. **Não é preciso lógica adicional**.

Observações:
- Comparação por igualdade direta de strings/booleans/números (campos do `form`). Sem deep equal complexo.
- O `logo_url` faz parte do slice `identidade`; um upload sem salvar marca a aba como suja, como esperado.

## Detalhes técnicos

### Contrato do servidor (resumo)

```ts
// pseudocódigo
const schema = z.discriminatedUnion("aba", [
  z.object({ aba: z.literal("identidade"), restauranteId: z.string().uuid(),
             nome: z.string().trim().min(2).max(100),
             cor_primaria: z.string().regex(/^#[0-9a-fA-F]{6}$/),
             logo_url: z.string().nullable() }),
  // ... pagamentos, taxas, comissoes, caixa, cardapio
]);
```

### Riscos confirmados como baixos

- **Validações cruzadas inter-aba**: não existem hoje. Auditado.
- **Race condition** entre abas: comportamento desejado (last-write-wins por campo).
- **Compatibilidade**: único caller do server fn é `useAtualizarConfiguracoes`; ambos mudam juntos.
- **Tipos**: discriminated union do Zod resolve sem `as`.

### Arquivos afetados (3)

- `src/lib/configuracoes.functions.ts` — refatora `configSchema` e `atualizarConfiguracoesFn` (handler com switch por `aba`).
- `src/hooks/use-configuracoes.ts` — tipo `ConfigPayload` vira união discriminada.
- `src/routes/_authenticated/admin/configuracoes.tsx` — `salvar(aba)` envia slice; snapshot + diff + bolinha no `TabsTrigger`.

## Verificação após implementação

1. Editar campo na aba Identidade → bolinha aparece em "Identidade".
2. Trocar para aba Pagamentos sem salvar → bolinha permanece em "Identidade".
3. Editar PIX na aba Pagamentos → bolinha aparece também em "Pagamentos".
4. Salvar em "Pagamentos" → apenas campos PIX persistem no banco; bolinha de Pagamentos some; bolinha de Identidade **permanece** (alterações de Identidade não foram enviadas).
5. Voltar para Identidade, salvar → bolinha some; valor persiste.
6. Cardápio: alternar switch → auto-save sem bolinha.
