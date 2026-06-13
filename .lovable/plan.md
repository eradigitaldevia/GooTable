## Objetivo

Mover Couvert artístico da página Configurações para a página Couvert artístico (em nova aba "Taxa de couvert"), manter Couvert de mesa em Configurações, deixar a página Couvert artístico sempre visível e **separar completamente o backend** das duas abas — nenhum campo artístico trafega pela aba `taxas`.

---

## 1. Backend — separar a aba `taxas` em duas

### `src/lib/configuracoes.functions.ts`

- Encolher o ramo `aba: "taxas"` do `configSchema` para conter **apenas**:
  - `taxa_servico_habilitada`, `taxa_servico_percentual`, `taxa_servico_descricao`
  - `taxa_servico_repasse_habilitado`, `taxa_servico_repasse_percentual`
  - `couvert_mesa_habilitado`, `couvert_mesa_valor`, `couvert_mesa_descricao`
- Adicionar novo ramo `aba: "couvert-artistico"`:
  - `couvert_artistico_habilitado`, `couvert_artistico_valor`, `couvert_artistico_descricao`
  - `couvert_artistico_repasse_habilitado`, `couvert_artistico_repasse_percentual`
- No `handler`, dividir o `case "taxas"` em dois:
  - `case "taxas"`: validações e `update` apenas dos campos de serviço + couvert mesa.
  - `case "couvert-artistico"`: validações (valor > 0 quando habilitado; repasse > 0 quando habilitado; zera repasse quando desabilitado) e `update` apenas dos campos artísticos.

### `src/hooks/use-configuracoes.ts`

- Atualizar o tipo `ConfigPayload`:
  - Remover campos artísticos do membro `aba: "taxas"`.
  - Acrescentar membro `aba: "couvert-artistico"` com os 5 campos artísticos.

---

## 2. Quebrar `couvert-form.tsx` em dois componentes

### `src/components/configuracoes/couvert-form.tsx`

- Substituir o `CouvertForm` por **dois componentes exportados** no mesmo arquivo (preserva path de import existente, sem mover código não relacionado):
  - `CouvertMesaForm` — recebe apenas `mesaHabilitado/mesaValor/mesaDescricao` + `onChange` com as 3 chaves de mesa. Renderiza o bloco "Couvert" com header + somente o card "Couvert de mesa".
  - `CouvertArtisticoForm` — recebe `artisticoHabilitado/artisticoValor/artisticoDescricao/repasseHabilitado/repassePercentual` + `onChange`. Renderiza o card "Couvert artístico" + bloco "Repasse aos artistas" (sem o link "Gerenciar artistas e apresentações", já que o componente passa a viver dentro da própria página).
- Manter export legado `CouvertForm` removido (não há outros consumidores além de `configuracoes.tsx`).

---

## 3. Página Configurações — manter só Couvert de mesa

### `src/routes/_authenticated/admin/configuracoes.tsx`

- Import: trocar `CouvertForm` por `CouvertMesaForm`.
- Em `CAMPOS_POR_ABA.taxas`: remover as 5 chaves artísticas (`couvert_artistico_*`).
- Em `salvar("taxas")`:
  - Remover validações `r3` e `r5` (valor/repasse artístico).
  - Remover campos artísticos do `payload`.
- Substituir o `<CouvertForm ... />` da aba `taxas` por `<CouvertMesaForm ... />` (só props de mesa).
- Manter rótulo da aba "Taxas e couverts" como está (ou ajustar para "Taxas e couvert" — confirmar item 5).

> Os campos artísticos continuam no `useState form` e no `snapshot` (vêm de `restaurante`) apenas para leitura/inicialização, mas **não são mais enviados** pela aba `taxas`. Alternativa mais limpa: removê-los do `form`/`snapshot` desta página. Ver pergunta abaixo.

---

## 4. Página Couvert artístico — sempre visível + nova aba

### `src/routes/_authenticated/admin/couvert-artistico.tsx`

- Remover o early-return quando `!restaurante.couvert_artistico_habilitado` — página sempre acessível.
- Estender `searchSchema`: `tab: z.enum(["taxa-couvert", "artistas", "apresentacoes", "repasses"]).default("taxa-couvert")`.
- Adicionar `<TabsTrigger value="taxa-couvert">Taxa de couvert</TabsTrigger>` como primeira aba.
- Criar novo componente `src/components/couvert-artistico/taxa-couvert-tab.tsx` que:
  - Usa `useMeuRestaurante` + `useAtualizarConfiguracoes` (mesmo hook) com novo `aba: "couvert-artistico"`.
  - Reutiliza `CouvertArtisticoForm`.
  - Tem seu próprio estado local + botão "Salvar" + validações (espelhando as que estavam em `salvar("taxas")` para campos artísticos).
- Quando `restaurante.couvert_artistico_habilitado === false`: ocultar `<TabsTrigger>` de Artistas/Apresentações/Repasses (mantém só "Taxa de couvert"), e se a URL pedir aba oculta, redirecionar para `taxa-couvert`.

### `src/components/admin/admin-sidebar.tsx`

- Verificar/remover qualquer gate que esconde o item "Couvert artístico" do menu quando `couvert_artistico_habilitado` é falso (se existir). *Este passo só altera o gate; não mexe em estilo.*

---

## 5. Perguntas antes de implementar

1. **Limpeza do estado em Configurações:** posso remover os 5 campos `couvert_artistico_*` do `useState form` e do `snapshot` em `configuracoes.tsx` (já que não são mais usados ali)? Isso é a opção mais coerente com "totalmente independente", mas envolve excluir linhas existentes nesses dois blocos.
  - **A)** Sim, remover (recomendado).
  - **B)** Não, manter no state mesmo sem uso.
2. **Rótulo da aba em Configurações:** manter "Taxas e couverts" (plural) ou trocar para "Taxas e couvert" (apenas mesa)?
3. **Sidebar gate do item "Couvert artístico":** confirmar se devo conferir/remover gate de visibilidade no menu (caso exista) para garantir que o item apareça sempre. Posso alterar apenas o gate, sem tocar em estilos.

Respostas:  
1. **A)** Sim, remover (recomendado).  
2. Trocar para "Taxa e couvert" (apenas mesa).  
3. Sim, conferir/remover gate de visibilidade no menu (caso exista) para garantir que o item apareça sempre.