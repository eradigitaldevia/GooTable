# Bloquear pedidos após a mesa ser liberada por ociosidade

Hoje, quando a rotina de ociosidade encerra a sessão, o app do cliente reabre tudo sozinho: ao carregar qualquer tela, o hook `useClienteMesa` detecta a sessão fechada e reabre automaticamente pelo telefone salvo no navegador; o carrinho ainda reenvia o pedido após reabrir. Resultado: dá para pedir de fora do restaurante.

A mudança remove essa reabertura silenciosa e passa a exigir uma ação explícita do cliente na tela do cardápio (a mesma tela que o QR abre), além de reforçar a validação no servidor.

## O que muda para o cliente

- Sessão ainda aberta: nada muda.
- Sessão liberada por ociosidade: ao abrir qualquer tela do cliente aparece a mensagem "Sua mesa foi liberada por inatividade. Leia o QR Code da mesa para pedir novamente" e o app volta para a tela de identificação (telefone), sem reabrir nada por conta própria.
- Se o cliente tentar enviar um pedido com sessão liberada, o pedido é recusado, o carrinho é preservado e ele é levado à tela de identificação.
- Sem janela de graça: o tempo tolerado já é o configurável em Configurações → Geral ("Liberar mesa sem pedido após (horas)").

## Escopo técnico

**Frontend**

- `src/hooks/use-cliente-mesa.ts`: na hidratação, quando `validarSessaoComandaFn` retorna inválida, apenas limpar a identidade do `localStorage` e expor um novo estado `sessaoEncerrada: true`. Não chamar `recuperarSessao` automaticamente. Manter `recuperarSessao` exportado apenas para uso explícito (ação do usuário), ou removê-lo se ninguém mais o chamar.
- `src/routes/m.$qrToken.tsx`: quando `sessaoEncerrada`, exibir aviso (toast/mensagem no topo da tela de identificação) e renderizar o fluxo normal de lookup por telefone / cadastro, que já cria sessão e comanda novas.
- `src/routes/m.$qrToken_.carrinho.tsx`: remover o retry silencioso de `enviarPedido`. Em erro de sessão/comanda indisponível, manter o carrinho, mostrar toast explicativo e navegar para `/m/$qrToken`.
- Demais telas do cliente que usam o hook (conta, minha conta, status) seguem o mesmo comportamento: redirecionar para a tela de identificação quando não houver identidade válida.

**Backend**

- `src/lib/pedidos.functions.ts` (`criarPedidoPublicoFn`): manter/garantir a checagem de sessão `aberta` + comanda pertencente à sessão, retornando erro com código claro `SESSAO_ENCERRADA` em vez da mensagem genérica atual.
- Aplicar a mesma verificação de sessão aberta nos fluxos públicos de cashback, cupom e conta (que já usam `assertClienteNaSessao`), padronizando o erro.

Sem migração de banco: nenhuma tabela ou coluna nova.
