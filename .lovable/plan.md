## Objetivo

Tornar o módulo Caixa robusto e seguro, com regras claras de quem acessa, quem opera e quem só observa. Nenhuma tela existente muda de layout/cor/tipografia — só ganham comportamentos novos e, em alguns casos, um botão a mais.

---

## Modelo de acesso e permissões do Caixa

### Quem pode entrar em `/caixa`

- **`admin`** (membro do restaurante): acesso completo conforme regras de dono do turno abaixo.
- **`caixa`** (membro do restaurante): acesso completo conforme regras de dono do turno abaixo.
- **`platform_admin`** (super-admin da plataforma): acesso somente leitura, modo suporte.
- **`staff`, `cozinheiro`, `bar`**: **sem acesso**. Se tentarem entrar em `/caixa` (ou em qualquer rota filha), o guard redireciona com mensagem "Você não tem acesso ao caixa." O item "Caixa" da `AdminSidebar` também não aparece para esses papéis.

### Quem pode operar (mutar) quando há turno aberto

- **Operador dono** (`operador_user_id` do turno): único que pode registrar sangria/suprimento, confirmar pagamento e fechar o turno.
- **Admin não dono**: vê em somente leitura; pode usar "Assumir turno" para virar dono e então operar.
- **Caixa não dono**: somente leitura, sem botão de assumir.
- **Super-admin**: sempre somente leitura, mesmo se aparecer como dono em algum turno legado. Não abre, não muta, não assume. Para destravar uma situação no cliente, promove alguém a `admin` em `/superadmin` e esse admin assume/fecha pelo fluxo normal.

### Quem pode abrir caixa

- Apenas `admin` ou `caixa` (membros do restaurante). Super-admin não.

---

## Bloco 1 — Acesso a `/caixa` a partir do `/admin`

- `AdminSidebar`: o item "Caixa" passa a abrir em nova aba (`target="_blank"`, `rel="noopener"`), igual aos itens "Display de cozinha" e "Display do bar". Item exibido apenas para papéis `admin`, `caixa` e `platform_admin`.
- `CaixaShell`: o botão "Sair" mantém o comportamento atual de logout.
- Resultado: admin sempre tem o `/admin` intacto na aba original; basta fechar a aba do caixa.

## Bloco 2 — Guard de rota de `/caixa`

- Em `src/routes/_authenticated/caixa.tsx`, o `beforeLoad` (ou equivalente no shell) valida o papel após resolver o restaurante atual:
  - `admin`, `caixa`, `platform_admin` → entram.
  - Qualquer outro papel (`staff`, `cozinheiro`, `bar`) ou usuário sem membro no restaurante → `redirect({ to: "/admin" })` com toast "Você não tem acesso ao caixa."
- Vale para todas as rotas filhas (`/caixa/movimentos`, `/caixa/pagamentos`, `/caixa/relatorio`).

## Bloco 3 — Dono do turno e modo somente-leitura

- Botões de ação em `TurnoAbertoPainel`, `MovimentosPanel` e `/caixa/pagamentos` ficam desabilitados para quem não é dono, com tooltip:
  - Admin/caixa não dono: "Turno em uso por {nome}".
  - Super-admin: "Super-admin opera em modo somente leitura."

### "Assumir turno"

- Botão visível **apenas** para o papel `admin` do restaurante quando o usuário não é o dono e há turno aberto. Não aparece para super-admin, caixa, staff, cozinheiro ou bar.
- Confirmação modal: "Você vai assumir o turno aberto por {nome}. Esta ação fica registrada na auditoria."
- Ação: atualiza `operador_user_id` (e `operador_nome`) do turno ativo e grava evento `assumir` em `caixa_eventos` (Bloco 11).

### Server functions afetadas

Em `src/lib/caixa.functions.ts` e `src/lib/pagamentos.functions.ts`:

