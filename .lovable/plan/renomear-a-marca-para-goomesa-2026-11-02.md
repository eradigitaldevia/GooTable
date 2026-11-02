# Renomear a marca para GooMesa

Trocar apenas o nome da plataforma ("Mesa" / "Mesa Express") por **GooMesa**. A palavra "Mesa" usada no sentido de mesa do restaurante (Mesa 01, "Mesa indisponível", colunas "Mesa", QR por mesa etc.) **não** será alterada. Visual, cores e textos restantes permanecem iguais.

## O que muda

- Página inicial: logo no topo e rodapé "© ano GooMesa…"; título/descrição próprios da página.
- Títulos e descrições de compartilhamento (Google, WhatsApp, redes): "GooMesa — Pedidos por QR Code para restaurantes"; descrição em português substituindo "Mesa Express is a modern…".
- Telas de entrada: login, cadastro, esqueci a senha, redefinir senha (nome ao lado do ícone).
- Páginas legais: Termos de Uso, Política de Privacidade, Direitos do titular (títulos, descrições e textos "plataforma Mesa") e o cabeçalho do layout legal.
- Mensagem padrão de contato de vendas: "Olá! Quero conhecer o sistema GooMesa."
- Comentário do sistema de design (sem efeito visual).

## Arquivos afetados

- src/routes/__root.tsx
- src/routes/index.tsx
- src/routes/login.tsx, cadastro.tsx, forgot-password.tsx, reset-password.tsx
- src/routes/termos.tsx, privacidade.tsx, direitos.tsx
- src/components/legal/legal-layout.tsx
- src/lib/vendas-link.ts
- src/styles.css (apenas comentário)

## Fora do escopo

- Domínios (registro/conexão de goomesa.com / .com.br) — pode ser feito depois.
- Mensagem de vendas já salva no painel Superadmin, se tiver sido personalizada (fica como está).
- Nenhuma alteração de banco, regras ou layout.

&nbsp;

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.