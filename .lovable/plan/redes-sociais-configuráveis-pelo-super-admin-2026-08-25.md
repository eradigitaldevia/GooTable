# Redes sociais configuráveis pelo Super-Admin

Adicionar um card "Redes sociais" em `/superadmin/configuracoes` para cadastrar os perfis da empresa, e exibir os ícones correspondentes no rodapé da landing page — mostrando apenas as redes preenchidas.

## Redes suportadas

Instagram, Facebook, YouTube, LinkedIn, TikTok e X (Twitter). Cada campo aceita o usuário (`@mesa`) ou a URL completa; o sistema normaliza para o link final do perfil.

## Banco de dados

Uma migração adiciona à tabela existente `plataforma_config` (linha única) as colunas de texto opcionais:
`social_instagram`, `social_facebook`, `social_youtube`, `social_linkedin`, `social_tiktok`, `social_x`.

Nenhuma nova tabela, política ou permissão é necessária — a leitura pública e a escrita restrita a administradores da plataforma já existem.

## Super-Admin

Novo card abaixo do card "Vendas" em `/superadmin/configuracoes`:

- Um campo por rede, com placeholder de exemplo e ícone da rede.
- Bloco informativo: "Os ícones aparecem no rodapé da landing page; redes em branco não são exibidas."
- Prévia dos links normalizados e botão único "Salvar".

## Landing page

No rodapé, entre o texto de copyright e os links legais, uma linha de ícones das redes configuradas:

- Só renderiza as redes preenchidas; se nenhuma estiver configurada, nada aparece (layout atual intacto).
- Links abrem em nova aba com `rel="noreferrer"` e `aria-label` com o nome da rede.

## Detalhes técnicos

- `src/lib/social-links.ts` (novo): tipo `RedeSocial`, lista das redes com rótulo/ícone/base URL e `montarLinkSocial(rede, valor)` que aceita handle ou URL e devolve `null` quando vazio/inválido.
- `src/lib/plataforma.functions.ts`: estender `getConfigPlataforma` para retornar os novos campos e adicionar `atualizarConfigSociais` (server fn com `requireSupabaseAuth` + checagem de `platform_admins`, mesmo padrão de `atualizarConfigVendas`, incluindo registro em `audit_logs`).
- `src/hooks/use-plataforma-config.ts`: adicionar `useAtualizarConfigSociais` invalidando a mesma query key.
- `src/components/superadmin/sociais-config-card.tsx` (novo): formulário do card, seguindo o estilo de `vendas-config-card.tsx`.
- `src/routes/superadmin.configuracoes.tsx`: renderizar o novo card.
- `src/routes/index.tsx`: renderizar os ícones no rodapé a partir de `usePlataformaConfig()` (já consumido na página).
- Ícones: lucide (`Instagram`, `Facebook`, `Youtube`, `Linkedin`, `Twitter` para o X); TikTok via SVG inline no arquivo de social links, pois não existe em lucide.