- `registrarMovimentoCaixaFn`, `fecharCaixaFn`: passam a exigir `operador_user_id === auth.uid()`. Caso contrário, erro "Apenas o operador do turno pode realizar esta ação." (Super-admin também recebe esse erro.)
- `abrirCaixaFn`: além de membro do restaurante, exige papel `admin` ou `caixa`. Super-admin recebe erro "Super-admin não pode abrir caixa." Bloqueia também duplicidade (Bloco 5).
- `confirmarPagamentoFn`: mesma regra de dono do turno quando há turno aberto. Sem turno aberto, ver Bloco 10.
- Nova `assumirTurnoFn({ restauranteId, turnoId })`: gate restrito a papel `admin` do restaurante (rejeita super-admin, caixa, staff, etc.).

No frontend, `CaixaShell` e painéis recebem flags `souDono` / `podeAssumir` / `souSuperAdmin` derivadas do turno + papel.

## Bloco 4 — Identidade do operador

- Ao abrir caixa (`AbrirCaixaCard` / `abrirCaixaFn`):
  - Quando o usuário tem `membro.nome` em `restaurante_membros`, pré-preencher e **travar** o campo "Operador" com esse nome.
  - Caso não tenha, manter o campo livre.
- Header do `CaixaShell` mostra `membro.nome` quando disponível, em vez de `user.email`.

## Bloco 5 — Bloquear abertura de turno duplicada

- `abrirCaixaFn` valida no servidor que não existe outro turno com `status='aberto'` para o restaurante, com erro amigável. Hoje a UI esconde o botão, mas o servidor não trava.

## Bloco 6 — Alerta de turno aberto há muito tempo

- Nova configuração em `restaurantes`: coluna `caixa_alerta_horas` (int, NOT NULL, default 12). Editável em `/admin/configuracoes`.
- `TurnoAbertoPainel` e header do `CaixaShell` exibem aviso amarelo "Turno aberto há {N}h — confirme se não esqueceu de fechar" quando ultrapassa o limite.

## Bloco 7 — Sangria obrigatória acima de um teto

- Nova configuração em `restaurantes`: `caixa_teto_dinheiro` (numeric, NULL = sem teto). Editável em `/admin/configuracoes`.
- `confirmarPagamentoFn` (dinheiro) e `registrarMovimentoCaixaFn` (suprimento): após registrar, se o saldo previsto em dinheiro ultrapassar o teto, retornar `aviso_teto_excedido=true`.
- UI: banner persistente "Saldo em dinheiro ({R$ X}) acima do teto ({R$ Y}). Registre uma sangria." Não bloqueia operação.

## Bloco 8 — Conferência cega no fechamento

- Nova configuração em `restaurantes`: `caixa_conferencia_cega` (bool, NOT NULL, default false). Editável em `/admin/configuracoes`.
- Quando `true`, o dialog de fechamento esconde os totais esperados; operador digita contagem física e fundo final; após confirmar, a diferença é revelada.

## Bloco 9 — Relatório por operador

- Em `RelatorioPanel`: adicionar filtro por operador e agrupamento opcional "Por operador" com totais agregados (vendas, sangrias, suprimentos, diferença) por pessoa. Sem mudança de layout existente.

## Bloco 10 — Lock opcional: exigir caixa aberto para registrar pagamento

- Nova configuração em `restaurantes`: `caixa_obrigatorio_para_pagamento` (bool, NOT NULL, default false).
- Quando `true`, `confirmarPagamentoFn` retorna erro "É preciso abrir o caixa antes de registrar pagamentos." se não houver turno ativo.

## Bloco 11 — Auditoria de eventos do turno

Nova tabela `caixa_eventos`:

```text
caixa_eventos
  id, restaurante_id, turno_id, tipo, payload jsonb,
  ator_user_id, ator_nome, criado_em
```

- `tipo` ∈ `'abrir' | 'sangria' | 'suprimento' | 'pagamento_confirmado' | 'fechar' | 'assumir' | 'aviso_teto'`.
- Server fns gravam o evento na mesma operação. Como super-admin não muta, ele nunca aparece como ator — o histórico fica limpo do ponto de vista do cliente.
- `MovimentosPanel` ganha sub-aba "Histórico do turno" com a timeline.

## Bloco 12 — Painel de Pagamentos pendentes (refinos)

A aba `/caixa/pagamentos` já existe. Refinos:

