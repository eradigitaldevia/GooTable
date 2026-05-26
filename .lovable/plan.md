
# Resiliência do Realtime no KDS

Adicionar detecção de falha do canal realtime na tela `/admin/cozinha`, com banner visual, reconexão automática, fallback de polling, revalidação ao voltar foco/conexão e som de alerta na queda. Nenhum comportamento atual é alterado — apenas adicionado.

## 1. Novo hook `src/hooks/use-realtime-status.ts`

Hook reutilizável que encapsula o ciclo de vida do canal e expõe o estado de conexão.

**API:**
```ts
type RealtimeStatus = "connecting" | "connected" | "degraded" | "disconnected";

useRealtimeStatus(opts: {
  channelName: string;
  enabled: boolean;
  setup: (channel: RealtimeChannel) => RealtimeChannel; // registra .on(...)
  onReconnect?: () => void; // chamado ao reconectar (para invalidar cache)
}): {
  status: RealtimeStatus;
  reconnect: () => void; // força recriação do canal
}
```

**Comportamento interno:**
- Cria canal via `supabase.channel(channelName)`, aplica `setup(channel)`, chama `.subscribe(cb)`.
- Mapeia retornos do `subscribe`:
  - `SUBSCRIBED` → `connected` (zera contador de tentativas, chama `onReconnect` se vinha de estado não-conectado)
  - `TIMED_OUT` → `degraded`
  - `CHANNEL_ERROR` / `CLOSED` → `disconnected`
- Backoff exponencial em `disconnected`/`degraded`: 2s → 5s → 10s → 30s (máx). Remove canal antigo e recria.
- Listeners de `window`: `online` força reconnect imediato; `offline` marca `disconnected`; `visibilitychange` (visible) força reconnect se não estiver `connected`.
- Cleanup remove canal e listeners.

## 2. Novo componente `src/components/cozinha/kds-connection-banner.tsx`

Banner discreto abaixo do header. Não renderiza nada quando `status === "connected"`.

| Status | Cor | Texto | Ação |
|---|---|---|---|
| `degraded` | amarelo (`bg-amber-500/10 text-amber-700`) | "Reconectando ao tempo real…" | spinner |
| `disconnected` | vermelho (`bg-destructive/10 text-destructive`) | "Conexão em tempo real perdida. Novos pedidos podem demorar a aparecer." | botões "Tentar novamente" e "Recarregar página" |

Props: `{ status, onReconnect, onReload }`. Usa apenas tokens semânticos do design system.

## 3. Alterações em `src/routes/_authenticated/cozinha.tsx`

- Remover o `useEffect` que cria o canal `kds-${restauranteId}` (substituído pelo hook).
- Chamar `useRealtimeStatus`:
  - `channelName: kds-${restauranteId}`
  - `enabled: !!restauranteId`
  - `setup`: registra os mesmos dois `.on("postgres_changes", ...)` atuais (pedidos + pedido_itens), preservando 100% da lógica de toast, beep e `scheduleInvalidate`.
  - `onReconnect`: `qc.invalidateQueries({ queryKey: queryKeys.pedidos(restauranteId) })` — garante que pedidos perdidos durante a queda apareçam.
- Renderizar `<KdsConnectionBanner status={status} onReconnect={reconnect} onReload={() => window.location.reload()} />` logo abaixo do `<KdsHeader />` e antes da faixa de "pedido atrasado".
- **Fallback de polling**: passar `refetchInterval` para o `usePedidosDoDia` quando `status !== "connected"`.
- **Som de alerta na queda**: `useEffect` observando a transição para `disconnected`. Quando `somLigado === true` e o status passa para `disconnected` (apenas na transição, não em loop), tocar um beep distinto do "novo pedido" — frequência mais grave (`220 Hz`) e duração maior (`0.8s`), reaproveitando o padrão `AudioContext` já existente no arquivo. Não toca em `degraded` para evitar ruído em oscilações curtas.

## 4. Alteração mínima em `src/hooks/use-pedidos.ts`

Aceitar `refetchInterval?: number | false` opcional em `usePedidosDoDia(restauranteId, options?)`, repassado ao `useQuery`. Default mantém comportamento atual (`false`). Nenhum outro hook é tocado.

No KDS:
```ts
const status = ...;
const { data, isLoading } = usePedidosDoDia(restauranteId, {
  refetchInterval: status === "connected" ? false : 15000,
});
```

## 5. Validação manual

1. Abrir `/admin/cozinha` — banner não aparece, realtime funciona normalmente.
2. Desligar Wi-Fi → banner vermelho aparece em ≤2s, beep grave toca uma vez (se som ligado), polling de 15s começa.
3. Religar Wi-Fi → reconnect, banner some, `onReconnect` invalida cache. Nova queda volta a tocar o beep.
4. Hibernar laptop por 1min e voltar → `visibilitychange` dispara reconnect e invalidação.
5. Criar pedido durante a queda → aparece após reconexão (via invalidação) ou no próximo polling, o que vier primeiro.
6. Com som desligado no header, nenhum beep toca na queda.

## Arquivos

**Criados:**
- `src/hooks/use-realtime-status.ts`
- `src/components/cozinha/kds-connection-banner.tsx`

**Editados (mudança mínima):**
- `src/routes/_authenticated/cozinha.tsx` — troca o `useEffect` do canal pelo hook + banner + polling condicional + beep na queda.
- `src/hooks/use-pedidos.ts` — adiciona parâmetro opcional `refetchInterval` em `usePedidosDoDia`.

## Fora de escopo

- Aplicar o mesmo padrão em dashboard admin, status do cliente, mesa, clientes (o hook fica reutilizável, mas só é usado no KDS nesta entrega).
- Telemetria/log de desconexões.
- Mudanças visuais no `KdsHeader` ou no design existente.
