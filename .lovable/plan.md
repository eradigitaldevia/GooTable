
# Gestão de caixa e turnos

Implementa controle de turno de caixa do operador, com abertura, sangrias/suprimentos, fechamento com conferência e relatório do turno. Conecta-se aos pagamentos já existentes (sem alterar fluxos atuais).

## Decisões adotadas (confirmadas)

1. **Métodos de pagamento**: expandir o enum `pagamento_metodo` para incluir `cartao` e `fiado` (além de `pix`, `dinheiro`, `outro` já existentes). UI atual de confirmação de pagamento ganha os dois novos métodos.
2. **Origem das vendas no caixa**: somar pela tabela `pagamentos` usando `confirmado_em` entre `aberto_em` e `fechado_em` do turno e `status = 'confirmado'`. Não somar por `pedidos.total`.
3. **Bloqueio operacional**: nenhum. Pedidos e pagamentos continuam livres mesmo sem turno aberto. Caixa é puramente conferência financeira.
4. **Quem opera**: criar novo papel `caixa` no enum `app_role`. Admin e Caixa podem abrir/fechar caixa e ver o painel. Outros papéis não veem o item no menu.

## Mudanças de banco (migração nova)

Novas tabelas:

- `turnos_caixa` — id, restaurante_id, operador_user_id, operador_nome, aberto_em, fechado_em, fundo_inicial, fundo_final, contagem_fisica, diferenca, obs_fechamento, status (`aberto`|`fechado`), e snapshot dos totais (vendas, dinheiro, cartao, pix, fiado, outro, sangrias, suprimentos, qtd_pedidos) preenchidos no fechamento.
- `movimentos_caixa` — id, turno_id, tipo (`abertura`|`sangria`|`suprimento`|`fechamento`), valor, motivo, operador_user_id, criado_em.

Índice único parcial em `turnos_caixa(restaurante_id) WHERE status='aberto'` para impedir dois turnos abertos no mesmo restaurante.

Enums:

- `ALTER TYPE pagamento_metodo ADD VALUE 'cartao'`; `'fiado'`.
- `ALTER TYPE app_role ADD VALUE 'caixa'`.

RLS:

- Tabelas com `enable row level security`.
- Política `ALL`: `is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid())`. A restrição "admin/caixa" é aplicada no server function (não em RLS) para manter o padrão do projeto.
- GRANTs padrão (`authenticated`, `service_role`).

Funções SQL (SECURITY DEFINER, search_path=public):

- `abrir_turno_caixa(_restaurante_id, _operador_nome, _fundo_inicial)` → cria turno + movimento `abertura`. Valida ausência de turno aberto e papel admin/caixa.
- `registrar_movimento_caixa(_turno_id, _tipo, _valor, _motivo)` → valida turno aberto e papel.
- `fechar_turno_caixa(_turno_id, _contagem_fisica, _fundo_final, _obs)` → calcula totais via subquery e grava snapshot, status `fechado`, registra movimento `fechamento`, retorna jsonb com totais e diferença.
- `totais_turno_caixa(_turno_id)` (stable) → jsonb com:
  - `total_vendas`, `total_dinheiro`, `total_cartao`, `total_pix`, `total_fiado`, `total_outro` somando `pagamentos` com `restaurante_id` = turno, `status='confirmado'`, `confirmado_em` no intervalo do turno.
  - `total_sangrias`, `total_suprimentos` somando `movimentos_caixa` do turno.
  - `qtd_pedidos` (distinct pedidos que tiveram pagamento confirmado no intervalo).
  - `saldo_esperado = fundo_inicial + total_dinheiro + total_suprimentos − total_sangrias`.

Fórmula da diferença: `contagem_fisica − saldo_esperado` (PIX/cartão/fiado não entram no esperado de gaveta).

## Server functions (`src/lib/caixa.functions.ts`)

Padrão `createServerFn` + `requireSupabaseAuth` + `assertAcessoRestaurante` + checagem de papel (`admin` ou `caixa`, ou platform admin):

