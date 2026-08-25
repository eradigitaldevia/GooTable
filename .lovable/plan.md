# Corrigir o card Vendas (link do WhatsApp)

## O que está acontecendo hoje

O card já tem um campo, mas ele se chama "Número de WhatsApp" e só aceita dígitos. Como o valor salvo hoje está vazio (confirmado na base: `vendas_whatsapp` está nulo), a prévia cai automaticamente no e-mail comercial e o botão "Testar link" abre o cliente de e-mail. Por isso parece que falta o campo do link.

## O que muda

1. **Dois campos no card**
   - **Número do WhatsApp de vendas** (existente) — número local, DDI 55 automático.
   - **Link alternativo do WhatsApp** (novo) — aceita `https://wa.me/...`, `https://api.whatsapp.com/send?phone=...` e `https://wa.me/message/XXXX` (link de convite do WhatsApp Business).
   - Quando preenchido, o **link** tem prioridade: a prévia e os CTAs usam ele como href.
   - Se o link estiver vazio, a prévia volta a usar o número como antes.

2. **Remover o fallback de e-mail**
   - Quando não houver número nem link, o CTA "Fale com vendas" fica inativo (sem `mailto:`).

3. **Prévia mais clara**
   - Mostra o link final do WhatsApp com o botão "Testar link".
   - Quando ambos os campos estiverem vazios, a prévia avisa que o CTA "Fale com vendas" fica inativo até um WhatsApp ser configurado (sem fallback de e-mail).

4. **Sem mudanças visuais além do card** — landing e login continuam consumindo o mesmo helper, então passam a abrir o WhatsApp assim que o link/número for salvo.

## Detalhes técnicos

- Banco: adicionar coluna `vendas_link text` em `public.plataforma_config`.
- `src/lib/vendas-link.ts`: estender `montarLinkVendas` para aceitar `link` e devolvê-lo quando presente; usar número como fallback; remover o fallback `mailto:` (sem número/link válido, devolve `null`; a landing e login desativam o CTA "Fale com vendas" nesse caso, sem ocultá-lo).
- `src/components/superadmin/vendas-config-card.tsx`: adicionar o novo input de link, ajustar rótulo, placeholder, texto de ajuda e o bloco de prévia.
- `src/lib/plataforma.functions.ts`: incluir `vendas_link` no tipo, no GET e no POST.
