## Objetivo

Adicionar validação inline e alertas de pré-requisito ao formulário de comissão para evitar configurações inconsistentes e orientar o admin antes de salvar.

## Frente 1 — Validação inline do percentual QR

Em `src/components/configuracoes/comissao-modo-form.tsx`:

- Calcular `percentualPedidoClienteInvalido` derivado de `percentualPedidoCliente`:
  - válido quando vazio (usa padrão);
  - válido quando `Number(valor.replace(",", "."))` é finito e está entre 0 e 100;
  - inválido caso contrário.
- Aplicar `aria-invalid` e classe `border-destructive` no `<Input>` quando inválido.
- Renderizar mensagem `<p>` abaixo do input: "Use um valor entre 0 e 100." em `text-destructive` quando inválido.
- Expor o estado de validade via nova prop callback `onValidityChange?: (valid: boolean) => void` (chamada em `useEffect` quando o valor muda), para o pai poder desabilitar o botão Salvar — alinhado ao padrão já usado para PIX.

Em `src/routes/_authenticated/admin/configuracoes.tsx`:

- Novo estado local `comissaoFormValido` (default `true`).
- Passar `onValidityChange={setComissaoFormValido}` para `<ComissaoModoForm />`.
- Desabilitar o botão "Salvar alterações" quando `!comissaoFormValido` (mantém também o `toast.error` existente em `save()` como segunda linha de defesa).

## Frente 2 — Alertas de pré-requisito

Levantar dados leves em `src/routes/_authenticated/admin/configuracoes.tsx`:

- `useGarcons(restaurante.id, false)` para garçons ativos.
- `useAtribuicoesMesasMulti(restaurante.id)` para contar mesas sem garçom.

Calcular três sinais e passar como props para `<ComissaoModoForm />`:

- `semGarcons: boolean` — nenhum garçom ativo cadastrado.
- `todosGarconsZerados: boolean` — há garçons, mas todos com `percentual_comissao === 0` **e** o campo de % específico para QR está vazio.
- `mesasSemGarcom: number` — quantidade de mesas sem garçom atribuído (só usado quando `comissao_pedido_cliente` está ON).

Em `comissao-modo-form.tsx`, adicionar bloco de alertas no topo do card (acima do RadioGroup), renderizando condicionalmente cada item:

- **Sem garçons cadastrados** (sempre que `semGarcons`):
  - tom `bg-amber-500/10` + ícone `AlertTriangle`.
  - Texto: "Nenhum garçom cadastrado. A comissão só terá efeito após cadastrar garçons em Garçons → Garçons."
  - Link para `/admin/garcons?tab=garcons` usando `<Link>` do TanStack Router.

- **Garçons com 0%** (quando `todosGarconsZerados` e `!semGarcons`):
  - tom `bg-amber-500/10` + ícone `AlertTriangle`.
  - Texto: "Os garçons cadastrados estão com 0% de comissão. Defina o percentual em cada garçom ou preencha um % específico para pedidos do cliente."
  - Link para `/admin/garcons?tab=garcons`.

- **Mesas sem garçom** (quando `comissao_pedido_cliente` ON e `mesasSemGarcom > 0`):
  - tom `bg-amber-500/10` + ícone `AlertTriangle`.
  - Texto: "{n} mesa(s) sem garçom atribuído. Pedidos do cliente nessas mesas ficarão sem comissão." (mesma copy do `mesas-garcom-panel`).
  - Link para `/admin/garcons?tab=mesas`.

Cada alerta usa o mesmo padrão visual já presente em `mesas-garcom-panel.tsx` (flex + ícone + texto) para manter consistência.

## Arquivos a alterar

- `src/components/configuracoes/comissao-modo-form.tsx` — novas props (`semGarcons`, `todosGarconsZerados`, `mesasSemGarcom`, `onValidityChange`), bloco de alertas, validação inline do input.
- `src/routes/_authenticated/admin/configuracoes.tsx` — chamadas `useGarcons` + `useAtribuicoesMesasMulti`, cálculo dos sinais, estado `comissaoFormValido`, props passadas e `disabled` no botão Salvar.

## Fora de escopo

- Frente 3 (coerência entre flags).
- Mudanças no banco, em triggers, em RLS ou em qualquer outra função.
- Alterações no painel de Garçons (`mesas-garcom-panel.tsx`) — os alertas em Configurações são adicionais, não substitutivos.
- Bloqueio técnico de salvar quando há alertas (são apenas orientativos; só o input inválido bloqueia).

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.
NÃO refatore, otimize, melhore ou modifique código não relacionado.
NÃO faça suposições.
Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.
Preserve 100% do comportamento e da funcionalidade existentes.