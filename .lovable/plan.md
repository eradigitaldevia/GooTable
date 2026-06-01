# Histórico de visitas em "Minha Conta"

Escopo restrito a: `src/lib/clientes.functions.ts`, `src/hooks/use-minha-conta.ts` e `src/routes/m.$qrToken_.minha-conta.tsx`. Nenhuma outra tela, função ou rota será tocada. Sem migration.

## 1. Backend — `src/lib/clientes.functions.ts`

### 1a. Alterar `minhaContaFn` (histórico paginado de visitas, excluindo a atual)

Substituir o bloco "Histórico paginado de pedidos do cliente" (linhas 312–322) por uma agregação por `mesa_sessoes`, restrita ao restaurante atual e **excluindo a `sessaoId` atual**.

Algoritmo:
1. Buscar todos os `pedidos` do cliente no restaurante (`id, sessao_id, total, cashback_gerado, cashback_resgatado, criado_em`) com `sessao_id IS NOT NULL` e `sessao_id <> data.sessaoId`.
2. Agrupar em memória por `sessao_id`. Para cada grupo calcular: `pedidos_count`, `total_cliente` (soma de `total`), `cashback_gerado_total`, `cashback_resgatado_total`, `primeira_data` (min `criado_em`), `ultima_data` (max `criado_em`).
3. Buscar as `mesa_sessoes` correspondentes (`id, mesa_id, aberta_em, fechada_em, status`) e juntar `mesas.numero`.
4. Ordenar por `aberta_em DESC`, aplicar paginação manual (`page`/`pageSize`).

Atualizar tipos:
```ts
export interface VisitaResumo {
  sessao_id: string;
  mesa_numero: string | null;
  aberta_em: string;
  fechada_em: string | null;
  status: string;
  pedidos_count: number;
  total_cliente: number;
  cashback_gerado: number;
  cashback_resgatado: number;
}
// substituir `historico: PedidoHistorico[]` por `visitas: VisitaResumo[]`
// manter `historico_total: number` renomeado para `visitas_total: number`
```

`PedidoHistorico` pode ser removido (não há outros consumidores — confirmar com `rg`).

### 1b. Nova server fn `detalheVisitaFn`

Adicionar no mesmo arquivo, seguindo o padrão das demais:

```ts
export const detalheVisitaFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      qrToken: z.string().min(1).max(80),
      clienteId: z.string().uuid(),
      sessaoId: z.string().uuid(),
    }).parse(d)
  )
  .handler(async ({ data }) => { ... })
```

Faz:
1. Valida mesa pelo `qrToken` → obtém `restaurante_id`.
2. Valida que a `sessaoId` pertence ao restaurante e busca `mesa_sessoes` + `mesas.numero`.
3. Busca `pedidos` do cliente naquela sessão (`id, total, status, criado_em, observacao, cashback_gerado, cashback_resgatado`).
4. Busca `pedido_itens` desses pedidos filtrados por `cliente_id` (`pedido_id, nome_produto, quantidade, preco_unit, observacao`).
5. Busca `pagamentos` da sessão (`metodo, valor, status, criado_em`) para totalizar pago.
6. Retorna estrutura agrupada:

```ts
export interface DetalheVisitaResultado {
  sessao: { id; mesa_numero; aberta_em; fechada_em; status };
  pedidos: Array<{
    id; criado_em; status; observacao;
    cashback_gerado; cashback_resgatado;
    itens: Array<{ nome_produto; quantidade; preco_unit; subtotal; observacao }>;
    subtotal_cliente: number;
  }>;
  totais: {
    subtotal_cliente: number;
    cashback_gerado: number;
    cashback_resgatado: number;
    total_pago_sessao: number;
  };
}
```

## 2. Hook — `src/hooks/use-minha-conta.ts`

Adicionar hook irmão, mesmo padrão de `useMinhaConta`:

```ts
export function useDetalheVisita(input: {
  qrToken: string;
  clienteId: string | undefined;
  sessaoId: string | null;
}) {
  const fn = useServerFn(detalheVisitaFn);
  const enabled = !!input.clienteId && !!input.sessaoId;
  return useQuery({
    queryKey: ["detalhe-visita", input.qrToken, input.sessaoId ?? "none"],
    queryFn: () => fn({ data: { qrToken: input.qrToken, clienteId: input.clienteId!, sessaoId: input.sessaoId! } }),
    enabled,
  });
}
```

`useMinhaConta` não muda assinatura — apenas o shape do `data` retornado (consumido só pela página `minha-conta.tsx`).

## 3. UI — `src/routes/m.$qrToken_.minha-conta.tsx`

### 3a. Substituir a seção "Histórico de pedidos" por "Histórico de visitas"

- Itera `data.visitas`. Cada linha (botão clicável) mostra:
  - Data (`aberta_em` formatada) e nº da mesa
  - Linha secundária: `{pedidos_count} pedidos · total {formatBRL(total_cliente)}`
  - Chevron à direita
- Mantém paginação (`Anterior` / `Próxima`) usando `visitas_total`.
- Mensagem vazia: "Sem visitas anteriores."
- Texto do cabeçalho da seção: "Histórico de visitas".

Estado local novo: `sessaoSelecionada: string | null`. Clique numa visita seta o id e abre o Sheet.

### 3b. Novo componente `VisitaDetalheSheet` (mesmo arquivo, abaixo de `CashbackSection`)

Usa `Sheet` de `@/components/ui/sheet` (side="bottom" em mobile). Recebe `qrToken`, `clienteId`, `sessaoId`, `open`, `onOpenChange`. Internamente chama `useDetalheVisita`. Renderiza:

- Header: data, mesa, status, duração se `fechada_em`.
- Lista de pedidos: hora + status; lista de itens (`{qtd}x {nome} — {formatBRL(subtotal)}`); observação se houver.
- Rodapé fixo: totais (subtotal do cliente, cashback gerado/resgatado, total pago da sessão).
- Loading com `Loader2`.

Mantém o padrão visual existente (mesmas classes Tailwind, `rounded-2xl border bg-card`, `text-muted-foreground`, etc.) — sem novas cores ou tipografia.

## 4. Comportamento preservado

- Cabeçalho, "Olá", cards de cashback/pedidos, "Esta visita", "Aplicar cashback", "Resumo do cliente" — inalterados.
- Realtime, navegação, identificação e demais rotas — inalterados.
- `useResumoConta`, "Conta da mesa" e tela de status — inalterados.

## 5. Verificação

- `rg "PedidoHistorico|historico_total|data\.historico"` para garantir que nada mais consome os campos antigos.
- Build + abrir `/m/$qrToken/minha-conta` na preview: confirmar que (a) o pedido recém-enviado não aparece no histórico, (b) clicar numa visita anterior abre o sheet com itens e totais.

## Notas técnicas

- Sem nova tabela, sem migration, sem mudança de RLS — `supabaseAdmin` já é usado no arquivo e segue o padrão.
- Paginação continua em memória do lado do server fn (após o group-by), já que `pedidos` não tem coluna `sessao_aberta_em`; o volume por cliente é baixo. Limitar a busca inicial a `1000` (default do Supabase) é aceitável para esta tela; se necessário, paginar com `range` por `criado_em` em iteração futura — fora deste escopo.
- O componente `Sheet` já existe em `src/components/ui/sheet` (shadcn) — confirmar antes de implementar.
