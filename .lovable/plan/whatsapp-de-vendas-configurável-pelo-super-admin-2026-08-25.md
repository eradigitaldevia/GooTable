# WhatsApp de vendas configurável pelo Super-Admin

Hoje os três botões "Fale com vendas" (header e hero da landing, rodapé do login) apontam para um e-mail fixo escrito direto no código. A ideia é passar isso para uma configuração editável no Super-Admin.

## Recomendação

Criar uma página `/superadmin/configuracoes` com um único card "Vendas", contendo:

- Campo **Número de WhatsApp** (com máscara/normalização para dígitos, DDI 55 assumido quando ausente).
- Campo **Mensagem pré-preenchida** (ex.: "Olá! Quero conhecer o sistema Mesa.").
- Prévia do link gerado (`https://wa.me/55...?text=...`) e botão "Testar link".
- Aviso quando o número está vazio: nesse caso os botões voltam ao e-mail comercial atual (fallback, sem CTA quebrado).

Por que uma página própria e não um campo solto: dá lugar natural para futuras configurações da plataforma (e-mail comercial, redes sociais) sem mexer na landing de novo.

## Onde será aplicado

- `/` — botão do header e botão do hero.
- `/login` — link "Fale com vendas".

Todos passam a abrir o WhatsApp em nova aba quando configurado.

A própria página do Super-Admin exibe essa lista em um bloco informativo ("Este link é usado em: landing — header e hero; tela de login"), para ficar claro onde a configuração tem efeito.


## Detalhes técnicos

**Banco**
- Nova tabela `public.plataforma_config` no padrão singleton (linha única com `id` fixo), colunas: `vendas_whatsapp text`, `vendas_mensagem text`, `criado_em`, `atualizado_em` + trigger `touch_atualizado_em`.
- GRANTs: `SELECT` para `anon` e `authenticated` (a landing é pública), `ALL` para `service_role`.
- RLS ligada: política de leitura pública (`USING (true)`) e política de escrita apenas para `public.is_platform_admin(auth.uid())`.
- Seed da linha única na mesma migração.

**Servidor**
- `src/lib/plataforma.functions.ts`: `getConfigPlataforma` (público, sem middleware, leitura com o cliente publishable) e `atualizarConfigVendas` (com `requireSupabaseAuth` + checagem de platform admin, seguindo o padrão de `superadmin.functions.ts`, incluindo `audit_logs`).

**Frontend**
- `src/lib/vendas-link.ts`: helper puro que recebe número/mensagem e devolve `{ href, isWhatsapp }`, com fallback `mailto:comercial@mesasistema.com.br`.
- `src/hooks/use-plataforma-config.ts`: query pública + mutation do superadmin (TanStack Query), invalidando a query após salvar.
- `src/routes/superadmin.configuracoes.tsx`: nova rota; item "Configurações" adicionado ao `NAV` de `src/routes/superadmin.tsx`.
- `src/components/superadmin/vendas-config-card.tsx`: formulário (≤150 linhas), Tailwind + shadcn, `sonner` para feedback.
- `src/routes/index.tsx` e `src/routes/login.tsx`: substituem o `href` fixo pelo link derivado da config, mantendo textos, estilos e layout atuais intactos.

Nenhuma outra tela, regra de negócio ou estilo é alterado.
