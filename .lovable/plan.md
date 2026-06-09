# Plano: Melhorias no fluxo de pedidos do cliente

Objetivo: tornar a experiência "uma refeição contínua" em vez de "pedidos isolados". Tudo é frontend + serverFns de leitura + ativação de Realtime + **uma coluna nova** para configurar upsell. Sem outras alterações de schema.

## Escopo das melhorias

1. **Carrinho persistente flutuante** em todas as telas do cliente.
2. **Agrupar pedidos da comanda** na tela de status (timeline da refeição).
3. **Estados de preparo por item** mais claros.
4. **Confirmação antes de enviar** com resumo.
5. **Observações por item** no carrinho.
6. **Upsell/recomendações** no carrinho — **configurável (liga/desliga) pelo restaurante**.
7. **Polling → Realtime** no status e na conta.
8. **Notificação quando o pedido fica pronto** (som + vibração + toast).
9. **Tempo estimado de preparo**.
10. **Chamar garçom com motivo rápido**.
11. **Cancelar item pelo cliente até antes do preparo**.
12. **Divisão de conta** visual na tela "Conta da mesa".

## Entregas por fase

### Fase 1 — Carrinho persistente + Realtime + Agrupamento (núcleo)

(inalterado — já implementado conforme descrito anteriormente)

### Fase 2 — Confirmação, observações, notificações

(inalterado — já implementado)

### Fase 3 — Polish

**3.1 Recomendações/upsell — agora configurável**

- **Schema**: nova coluna `restaurantes.upsell_habilitado boolean not null default true` (default `true` para não quebrar restaurantes existentes; cada dono pode desligar).
- **Painel admin**: na tela de configurações do restaurante (`src/routes/_authenticated/...` de configurações), adicionar um `Switch` "Sugerir acompanhamentos ao cliente no carrinho" com descrição curta. Usa as mutations/serverFns existentes de update do restaurante (estender o serverFn de update para aceitar o novo campo).
- **Exposição pública**: incluir `upsell_habilitado` no payload de `obterRestaurantePublicoFn` (ou equivalente já consumido pelo fluxo `/m/$qrToken`) para que o cliente saiba ler a flag sem auth.
- **Frontend cliente** (`m.$qrToken_.carrinho.tsx`): o bloco "Que tal acompanhar?" só renderiza quando `restaurante.upsell_habilitado === true`. Quando desligado, nenhum espaço/placeholder aparece.
- **Lógica de sugestão** (quando ligado): até 3 produtos do cardápio já em cache, priorizando categorias "bebidas" e "sobremesas" e excluindo itens já no carrinho.

**3.2 Chamar garçom com motivos** — inalterado.

**3.3 Cancelamento de item pelo cliente** — inalterado (regra: só `pendente`, guard no backend).

**3.4 Divisão de conta (somente visual)** — inalterado (sem mutations, sem impacto em comandas/pagamentos).

## Arquivos afetados (delta da Fase 3)

**Novos**
- `src/components/cliente/upsell-carrinho.tsx` (renderiza condicionalmente o bloco de sugestões).

**Editados**
- `src/routes/m.$qrToken_.carrinho.tsx` — passa a flag `upsell_habilitado` ao componente.
- ServerFn público do restaurante — incluir `upsell_habilitado` no retorno.
- Tela de configurações do restaurante (admin) — adicionar o `Switch`.
- ServerFn de update do restaurante — aceitar `upsell_habilitado` opcional.

**Migration**
- `ALTER TABLE public.restaurantes ADD COLUMN upsell_habilitado boolean NOT NULL DEFAULT true;`

## Pontos técnicos

- Default `true` evita regressão para restaurantes existentes; UX já planejada é preservada por padrão.
- Flag lida via serverFn público existente — sem novas rotas autenticadas para o cliente.
- Nenhuma mudança em RLS é necessária (a coluna entra em tabela já com policies adequadas; leitura pública já é feita por serverFn com `supabaseAdmin` projetando colunas seguras — basta adicionar a coluna à projeção).
- Toggle reativo: ao desligar no admin, próxima carga do cardápio público já omite o bloco.

## Ordem de execução

Migration → expor flag no serverFn público → Switch no admin → render condicional no carrinho.
