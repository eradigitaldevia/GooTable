# Diagnóstico: botão "+" da mesa não abre nada

## Causa raiz

No TanStack Router (convenção de pontos), o arquivo `src/routes/_authenticated/sala.nova-comanda.$mesaId.tsx` é tratado como **rota filha** de `src/routes/_authenticated/sala.tsx`, porque o nome começa com `sala.`.

Para que uma rota pai renderize seus filhos, ela precisa ter um `<Outlet />` no componente. O `SalaPage` em `sala.tsx` renderiza a UI da sala diretamente (header + tabs) e **não tem `<Outlet />`**.

Resultado quando o garçom clica no "+":
- A URL muda corretamente para `/sala/nova-comanda/<mesaId>`.
- A rota filha "casa", mas não há onde ser renderizada.
- Visualmente o garçom continua vendo a tela da sala — parece que "nada acontece".

Isso bate exatamente com o sintoma descrito ("nada foi exibido").

## Solução proposta

A página de nova comanda é uma tela cheia, com header próprio e botão "voltar". Ela **não deve** herdar o layout da sala. A correção mais limpa é desacoplar a rota filha do layout pai usando o sufixo `_` do TanStack:

- Renomear `src/routes/_authenticated/sala.nova-comanda.$mesaId.tsx` para `src/routes/_authenticated/sala_.nova-comanda.$mesaId.tsx`.
- O `_` final em `sala_` mantém o mesmo path (`/sala/nova-comanda/:mesaId`) mas remove o aninhamento de layout — a rota passa a renderizar fora de `sala.tsx`.
- Não é preciso mexer no `beforeLoad`, no componente, nem nos `Link`s existentes.

Após renomear, o `routeTree.gen.ts` será regenerado automaticamente pelo plugin do Vite.

## Verificação

1. Login como garçom.
2. Em "Mesas", clicar no botão "+" de uma mesa.
3. A tela de nova comanda (cardápio denso + carrinho) deve abrir em tela cheia.
4. Voltar pela seta deve retornar para `/sala`.

## Fora de escopo

- Não mexer no layout/UI da nova comanda.
- Não alterar `sala.tsx` (continua sem `<Outlet />` por design).
- Outras rotas que usem padrão similar (ex.: `sala_.$garcomId.sala.tsx` em admin) já estão corretas.
