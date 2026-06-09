# Plano: Taxa de Serviço e Couvert (Mesa e Artístico)

Adicionar duas categorias de cobrança configuráveis em `Configurações`, aplicadas no resumo da conta e nos pagamentos, sempre respeitando o CDC (opt-in/recusa para taxa de serviço; couvert nunca cobrado automaticamente sem consumo/acesso).

---

## 1) Taxa de Serviço

### Schema (migration nova em `restaurantes`)

- `taxa_servico_habilitada boolean NOT NULL DEFAULT false`
- `taxa_servico_percentual numeric(5,2) NULL CHECK (>=0 AND <=30)` (default sugerido 10%)
- `taxa_servico_descricao text NULL` (ex.: "Taxa de serviço (10%) — opcional")

### Configurações (UI)

Nova seção em `src/routes/_authenticated/admin/configuracoes.tsx`:

- Switch "Cobrar taxa de serviço"
- Input percentual (0–30%)
- Texto explicando que, por lei, a taxa é opcional para o cliente

Estender:

- `src/lib/configuracoes.functions.ts` (`configSchema` + `atualizarConfiguracoesFn`)
- `src/hooks/use-configuracoes.ts` (`ConfigPayload`)

### Aplicação no cálculo

- A taxa NÃO é gravada como coluna em `comandas` (mantém triggers atuais intactos).
- É calculada dinamicamente em `resumoContaFn` (em `src/lib/pedidos.functions.ts`) sobre o `subtotal - cashback - desconto_cupom`, e retornada como campos:
  - `taxa_servico_percentual`, `taxa_servico_valor`, `taxa_servico_opcional: true`
  - `total_sugerido = total + taxa_servico_valor`
- Cliente vê linha "Taxa de serviço (10%) — opcional" na tela `m.$qrToken_.conta.tsx` com um toggle "Incluir taxa de serviço" (default ligado, estado em `localStorage` por sessão).
- `DividirContaDialog` recebe `totalSugerido` quando taxa incluída.

### Pagamento

- `registrarPagamentoFn` continua aceitando `valor` livre (o garçom/cliente pagam com ou sem taxa). Sem trigger novo.
- Painel do garçom (`confirmar-pagamento-dialog`) ganha um atalho "Aplicar taxa de serviço" que preenche o campo de valor com o total + taxa.

---

## 2) Couvert (Mesa e Artístico)

Princípio CDC: nunca cobrar automaticamente. Configuração define disponibilidade e valor; cobrança real é por **lançamento manual** pelo garçom (mesa) ou opt-in por cliente/garçom (artístico), com possibilidade de remoção.

### Schema (mesma migration)

Em `restaurantes`:

- `couvert_mesa_habilitado boolean NOT NULL DEFAULT false`
- `couvert_mesa_valor numeric(10,2) NULL CHECK (>=0)`
- `couvert_mesa_descricao text NULL` (composição: "Pães, patês, azeitonas…")
- `couvert_artistico_habilitado boolean NOT NULL DEFAULT false`
- `couvert_artistico_valor numeric(10,2) NULL CHECK (>=0)` (por pessoa)
- `couvert_artistico_descricao text NULL` (ex.: "Música ao vivo — sex/sáb 20h")

Nova tabela `comanda_couverts` (lançamentos efetivamente cobrados):

- `id uuid pk default gen_random_uuid()`
- `comanda_id uuid not null references comandas(id) on delete cascade`
- `restaurante_id uuid not null references restaurantes(id) on delete cascade`
- `tipo text not null check (tipo in ('mesa','artistico'))`
- `quantidade int not null default 1 check (quantidade > 0)` (mesa: porções; artístico: pessoas)
- `valor_unitario numeric(10,2) not null check (>=0)` (snapshot do config no momento)
- `descricao text`
- `criado_em timestamptz not null default now()`
- Trigger `AFTER INSERT/UPDATE/DELETE` que recalcula `comandas.subtotal` e `comandas.total` somando o total de couverts.
- RLS: `comandas_rw_membro`-style (membros do restaurante) + policy `INSERT` público para cliente em sessão ativa (mesma lógica de `cupom`).
- GRANTs: `authenticated` (full) e `service_role`.

