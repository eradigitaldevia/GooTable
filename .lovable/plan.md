# Corrigir o card Vendas (link do WhatsApp)

## O que está acontecendo hoje

O card já tem um campo, mas ele se chama "Número de WhatsApp" e só aceita dígitos. Como o valor salvo hoje está vazio (confirmado na base: `vendas_whatsapp` está nulo), a prévia cai automaticamente no e-mail comercial e o botão "Testar link" abre o cliente de e-mail. Por isso parece que falta o campo do link.

## O que muda

1. **O campo passa a aceitar número ou link completo**
   - Rótulo: "WhatsApp de vendas (número ou link)".
   - Aceita `(88) 99999-9999`, `5588999999999`, `https://wa.me/5588...`, `https://api.whatsapp.com/send?phone=...` e `https://wa.me/message/XXXX` (link de convite do WhatsApp Business).
   - Quando for um link, ele é usado como está (apenas a mensagem é anexada quando o link ainda não tem texto).

2. **Prévia mais clara**
   - Mostra o link final do WhatsApp com o botão "Testar link".
   - Quando o campo está vazio, a prévia avisa que o CTA "Fale com vendas" fica oculto até um WhatsApp ser configurado (sem fallback de e-mail).


3. **Sem mudanças visuais além do card** — landing e login continuam consumindo o mesmo helper, então passam a abrir o WhatsApp assim que o valor for salvo.

## Detalhes técnicos

- `src/lib/vendas-link.ts`: estender `montarLinkVendas` para detectar URL (`^https?://`) de domínios do WhatsApp e devolvê-la como href, preservando o comportamento atual para números e o fallback `mailto:`.
- `src/components/superadmin/vendas-config-card.tsx`: ajustar rótulo, placeholder, texto de ajuda e o bloco de prévia.
- `src/lib/plataforma.functions.ts`: nenhuma mudança de schema — o campo já é texto até 30 caracteres; aumentar o limite para 200 para caber URLs.
- Nenhuma migração de banco é necessária (a coluna é `text`).
