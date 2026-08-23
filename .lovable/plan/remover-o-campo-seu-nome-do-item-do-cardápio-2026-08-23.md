# Remover o campo "Seu nome" do item do cardápio

## Situação atual

O cliente já se identifica na entrada da mesa (leitura do QR + telefone/nome), e essa identidade fica salva na sessão.

No envio do pedido, cada item usa `cliente_nome` do item **ou**, se vazio, o nome da identidade da sessão — tanto no fluxo do carrinho quanto no fluxo direto da página da mesa. Ou seja, deixar o campo em branco já resulta no nome correto.

Além disso, o carrinho já permite editar o nome por item (útil quando uma pessoa pede para outra na mesma mesa).

Conclusão: o campo "Seu nome (para dividir a conta)" dentro do diálogo do produto é redundante e adiciona atrito na hora de adicionar o item.

## Proposta

Remover o campo "Seu nome" do diálogo do produto no cardápio do cliente, mantendo:

- o nome da sessão como padrão automático em cada item;
- a edição de nome por item no carrinho, para o caso de pedir para outra pessoa.

O campo "Observação (opcional)" continua no diálogo, sem auto-foco.

## Detalhes técnicos

- `src/components/cliente/produto-dialog.tsx`: remover o `Input` de nome, o `Label` associado, o estado `nome` e o reset dele; deixar de enviar `cliente_nome` no `onAdd` (o fallback para a identidade da sessão já ocorre a jusante).
- Nenhuma alteração em banco, em server functions ou no tipo `CartItem` (o campo continua opcional e é usado pelo carrinho).
- Sem mudanças no fluxo de divisão de conta: a agregação por cliente segue usando `cliente_nome` do item ou o cliente autor.

## Critério de aceitação

- Ao abrir um produto, aparece apenas descrição, preço, observação e quantidade.
- O item adicionado aparece na conta com o nome do cliente identificado.
- No carrinho, ainda é possível trocar o nome de um item específico.