### Configurações (UI)

Seção "Couvert" em `configuracoes.tsx`:

- Bloco "Couvert de mesa": switch + valor + textarea (composição). Aviso: "Só cobre quando o cliente consumir e aceitar."
- Bloco "Couvert artístico": switch + valor por pessoa + descrição do evento. Aviso: "Proibido cobrar por música mecânica/TV; cliente sem acesso visual/acústico está isento."

### Lançamento

- **Couvert de mesa**: tela do garçom (`sala_.mesa.$mesaId.tsx`) ganha botão "Lançar couvert de mesa" → insere em `comanda_couverts` com `quantidade` ajustável e valor pré-preenchido.
- **Couvert artístico**: ao abrir a comanda em horário com `couvert_artistico_habilitado=true`, garçom recebe prompt "Aplicar couvert artístico (R$ X por pessoa)?". Quantidade = nº de clientes na sessão; ajustável; permite remover por cliente isento.
- Cliente (no `conta.tsx`) vê linhas detalhadas "Couvert artístico (2x R$ 15,00)" e botão "Contestar" (abre chamado para o garçom remover, sem permissão direta de DELETE pelo cliente).

### Aplicação no cálculo

- `resumoContaFn` retorna `couverts: { tipo, quantidade, valor_unitario, total }[]` e somatório já refletido em `comanda_atual.total` (via trigger).
- `m.$qrToken_.conta.tsx` exibe seção "Couvert" detalhada antes do "Total da comanda".

---

## Arquivos afetados

```text
supabase/migrations/<novo>.sql          (campos + tabela comanda_couverts + trigger + RLS + GRANTs)
src/lib/configuracoes.functions.ts      (schema + update)
src/hooks/use-configuracoes.ts          (ConfigPayload)
src/routes/_authenticated/admin/configuracoes.tsx  (seções Taxa de Serviço + Couvert)
src/components/configuracoes/taxa-servico-form.tsx (novo)
src/components/configuracoes/couvert-form.tsx      (novo)
src/lib/pedidos.functions.ts            (resumoConta: campos taxa_servico_* e couverts)
src/lib/couvert.functions.ts            (novo: lançar/remover couvert — membro)
src/hooks/use-couvert.ts                (novo)
src/routes/m.$qrToken_.conta.tsx        (UI taxa opcional + couvert)
src/components/cliente/dividir-conta-dialog.tsx    (suportar totalSugerido)
src/components/admin/confirmar-pagamento-dialog-body.tsx (atalho "aplicar taxa")
src/routes/_authenticated/sala_.mesa.$mesaId.tsx   (botões lançar couvert)
```

## Fora de escopo

- Couvert por item de cardápio (entradas vendidas avulsas continuam como produto normal).
- Repasse específico da taxa de serviço para garçons (já tratado pelo bloco de comissões existente; podemos integrar depois).
- A/B test ou métricas de aceitação da taxa.

## Pontos de validação para você antes de implementar

1. **Taxa de serviço — opt-in ou opt-out por padrão?** Plano assume default "incluída" com toggle visível para remover (prática mais comum no Brasil, ainda dentro do CDC).  
Resposta: ok
2. **Couvert artístico — quantidade automática = nº de clientes da sessão, ou sempre digitada pelo garçom?** Plano assume "sugerida automaticamente, editável".  
Resposta: **sempre digitada pelo garçom**
3. **Cliente pode remover couvert direto na tela, ou só contestar via chamado?** Plano assume "contestar via chamado" (evita abuso e mantém trilha de auditoria).  
Resposta: contestar via chamado