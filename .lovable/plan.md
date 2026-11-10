# Trocar a marca para GooTable (nome e logo)

## Objetivo
Substituir "GooMesa" por **GooTable** em toda a aplicação e usar o logo enviado (ícone de prato com QR Code, garfo e celular + texto "GooTable" em laranja e grafite).

## O que muda para quem usa
- **Página inicial**: logo novo no topo e no rodapé; textos "Por que o GooMesa?" e semelhantes passam a "GooTable".
- **Login, cadastro, esqueci a senha, nova senha**: logo novo e nome GooTable.
- **Termos, Privacidade e Direitos do titular**: nome da plataforma atualizado nos textos e no cabeçalho.
- **Título da aba do navegador e prévias de link** (WhatsApp, redes sociais): GooTable.
- **Ícone da aba (favicon)**: o ícone do logo (prato com QR Code), sem o texto, recortado em quadrado.
- **Suporte inteligente**: o assistente passa a se apresentar como suporte do GooTable.
- **Mensagem pronta do botão "Fale com vendas"**: "sistema GooTable".

## O que não muda
- A palavra "Mesa" como conceito do restaurante (Mesa 01, "Mesa indisponível", etc.).
- Cores, fontes e layout das telas (o logo entra no lugar do logo/nome atual, no mesmo tamanho).
- Os domínios: a troca de goomesa.com/.com.br para os novos domínios GooTable é feita à parte, quando você tiver registrado.

## Pontos para confirmar
1. O logo enviado tem fundo removido; sobre fundo escuro (se houver) o texto "Table" grafite pode ficar pouco legível. Se existir área escura, uso uma versão com o texto claro ou mantenho só o ícone — confirmar se prefere que eu gere essa variação.
2. Os textos legais (Termos/Privacidade) citam o nome da empresa/plataforma; serão trocados para "GooTable" apenas onde hoje está "GooMesa".

## Detalhes técnicos
- Logo enviado para a CDN de assets (`src/assets/gootable-logo.png.asset.json`) e importado nos componentes que hoje mostram a marca.
- Favicon: recorte do ícone salvo em `public/favicon.png`, link atualizado em `src/routes/__root.tsx`, `public/favicon.ico` removido se existir.
- Substituição de "GooMesa" → "GooTable" nos 19 arquivos encontrados: `__root.tsx`, `index.tsx`, `login.tsx`, `cadastro.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `termos.tsx`, `privacidade.tsx`, `direitos.tsx`, `_authenticated/admin/suporte.tsx`, `components/landing/*` (hero, footer, diferenciais, cta), `components/legal/legal-layout.tsx`, `components/suporte/suporte-chat.tsx`, `lib/suporte.functions.ts`, `lib/vendas-link.ts`, comentário em `styles.css`.
- Metatags (title, description, og:title, og:description) atualizadas em cada rota afetada.
- Verificação: busca final sem ocorrências de "GooMesa" e captura de tela da página inicial e do login.
