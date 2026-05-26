# Plano: Display de Cozinha (KDS)

Tela dedicada para cozinha, em rota separada, leve, sem o chrome do admin. Reaproveita 100% dos dados/realtime já existentes (`pedidos`, `pedido_itens`, canal Supabase Realtime).

## Escopo (MVP)

- Rota protegida `/cozinha` — layout próprio (sem sidebar/admin header).
- Mostra apenas colunas **Recebido** e **Em preparo** (cozinha não fecha conta nem entrega).
- Card por pedido com: Mesa, idade do pedido, itens (qtd × nome + observação), botão de ação única (`Iniciar preparo` → `Marcar como pronto`).
- Timer por card com cor de urgência: verde <8min, âmbar 8–15min, vermelho >15min (re-render local a cada 30s).
- Alerta visual no topo quando há pedido >15min.
- Botão **Tela cheia** (`requestFullscreen`) e toggle **Som ligado/desligado** (beep no INSERT, igual ao admin).
- Otimizado para tablet landscape (grid 2 colunas em ≥md, 1 em mobile).

Fora de escopo agora: papel separado `cozinheiro`, agrupamento por estação, marcar item individual como pronto, histórico, métricas de tempo médio, rota `/sala` para garçom.

## Decisões de arquitetura

**Acesso.** Não criar novo papel agora. Qualquer membro do restaurante (`admin` ou `staff`) acessa `/cozinha`. Justificativa: o enum atual é `admin | staff` e introduzir `cozinheiro` exige migração + UI no superadmin. Fica como evolução futura (ver "Próximos passos"). Na prática o restaurante cria um usuário `staff` compartilhado para a cozinha.

**Dados.** Reutilizar `listarPedidosDoDiaFn` filtrando no cliente por `status in ('recebido','em_preparo')`. Sem nova server fn de leitura. Realtime já existe via `useRealtimePedidos` (ou canal inline como em `admin/pedidos.tsx`) — reaproveitar.

**Avançar status.** Reusar `atualizarStatusPedidoFn` + hook `useAtualizarStatusPedido` (já tem auth + validação de restaurante). Zero código novo no backend.

**Layout.** A rota `/cozinha` fica **fora** de `_authenticated/admin` para não herdar a sidebar. Criamos `src/routes/_authenticated/cozinha.tsx` (autenticado, mas sem chrome admin) — render direto da página em fullscreen-friendly (bg escuro, alto contraste).

## Arquivos

**Novos**
- `src/routes/_authenticated/cozinha.tsx` — rota + página KDS (loader chamando `listarPedidosDoDiaFn`, realtime inline, fullscreen + som, grid de cards).
- `src/components/cozinha/kds-card.tsx` — card de pedido com timer colorido e botão de ação.
- `src/components/cozinha/kds-header.tsx` — header minimalista (título, relógio, contador, som, fullscreen).
- `src/hooks/use-tick.ts` — hook simples `useTick(intervalMs)` para forçar re-render dos timers (30s).

**Editados (mínimo)**
- `src/components/admin/admin-sidebar.tsx` — adicionar link "Display de cozinha" (abre em nova aba) para o admin levar à rota.
- `src/components/cliente/…` — nada.
- Nada em `pedidos.functions.ts`, `use-pedidos.ts`, `use-realtime.ts`, schema do banco.

## Backend / DB

Nenhuma migração. Nenhuma server fn nova. Nenhum ajuste de RLS — `listarPedidosDoDiaFn` e `atualizarStatusPedidoFn` já validam `assertAcessoRestaurante`.

## UI (referência do anexo)

```text
┌─────────────────────────────────────────────────────┐
│ 🍴 Display de cozinha   11:06  4 ativos  🔊 ⛶     │
├─────────────────────────────────────────────────────┤
│ ⚠ Pedido com mais de 15 min sem atualização!       │
├──────────────────────┬──────────────────────────────┤
│ RECEBIDO (2)         │ EM PREPARO (2)               │
│ ┌──────────────────┐ │ ┌──────────────────────────┐ │
│ │ Mesa 3 · C-08 14m│ │ │ Mesa 1 · C-04        17m │ │
│ │ 2× X-Burguer     │ │ │ 3× Pastel de carne       │ │
│ │ 1× Batata grande │ │ │ 1× Suco s/ açúcar        │ │
│ │ [Iniciar preparo]│ │ │ [Marcar como pronto]     │ │
│ └──────────────────┘ │ └──────────────────────────┘ │
└──────────────────────┴──────────────────────────────┘
```

Cor da borda esquerda do card = nível de urgência (verde/âmbar/vermelho). Tema escuro para reduzir cansaço visual em uso contínuo. Sem dark/light toggle no MVP.

## Validação

1. Login com `admin@caririfood.com`, abrir `/cozinha` → tela KDS aparece em fullscreen-friendly.
2. Cliente faz pedido pelo QR → card aparece em "Recebido" em <2s, beep dispara.
3. Clicar **Iniciar preparo** → card move para "Em preparo".
4. Clicar **Marcar como pronto** → card some do KDS (continua visível em `/admin/pedidos`).
5. Pedido com mais de 15min → borda vermelha + banner de alerta.
6. Botão tela cheia funciona em Chrome/Safari tablet.

## Próximos passos (não fazer agora)

- Papel `cozinheiro` no enum + UI no superadmin/admin para criar usuário só-cozinha.
- Múltiplas estações (bar / cozinha quente / fria) com filtro por categoria do produto.
- Marcar item individual como pronto (granularidade item-a-item).
- Rota `/sala` para garçom (ver pedidos `pronto`, marcar como entregue).
- Métricas: tempo médio por pedido, fila, throughput.
