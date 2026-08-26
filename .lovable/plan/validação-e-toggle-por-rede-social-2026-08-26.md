# Validação e toggle por rede social

Melhorar o card "Redes sociais" em `/superadmin/configuracoes` com validação de cada URL/handle e um interruptor por rede, mantendo o valor salvo mesmo quando desativada.

## Validação

Para cada rede, o valor pode ser um handle (`@mesasistema`) ou uma URL completa. Regras:

- URL completa deve usar `https://` (http é aceito e normalizado para https) e pertencer ao domínio da rede:
  - Instagram: instagram.com
  - Facebook: facebook.com, fb.com
  - YouTube: youtube.com, youtu.be
  - LinkedIn: linkedin.com
  - TikTok: tiktok.com
  - X: x.com, twitter.com
- Handle: apenas letras, números, ponto, hífen e sublinhado (LinkedIn também aceita `company/nome`), 1–50 caracteres.
- Mensagens claras abaixo do campo, por exemplo: "Informe um link do Instagram (instagram.com) ou o usuário, ex.: @mesasistema" e "Use apenas letras, números, ponto, hífen ou sublinhado".
- Campo inválido fica com borda de erro; o botão Salvar bloqueia o envio e mostra um toast indicando quantas redes precisam de correção.
- A mesma validação roda no servidor, recusando o salvamento com mensagem específica da rede.

## Toggle por rede

- Cada rede ganha um interruptor "Exibir na landing page" ao lado do rótulo.
- Desativar mantém o valor salvo no banco, apenas oculta o ícone no rodapé.
- Campo desabilitado visualmente quando a rede está desligada (valor preservado).
- Prévia lista somente as redes ativas e válidas; redes com valor mas desligadas aparecem em cinza com a marcação "oculta".
- Ao preencher um campo vazio, o toggle liga automaticamente.

## Banco de dados

Migração adiciona a `plataforma_config` seis colunas booleanas `NOT NULL DEFAULT true`:
`social_instagram_ativo`, `social_facebook_ativo`, `social_youtube_ativo`, `social_linkedin_ativo`, `social_tiktok_ativo`, `social_x_ativo`.

Nenhuma nova tabela, política ou permissão — a linha já é lida publicamente e escrita apenas por administradores da plataforma.

## Landing page

O rodapé passa a exibir o ícone somente quando a rede está ativa **e** tem link válido. Sem redes ativas, nada é renderizado (layout atual intacto).

## Detalhes técnicos

- `src/lib/social-links.ts`: adicionar `dominios: string[]` e `campoAtivo` em `RedeSocialDef`, e `validarValorSocial(rede, valor): { ok: true } | { ok: false; erro: string }`. `montarLinkSocial` passa a normalizar para https e retorna `null` para valores inválidos.
- `src/lib/plataforma.functions.ts`: estender `ConfigPlataforma` e `getConfigPlataforma` com os seis booleanos; em `atualizarConfigSociais`, o `inputValidator` (zod com `superRefine` usando `validarValorSocial`) passa a aceitar e persistir os flags, mantendo o registro em `audit_logs`.
- `src/hooks/use-plataforma-config.ts`: incluir os flags no payload de `useAtualizarConfigSociais`.
- `src/components/superadmin/sociais-config-card.tsx`: estado `{ valor, ativo }` por rede, `Switch` do shadcn, erros por campo via `validarValorSocial` no `onChange`/`onBlur`, prévia atualizada e bloqueio do Salvar.
- `src/routes/index.tsx`: filtrar o rodapé pelos flags ativos.
