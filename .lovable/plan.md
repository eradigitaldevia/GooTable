# Venda direta: onboarding pelo superadmin (sem billing na plataforma)

Sem assinatura online. Cada venda presencial vira um cadastro feito pelo superadmin, com controle comercial simples (status, vencimento e notas do contrato).

## 1. Fechar o auto-cadastro

- A rota `/cadastro` deixa de criar contas: passa a redirecionar para `/login`.
- Os links "Criar conta" da home (`/`) e do login passam a "Já é cliente? Entrar" / botão de contato comercial.
- A criação de restaurante pelo próprio usuário deixa de ser exposta na UI (a função continua existindo apenas para uso interno do superadmin).

## 2. Criar conta + restaurante juntos (superadmin)

O diálogo "Novo restaurante" em `/superadmin/restaurantes` passa a pedir:

- Nome do restaurante e slug (como hoje)
- Nome do dono, email e senha inicial
- Campos comerciais: data de vencimento e notas do contrato

Comportamento no servidor:

- Se o email ainda não existir, a conta é criada já confirmada (sem email de confirmação) com a senha informada.
- Se já existir, o usuário existente é vinculado como admin (sem trocar a senha).
- Restaurante criado e dono vinculado como `admin`, tudo registrado no log de auditoria.
- A senha aparece uma única vez na tela, para o vendedor entregar ao cliente.

## 3. Controle comercial por restaurante

Novos campos no restaurante:

- `contrato_vencimento_em` (data)
- `contrato_notas` (texto livre: valor combinado, vendedor, data da venda)

Na lista `/superadmin/restaurantes`:

- Coluna/etiqueta de vencimento: "vence em X dias", "vence hoje", "vencido há X dias".
- Filtro adicional: "vencendo em 7 dias" e "vencidos".
- Ação para editar vencimento e notas, e o botão de suspender/reativar que já existe.

## 4. Efeito real da suspensão

Hoje um restaurante suspenso só mostra um aviso no painel; nada é bloqueado. Passa a valer:

- Cardápio por QR (`/m/:token`), delivery público e criação de pedidos ficam bloqueados com mensagem "Estabelecimento temporariamente indisponível".
- O painel admin continua acessível em modo leitura, com o aviso atual, para o cliente ver os dados e regularizar.
- Vencimento por si só não suspende: só marca visualmente no superadmin. A suspensão continua sendo uma ação manual do vendedor/superadmin.

## Detalhes técnicos

- Migração: `ALTER TABLE public.restaurantes` adicionando `contrato_vencimento_em date` e `contrato_notas text` (ambos opcionais). Sem tabela nova, sem planos.
- `criarRestauranteAdmin` em `src/lib/superadmin.functions.ts` passa a receber `donoNome`, `donoSenha`, `vencimento`, `notas` e usar `supabaseAdmin.auth.admin.createUser({ email_confirm: true })` quando o usuário não existir; substitui o `listUsers` por busca direta.
- Novas funções: `atualizarContratoRestaurante` (vencimento/notas) no mesmo arquivo, com `assertPlatformAdmin` + `logAction`.
- `src/components/superadmin/novo-restaurante-dialog.tsx`: novos campos e exibição única da senha após sucesso.
- `src/routes/cadastro.tsx`: vira redirect para `/login`; ajustes de links em `src/routes/index.tsx` e `src/routes/login.tsx`.
- Bloqueio da suspensão nos loaders públicos (`src/lib/cardapio-publico.functions.ts`, `src/lib/cliente-mesa.functions.ts`, `src/lib/delivery.functions.ts`) e nas RPCs `criar_pedido_publico` / `criar_pedido_garcom`, que passam a rejeitar restaurante inativo.
- O aceite LGPD do cadastro passa a ser registrado no momento da criação pelo superadmin, mantendo a auditoria em `lgpd_consentimentos`.
