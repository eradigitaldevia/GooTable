# Substituir confirmação nativa do cancelamento de pedido (aba "Em aberto")

Na aba **Em aberto (auditoria)** da página Pedidos, o botão "x" (cancelar pedido) usa a caixa de diálogo nativa do navegador. Vamos trocar pelo diálogo padrão da aplicação, igual ao usado no cancelamento em lote.

## O que muda

- Ao clicar no "x" de uma linha, abre um diálogo no estilo da aplicação: título "Cancelar este pedido?", texto explicando que a ação não pode ser desfeita, com campo opcional de motivo.
- Botões: "Voltar" e "Confirmar cancelamento" (destrutivo), com estado de carregando enquanto processa.
- Comportamento atual mantido: mesma mutação, mesmo toast de sucesso/erro.

## Detalhes técnicos

- Arquivo: `src/components/pedidos/aba-em-aberto.tsx`.
- Remover o `confirm()` de `handleCancelarUm`; guardar em estado o `pedidoId` alvo e renderizar o diálogo.
- Reutilizar `CancelarLoteDialog` (`src/components/pedidos/cancelar-lote-dialog.tsx`) com `quantidade={1}`, ou um `AlertDialog` local no mesmo padrão — preferência por reutilizar o componente existente para manter consistência visual e evitar duplicação.
- Motivo padrão continua "Cancelado via auditoria" quando o campo for deixado vazio.

Nenhuma alteração de backend, de regra de negócio ou de layout fora desse botão.