- Busca por número da mesa / nome do cliente.
- Filtro por garçom responsável.
- Coluna "Aberta há" (tempo desde `comanda.criado_em`).
- "Modo TV": botão fullscreen, tipografia maior, refresh a cada 15s.
- Botão "Confirmar pagamento" desabilitado conforme regra do Bloco 3.

---

## Detalhes técnicos

### Migrations (Postgres)

1. `ALTER TABLE restaurantes ADD COLUMN caixa_alerta_horas integer NOT NULL DEFAULT 12;`
2. `ALTER TABLE restaurantes ADD COLUMN caixa_teto_dinheiro numeric NULL;`
3. `ALTER TABLE restaurantes ADD COLUMN caixa_conferencia_cega boolean NOT NULL DEFAULT false;`
4. `ALTER TABLE restaurantes ADD COLUMN caixa_obrigatorio_para_pagamento boolean NOT NULL DEFAULT false;`
5. `CREATE TABLE public.caixa_eventos (...)` + GRANTs (`authenticated`, `service_role`) + `ENABLE RLS` + política SELECT `is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid())`; INSERT restrito a membros do restaurante (super-admin não insere).

### Server functions

- `src/lib/caixa.functions.ts`:
  - `abrirCaixaFn`: gate de papel (`admin`/`caixa`, sem super-admin) + bloqueio de duplicidade + evento `abrir`.
  - `registrarMovimentoCaixaFn`, `fecharCaixaFn`: gate "operador dono".
  - Nova `assumirTurnoFn`: gate restrito a `admin` do restaurante; grava evento `assumir`.
  - `obterTotaisTurnoFn` retorna também `alerta_horas` e `aviso_teto_excedido`.
- `src/lib/pagamentos.functions.ts`:
  - `confirmarPagamentoFn`: gate "operador dono" quando há turno aberto; respeita `caixa_obrigatorio_para_pagamento`; grava evento `pagamento_confirmado`.
- `src/lib/configuracoes.functions.ts`: expor/atualizar os 4 novos campos.

### Hooks

- `src/hooks/use-caixa.ts`: novo `useAssumirTurno`; expõe `souDono` / `podeAssumir` / `souSuperAdmin` / `alertas` a partir do `useTurnoAtivo` + `useMeuPapel` + `useVerificarPlatformAdmin`.
- `src/hooks/use-pagamentos.ts`: tratamento dos novos erros, sem mudar assinaturas.

### UI (apenas adições, sem mudar layout existente)

- `AdminSidebar`: `target="_blank"` + `rel="noopener"` no item Caixa; item escondido para `staff`/`cozinheiro`/`bar`.
- `CaixaShell`: badges contextuais — "Você é o operador", "Somente leitura (operador: X)" ou "Modo suporte (somente leitura)" para super-admin; badge de alerta de horas.
- Guard de rota em `/caixa` (Bloco 2).
- `TurnoAbertoPainel`: botão "Assumir turno" condicional (só admin não-dono); banner de teto excedido.
- `AbrirCaixaCard`: campo "Operador" travado em `membro.nome`.
- `MovimentosPanel`: sub-aba "Histórico do turno".
- `RelatorioPanel`: filtro por operador + agrupamento opcional.
- `/admin/configuracoes`: nova seção "Caixa" com os 4 toggles/inputs.
- `/caixa/pagamentos`: busca, filtro por garçom, coluna "Aberta há", botão "Modo TV".

### Fora de escopo

- Mudar visual/layout/cores das telas existentes.
- Mexer em fluxos de pedido/cozinha/bar.
- Trocar o método de logout do `CaixaShell`.
- Permitir super-admin operar o caixa.
- "Fechamento de emergência" pelo super-admin — para destravar, super-admin promove um `admin` em `/superadmin`.
- Múltiplos operadores simultâneos no mesmo turno.

---

## Ordem sugerida de execução

- **Fase 1 (acesso + permissões + auditoria base)**: Blocos 1, 2, 3, 4, 5 + migration de `caixa_eventos` (gravando `abrir`, `sangria`, `suprimento`, `pagamento_confirmado`, `fechar`, `assumir`).
- **Fase 2 (robustez operacional)**: Blocos 6, 7, 8, 9, 10, 11 (timeline na UI), 12.
