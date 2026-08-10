# Plano: Destacar mesas com sessão ativa em /admin/mesas

## Objetivo

Destacar visualmente no grid de `/admin/mesas` quais mesas possuem cliente em atendimento (sessão aberta), para o admin ter visão imediata da ocupação do salão.

## Etapa 1 — Estender `listarMesasFn` com sessão ativa

**Arquivo:** `src/lib/mesas.functions.ts`

- Após buscar as mesas (linha 19-26), fazer uma query em `mesa_sessoes` filtrando `restaurante_id`, `status = 'aberta'` e `in('mesa_id', mesaIds)` — exatamente como já faz `carregarSalaFn` (sala.functions.ts linhas 534-542)
- Criar um `Set` de `mesa_id` com sessão aberta
- Adicionar `sessao_aberta: boolean` a cada mesa no retorno
- Atualizar a interface `Mesa` (linha 6-11) para incluir `sessao_aberta: boolean`

## Etapa 2 — Destacar o `MesaCard` quando há sessão ativa

**Arquivo:** `src/components/mesas/mesa-card.tsx`

- Adicionar `sessao_aberta?: boolean` à interface `Mesa` (linha 12-17)
- Quando `sessao_aberta` for true:
  - Aplicar borda verde no card (`border-emerald-500/60` + `ring-1 ring-emerald-500/30`)
  - Adicionar um pequeno badge "Em atendimento" (ponto verde + texto) abaixo do número da mesa, antes do badge do garçom
- Quando `sessao_aberta` for false: manter visual atual sem alteração
- O destaque deve ser suprimido na impressão (`print:border-2 print:ring-0` já existe no card base)

## Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/lib/mesas.functions.ts` | Editar — query de sessão ativa + campo `sessao_aberta` |
| `src/components/mesas/mesa-card.tsx` | Editar — destaque visual + badge |

Nenhuma alteração em banco de dados, regras de negócio, ou outros componentes.
