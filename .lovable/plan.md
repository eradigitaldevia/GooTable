## Objetivo

Criar uma chave mestra que liga/desliga a geração de novas comissões de garçons. Default `true` (preserva comportamento atual). Quando desligada: o trigger no banco para de gerar novas linhas em `comissoes`, e a sub-configuração de "modo / rateio / pedido do cliente" some da tela. Histórico de comissões, telas operacionais e tudo mais permanece intacto.

## 1. Banco de dados (nova migration)

- Adicionar coluna `restaurantes.comissao_ativa boolean not null default true`.
- Atualizar `public.trg_pedido_gerar_comissao()`: ler `comissao_ativa` no mesmo `SELECT` dos outros campos e, se `false`, `RETURN NEW` antes de qualquer cálculo. Nenhuma outra alteração na função.

Sem mudanças em RLS, grants, outras tabelas, ou outros triggers.

## 2. Backend — server function

`src/lib/configuracoes.functions.ts`:

- Adicionar `comissao_ativa: z.boolean()` ao schema da aba `comissoes`.
- Incluir `comissao_ativa` no `update` do case `"comissoes"`.

`src/hooks/use-configuracoes.ts`:

- Adicionar `comissao_ativa: boolean` ao tipo do payload da aba `comissoes`.

## 3. UI — Configurações → aba Comissões

Arquivo: `src/routes/_authenticated/admin/configuracoes.tsx`

- Adicionar `comissao_ativa` ao `form`, ao `snapshot`, ao reset a partir de `restaurante` e ao `CAMPOS_POR_ABA.comissoes`.
- No `TabsContent value="comissoes"`, renderizar **no topo** um card novo com um switch "Pagar comissão a garçons" e um helper text curto explicando que, quando desligado, novos pedidos entregues não geram comissão (histórico é mantido).
- Quando `comissao_ativa === false`: **ocultar apenas o `<ComissaoModoForm />**` (modo por pedido/item, rateio, pedido do cliente, % específico). A seção "Atendimento cruzado" **continua visível** (é operacional, independe de comissão).
- Incluir `comissao_ativa` no payload do `salvar("comissoes", …)`.

Nenhuma alteração no componente `ComissaoModoForm` em si.

## 4. Telas não alteradas (confirmado)

- **Garçons → aba Comissões**: permanece visível mesmo com flag off (lista histórico que precisa ser pago).
- **Garçons → roster** (coluna "Comissão %"): inalterado.
- **Painel / Relatórios / Fechamento de caixa / Extrato do garçom**: inalterados.
- **Atendimento cruzado**: continua visível e funcional (controla operação de atendimento, não comissão).
- **Bônus por meta**, **repasse de taxa de serviço**, **repasse do couvert artístico**: inalterados, independentes da flag.

## Detalhes técnicos

- Coluna criada com `default true` → restaurantes existentes ficam ligados; nenhum efeito sobre o comportamento atual.
- Checagem no trigger é antes de qualquer leitura de `pedido_itens`/`pedido_garcons` → custo desprezível.
- Comissões já existentes em `comissoes` permanecem; apenas novas paradas de pedido em `entregue` deixam de inserir.
- Nada muda em `comissoes_taxa_servico`, `repasses_couvert_artistico`, `garcom_bonus`.

## Arquivos afetados

1. Nova migration SQL (coluna + atualização do trigger).
2. `src/lib/configuracoes.functions.ts`
3. `src/hooks/use-configuracoes.ts`
4. `src/routes/_authenticated/admin/configuracoes.tsx`

Confirma para eu implementar?  
Sim  
  
IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.