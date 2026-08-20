# Cliente na mesa depois da liberação automática

## O que acontece hoje (verificado no código)

A liberação automática só encerra sessões **vazias** (sem pedido e sem valor lançado), então nunca se perde consumo. O que se perde é o vínculo salvo no celular do cliente (`sessaoId` + `comandaId` em localStorage).

Comportamento atual, caso a caso:

1. **Cliente reabre a página do cardápio (`/m/<qr>`)**: já existe recuperação automática. O app valida a sessão salva; ao ver que está fechada, refaz a identificação pelo telefone guardado, abre nova sessão/comanda e mostra "Bem-vindo(a) de volta". O cliente **não precisa ler o QR de novo nem se identificar de novo**. A mesa volta a ficar "Aguardando pedido".

2. **Cliente ficou com a aba aberta e vai direto enviar o pedido pelo carrinho**: aqui está o problema. As telas de carrinho, conta e minha conta usam os IDs salvos, mas a rotina de recuperação está implementada apenas na tela do cardápio. O envio do pedido valida sessão e comanda no servidor e falha com "Sessão da mesa indisponível" / "Comanda indisponível". O cliente fica travado até voltar ao cardápio e recarregar.

Ou seja: **fazer um pedido não reabre a sessão sozinho hoje** — ele dá erro.

## Melhoria proposta

Tornar a recuperação de sessão global e transparente, em vez de exclusiva da tela do cardápio.

1. **Recuperação no próprio hook de identidade**: mover a lógica de reidratação (buscar pelo telefone salvo, receber nova sessão/comanda, regravar no localStorage) para dentro de `useClienteMesa`, de modo que qualquer tela do cliente (cardápio, carrinho, conta, minha conta) se recupere sozinha. A tela do cardápio mantém apenas o toast de boas-vindas e o tratamento de conflito de mesa.

2. **Rede de segurança no envio do pedido**: no clique de "Enviar pedido", se o servidor responder que a sessão/comanda está indisponível, revalidar a identidade uma vez e reenviar automaticamente. Se ainda falhar, mostrar mensagem clara pedindo para se identificar novamente.

3. **Mensagem de erro amigável**: substituir "Sessão da mesa indisponível" por um texto orientando o cliente, no caso raro em que a recuperação não for possível (telefone não encontrado, cliente em outra mesa, mesa inativa).

Nada muda nas regras de comissão, pagamento, couvert ou na rotina de liberação automática.

## Detalhes técnicos

- `src/hooks/use-cliente-mesa.ts`: além de `validarSessaoComandaFn`, chamar `buscarClientePorTelefoneFn` quando a validação falhar; expor `conflito` para a tela do cardápio tratar; manter `precisaRehidratarSessao` para compatibilidade.
- `src/routes/m.$qrToken.tsx`: remover o efeito de reidratação duplicado, consumindo o resultado do hook.
- `src/routes/m.$qrToken_.carrinho.tsx`: retry único em `enviarPedido` quando o erro for de sessão/comanda indisponível.
- Sem alterações de banco.
