# Alerta de vencimento de contrato

Deixar o vencimento visível na lista do superadmin e permitir, por restaurante, escolher se o vencimento suspende o acesso automaticamente.

## 1. Badge de vencimento em /superadmin/restaurantes

Na coluna Nome, no lugar da linha de texto atual, uma etiqueta com o estado do contrato:

- Sem data: nada é exibido.
- Falta mais de 7 dias: etiqueta neutra "Vence em 24/09".
- Falta 7 dias ou menos: etiqueta âmbar "Vence em X dias" / "Vence hoje".
- Já venceu: etiqueta vermelha "Vencido há X dias" e a linha toda recebe um leve fundo vermelho.

Os filtros "A vencer" e "Vencidos" que já existem continuam funcionando; "A vencer" passa a considerar apenas os próximos 7 dias (hoje ele mostra qualquer data futura).

## 2. Bloqueio automático ao vencer (opcional, por restaurante)

Novo interruptor "Suspender automaticamente ao vencer" no diálogo de contrato (junto de vencimento e notas), desligado por padrão.

Comportamento:

- Ligado: quando a data de vencimento passa, o restaurante é suspenso automaticamente — cardápio por QR, delivery público e criação de pedidos ficam bloqueados com a mensagem de indisponibilidade já usada hoje. O painel admin continua acessível em leitura, como já acontece na suspensão manual.
- Desligado: o vencimento só aparece como alerta visual no superadmin; nada é bloqueado.
- Reativar é sempre manual: o superadmin reativa e atualiza a data de vencimento. Enquanto a data seguir vencida com o interruptor ligado, o restaurante volta a ser suspenso — a lista avisa isso na etiqueta ("vencido") para evitar confusão.
- A suspensão automática entra no log de auditoria como ação da plataforma.

Na lista, restaurantes com bloqueio automático ligado exibem um indicador discreto ao lado do vencimento, para diferenciar de quem só tem alerta.

## Detalhes técnicos

- Migração: `ALTER TABLE public.restaurantes ADD COLUMN contrato_bloqueio_automatico boolean NOT NULL DEFAULT false`.
- Nova função `public.aplicar_bloqueio_contratos()` (security definer): suspende (`ativo = false`) restaurantes com `contrato_bloqueio_automatico = true`, `contrato_vencimento_em < current_date` e `ativo = true`, gravando em `audit_logs`. Agendada em `pg_cron` uma vez por dia (03:00 BRT) — o mesmo padrão de `encerrar_sessoes_ociosas`. Como as verificações públicas já usam `ativo`, nenhum loader ou RPC precisa mudar.
- `listarRestaurantesAdmin`, `getRestauranteAdmin` e `atualizarContratoRestaurante` em `src/lib/superadmin.functions.ts` passam a ler/gravar `contrato_bloqueio_automatico`; o hook `useAtualizarContratoRestaurante` recebe o novo campo.
- Novo helper de apresentação (ex.: `src/lib/contrato-status.ts`) com o cálculo de dias e rótulo, usado por `restaurante-row.tsx`.
- UI: `src/components/superadmin/restaurante-row.tsx` (badge + destaque), `src/components/superadmin/editar-contrato-dialog.tsx` (switch), `src/routes/superadmin.restaurantes.tsx` (filtro "A vencer" em 7 dias).