- `obterTurnoAtivoFn({ restauranteId })` → turno aberto atual ou null.
- `obterTotaisTurnoFn({ restauranteId, turnoId })` → chama `totais_turno_caixa`.
- `listarMovimentosTurnoFn({ restauranteId, turnoId })`.
- `abrirCaixaFn({ restauranteId, operadorNome, fundoInicial })`.
- `registrarMovimentoCaixaFn({ restauranteId, turnoId, tipo, valor, motivo })`.
- `fecharCaixaFn({ restauranteId, turnoId, contagemFisica, fundoFinal, obsFechamento })`.
- `listarTurnosFn({ restauranteId, limit })` → histórico, para abrir relatório de turnos anteriores.

Validação com Zod em todos os inputs.

## Hook (`src/hooks/use-caixa.ts`)

TanStack Query:

- `useTurnoAtivo(restauranteId)` com `refetchInterval: 30_000`.
- `useTotaisTurno(restauranteId, turnoId)` com `refetchInterval: 30_000`, `enabled: !!turnoId`.
- `useMovimentosTurno(restauranteId, turnoId)`.
- `useHistoricoTurnos(restauranteId)`.
- Mutations: `useAbrirCaixa`, `useRegistrarMovimentoCaixa`, `useFecharCaixa` — invalidam queries acima.

## UI (`/admin/caixa`)

Nova rota `src/routes/_authenticated/admin/caixa.tsx` + componentes em `src/components/admin/caixa/`. Reaproveita tokens do design system atual (não usa o CSS do HTML anexo; apenas a estrutura de 3 abas).

Estrutura:

- `CaixaPage` — guarda papel (admin/caixa); 3 abas via `Tabs` do shadcn.
- Aba **Caixa**:
  - Estado fechado: form de abertura (operador, fundo inicial pré-preenchido com `fundo_final` do último turno fechado).
  - Estado aberto: 4 métricas (fundo inicial, vendas, sangrias, saldo esperado), 2 cards (vendas por método, origem por mesa/balcão derivada de `pedidos.mesa_id`), card de fechamento (contagem física, fundo próximo, obs, cálculo de diferença em tempo real, botão fechar).
- Aba **Movimentos**: form (tipo sangria/suprimento, valor, motivo) + lista cronológica.
- Aba **Relatório**: snapshot do último turno fechado (ou seletor de turnos do histórico) com totais, ticket médio, por método (barra), e diferença. Exportar PDF e enviar por e-mail ficam como botões desativados nessa primeira entrega (fora do escopo).

Sidebar (`src/components/admin/admin-sidebar.tsx`): adicionar item "Caixa" (ícone `Wallet`) visível para `papel === "admin"` ou `papel === "caixa"` ou platform admin.

## Mudanças necessárias em código existente

1. `src/lib/pagamentos.functions.ts` e UI de confirmar pagamento (`src/components/admin/confirmar-pagamento-dialog-body.tsx`): adicionar `cartao` e `fiado` ao enum Zod e ao seletor. Sem mudança de lógica.
2. `src/lib/equipe.functions.ts` / `src/components/admin/equipe-panel.tsx`: incluir `caixa` na lista de papéis disponíveis (sem alterar permissões dos papéis existentes).
3. `src/components/admin/admin-sidebar.tsx`: adicionar item de menu com gate por papel.

Nenhum outro fluxo (pedidos, comandas, sala do garçom, cozinha, bar) é alterado.

## Verificação

1. Migração aplica enums + tabelas + RLS + funções sem warnings.
2. Login como admin → /admin/caixa → abrir turno com fundo R$ 150 → confirmar pagamento em uma comanda em dinheiro → métricas refletem em até 30s.
3. Registrar sangria de R$ 50 → "Saldo esperado" cai R$ 50.
4. Fechar caixa com contagem física → diferença calculada corretamente; turno aparece como fechado; aba Relatório mostra snapshot.
5. Tentar abrir segundo turno → bloqueado pelo índice único.
6. Login com membro de papel diferente → item "Caixa" não aparece no menu; rota retorna 403 se acessada direto.

## Fora de escopo

- Exportação PDF e envio por e-mail/WhatsApp do relatório.
- Metas do turno e horários de pico (visíveis no HTML anexo).
- Bloqueio de vendas quando não há caixa aberto.
- Integração com extrato bancário de cartão/PIX.
