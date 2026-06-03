
# Plano consolidado: atribuição, atendimento cruzado, turnos e comissão

Este plano substitui as discussões anteriores e fica como referência única.

## 1. Regras do modelo

| Aspecto | Cruzado LIGADO | Cruzado DESLIGADO |
|---|---|---|
| Quem pode lançar pedido | Qualquer garçom ativo | Apenas garçons atribuídos à mesa |
| Atribuição de mesas | Obrigatória (1+) | Obrigatória (1+) |
| Aba "Mesas" em `/admin/garcons` | Visível | Visível |
| Sala do garçom (`/sala`) | Todas as mesas ativas + busca | Apenas mesas atribuídas + busca |
| Botão "Outra mesa" | Oculto | Oculto |

Atribuição é **sempre obrigatória** porque pedidos do QR precisam de garçom para gerar comissão.

## 2. Check-in / Check-out de turno

Nova tabela `garcom_turnos` (`id, restaurante_id, garcom_id, iniciado_em, encerrado_em, encerrado_por`).

- Header da sala do garçom: badge "Turno aberto desde HH:mm" + botão "Encerrar turno".
- Ao entrar na sala sem turno aberto: modal "Iniciar turno" (1 clique).
- `/admin/garcons`: badge verde "Online" nos garçons com turno aberto + botão admin "Encerrar turno" (caso esqueçam).
- Fechamento automático: cron diário 1x/dia fecha turnos abertos há mais de 16h (marca `encerrado_por = NULL` para identificar fechamento automático).

## 3. Múltiplos garçons por mesa

- `mesa_garcom` já suporta múltiplos vínculos ativos (sem UNIQUE em `mesa_id` com `liberado_em IS NULL`).
- RPC `atribuir_garcom_mesa` deixa de liberar os anteriores — apenas adiciona (sem duplicar).
- Nova RPC `remover_garcom_mesa(_mesa_id, _garcom_id)`.
- UI da aba "Mesas": chips multi-select por mesa com botões "+ Adicionar" e "x". Sem limite.

## 4. Regra de comissão

Toggle existente `comissao_rateio_troca_turno` é renomeado para **"Dividir comissão entre garçons atribuídos com turno aberto"** e passa a controlar:

**Pedido do garçom (lançado por ele no app):**
- Toggle OFF: 100% para `pedidos.garcom_id` (quem lançou), independente dos outros.
- Toggle ON: divide igualmente entre todos os garçons atribuídos à mesa **com turno aberto** no momento do pedido.

**Pedido do cliente (QR, `garcom_id` NULL):**
- Sempre divide igualmente entre garçons atribuídos à mesa **com turno aberto** no momento do pedido (independente do toggle).
- Se nenhum atribuído tiver turno aberto: pedido entra sem comissão + warning no admin.

A escolha do conjunto de garçons é feita no momento da criação do pedido (geração de `pedido_garcons`), não no fechamento — assim a comissão fica congelada e auditável.

## 5. Validações e edge cases

- Aba "Mesas": warning (não bloqueio) se mesa ativa não tem garçom atribuído.
- Sala do garçom (cruzado OFF) sem mesas atribuídas: mensagem "Peça ao admin para atribuir mesas".
- Pedido QR em mesa sem garçom com turno aberto: criado normalmente, sem `pedido_garcons`, badge "Sem comissão" no admin. Não há retroativo automático.
- Toggle alterado no meio do expediente: vale só para pedidos novos.
- Garçom encerra turno com pedidos abertos: tudo bem, comissão dos pedidos já criados está congelada.

## 6. Detalhes técnicos

### Migrations
1. Tabela `garcom_turnos` + RLS (`is_restaurante_membro`) + GRANTs + índice `(restaurante_id, garcom_id) WHERE encerrado_em IS NULL`.
2. RPCs: `abrir_turno_garcom(_garcom_id)`, `encerrar_turno_garcom(_garcom_id)`, `encerrar_turnos_expirados()` (chamada pelo cron).
3. RPC `remover_garcom_mesa(_mesa_id, _garcom_id)`.
4. Alterar `atribuir_garcom_mesa`: remover bloco que libera vínculo anterior; remover bloco de rateio retroativo (rateio agora é só no momento da criação).
5. Alterar `criar_pedido_garcom`: ao final, gerar linhas em `pedido_garcons` conforme regra do item 4 (intersecção atribuídos × turno aberto).
6. Novo trigger ou ajuste em `criar_pedido_publico`: para QR, gerar `pedido_garcons` com garçons atribuídos × turno aberto.
7. Renomear label do toggle no form (`comissao_rateio_troca_turno` mantém o nome físico).

### Frontend
- `src/components/garcons/mesas-tab.tsx`: chips multi-select + warning de mesa sem garçom.
- `src/lib/garcons.functions.ts`: serverFns para `remover_garcom_mesa`.
- `src/routes/_authenticated/sala.tsx`: filtro por modo (cruzado on/off), input de busca, header com badge de turno e botões iniciar/encerrar.
- `src/lib/sala.functions.ts`: serverFns `abrir_turno`, `encerrar_turno`, `listar_mesas_sala`.
- `src/routes/_authenticated/admin/garcons.tsx`: badge "Online" por garçom + botão admin "Encerrar turno".
- `src/components/configuracoes/comissao-modo-form.tsx`: novo texto do toggle.

### Cron
- Insert em `cron.schedule` para chamar `encerrar_turnos_expirados()` 1x/dia às 06:00.

## 7. Fora de escopo

- Escala semanal antecipada (Nível 2/3) — adicionar depois se necessário.
- Retroativo de comissão para pedidos QR órfãos.
- Relatórios de comissão e horas trabalhadas (telas existentes continuam).
- Alterações em `comissao_modo` (Por pedido / Por item) — mantido.

## 8. Riscos

- Garçom esquecer de encerrar turno: mitigado por fechamento automático em 16h e botão admin.
- Toggle alterado no meio do dia gera mistura de regras (esperado).
- Múltiplos garçons em chips podem ocupar várias linhas com mesas muito populadas (aceitável).
