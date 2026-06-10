# Repasse da taxa de serviço para garçons

Quando a taxa de serviço estiver ligada, o admin escolhe se ela vai (e quanto) para os garçons. Rateio proporcional aos pedidos atendidos, registrado em nova tabela, gerado uma única vez no fechamento da comanda.

---

## 1) Configuração

Novos campos em `restaurantes` (mesma migration):

- `taxa_servico_repasse_habilitado boolean NOT NULL DEFAULT false`
- `taxa_servico_repasse_percentual numeric(5,2) NULL CHECK (>=0 AND <=100)` (default sugerido 100)

UI em `TaxaServicoForm`: aparece um bloco aninhado "Repasse aos garçons" **só quando a taxa de serviço estiver habilitada**:

- Switch "Repassar taxa de serviço aos garçons"
- Input "% da taxa que vai para os garçons" (0–100, default 100)
- Texto: "Ex.: 100% = toda taxa vai para os garçons; 80% = 20% fica para a casa."

Validação em `configuracoes.functions.ts`: se `repasse_habilitado` então `percentual > 0`. Se `taxa_servico_habilitada=false`, força `repasse_habilitado=false`.

## 2) Schema — nova tabela

```text
comissoes_taxa_servico
  id uuid pk
  restaurante_id uuid not null (FK restaurantes, cascade)
  comanda_id uuid not null (FK comandas, cascade) — unique
  garcom_id uuid not null (FK garcons, restrict)
  valor_taxa_total numeric(10,2) not null — taxa paga pelo cliente
  percentual_repasse numeric(5,2) not null — snapshot da config
  peso numeric not null — peso do garçom na comanda
  valor_repasse numeric(10,2) not null — quanto este garçom recebe
  status text not null default 'pendente' check in ('pendente','pago')
  calculado_em timestamptz not null default now()
  pago_em timestamptz nullable
  pago_por uuid nullable
```

Unique `(comanda_id, garcom_id)` para idempotência. RLS `rw_membro` igual a `comissoes`. GRANTs para `authenticated` e `service_role`.

## 3) Gatilho — fechamento da comanda

Function `gerar_repasse_taxa_servico(p_comanda_id uuid)` em PL/pgSQL:

1. Lê `restaurantes` da comanda; se taxa desligada ou repasse desligado → return.
2. Soma pagamentos confirmados da comanda. Calcula `taxa_paga = total_pago - (subtotal_liquido)` (proxy: `valor_taxa = subtotal_liquido * percentual_taxa%`; usa o **menor** entre os dois para evitar superpagamento quando cliente recusou a taxa).
3. `valor_para_garcons = valor_taxa * percentual_repasse%`.
4. Lê `pedido_garcons` agregado por garçom da comanda (somando `peso` dos pedidos). Se vazio, fallback para `mesa_garcom` atual.
5. Distribui `valor_para_garcons` proporcionalmente ao peso de cada garçom.
6. `INSERT ... ON CONFLICT (comanda_id, garcom_id) DO NOTHING` (idempotente).

Trigger `AFTER UPDATE ON comandas` quando `status` muda para `'fechada'` (ou status equivalente já existente — confirmar nome durante implementação): chama a função acima.

## 4) Pagamento e relatórios

- `garcons.functions.ts` ganha leitura agregada de `comissoes_taxa_servico` por garçom, somada ao extrato existente como linha "Taxa de serviço".
- `extrato-garcom-dialog.tsx`: nova seção "Taxa de serviço" com lista por comanda + total pendente.
- `relatorios.functions.ts` / `relatorios-export.ts`: nova coluna "taxa de serviço" no relatório de comissões; total consolidado.
- Marcação como pago: reutiliza o fluxo de "pagar comissões" existente, agora também marca `comissoes_taxa_servico.status='pago'` no mesmo escopo (filtro por garçom).

## 5) UI da conta do cliente

Nenhuma mudança visível ao cliente — ele continua vendo apenas "Taxa de serviço (X%) — opcional". O destino do dinheiro é decisão interna.

---

## Arquivos afetados

```text
supabase/migrations/<novo>.sql
  + colunas taxa_servico_repasse_habilitado / _percentual
  + tabela comissoes_taxa_servico + RLS + GRANTs
  + function gerar_repasse_taxa_servico + trigger no fechamento

src/lib/restaurante.functions.ts          (tipo Restaurante)
src/lib/configuracoes.functions.ts        (schema + validação)
src/hooks/use-configuracoes.ts            (ConfigPayload)
src/components/configuracoes/taxa-servico-form.tsx  (bloco "Repasse aos garçons")
src/lib/garcons.functions.ts              (extrato + pagamento)
src/components/admin/garcons/extrato-garcom-dialog.tsx
src/lib/relatorios.functions.ts
src/lib/relatorios-export.ts
src/integrations/supabase/types.ts        (auto)
```

## Fora de escopo

- Repasse de couvert artístico aos músicos/artistas.
- Política de retenção de imposto sobre a taxa.
- Repasse parcial por pagamento (mantido apenas no fechamento).
