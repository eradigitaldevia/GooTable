# Taxa de entrega por bairro no Delivery

## Objetivo

O restaurante cadastra os bairros que atende, cada um com sua própria taxa. Quando o cliente informa o endereço de entrega, o app identifica o bairro e cobra a taxa certa automaticamente. Retirada no balcão continua sem taxa.

## Como vai funcionar para o restaurante (Admin > Configurações > Delivery)

- Nova seção **"Taxa por bairro"** com uma chave liga/desliga.
  - Desligada: tudo continua igual ao de hoje (taxa única).
  - Ligada: a cobrança passa a seguir a tabela de bairros.
- Tabela de bairros: nome, taxa (R$), ativo sim/não. Ações de adicionar, editar e excluir (com confirmação no padrão do app).
- Opção configurável **"Bairro fora da lista"**:
  - **Bloquear pedido** — mostra "Não entregamos neste bairro".
  - **Cobrar taxa padrão** — usa a taxa única atual como reserva.

## Como vai funcionar para o cliente (endereço de entrega)

- No formulário de endereço, o campo Bairro vira uma lista com os bairros cadastrados e a taxa ao lado de cada um.
- Se a opção for "Cobrar taxa padrão", a lista inclui "Outro bairro", que abre um campo para digitar o nome e aplica a taxa padrão.
- Se for "Bloquear", só os bairros da lista podem ser escolhidos.
- A taxa aparece na hora no resumo/checkout e o total é atualizado.
- Endereços salvos do cliente: ao reutilizar um, o app reconhece o bairro pelo nome (sem diferenciar acentos/maiúsculas); se não reconhecer, aplica a regra acima.

## Segurança do valor

- O servidor sempre recalcula a taxa pelo bairro informado, ignorando qualquer valor vindo do navegador. Bairro fora da lista com regra "Bloquear" é rejeitado também no servidor.

## Fora do escopo

- Cobrança por distância (km), mapas e CEP automático.
- Mudanças em pedidos de mesa, Kanban, relatórios e taxa única existente (preservada).

## Detalhes técnicos

- Migração:
  - Tabela `delivery_bairros` (id, restaurante_id, nome, nome_normalizado via `unaccent+lower`, taxa numeric >= 0, ativo, ordem, timestamps; único por restaurante+nome_normalizado). GRANT + RLS: membros admin gerenciam; leitura pública feita apenas pelo servidor.
  - Colunas em `restaurantes`: `delivery_taxa_por_bairro boolean default false`, `delivery_bairro_fora_lista text default 'bloquear'` (`bloquear` | `taxa_padrao`).
- `src/lib/configuracoes.functions.ts` + `src/hooks/use-configuracoes.ts`: CRUD dos bairros e dos dois novos campos.
- Novo `src/components/configuracoes/delivery-bairros-card.tsx` usado em `delivery-form.tsx` (mantém o form abaixo de 150 linhas).
- `src/lib/delivery.functions.ts`: carregar bairros ativos no dado público do restaurante; função `resolverTaxaEntrega(bairro)` usada no ponto onde hoje se lê `delivery_taxa_entrega` (passo 10), com erro amigável no bloqueio.
- `src/components/delivery/endereco-form.tsx`: seletor de bairro + "Outro bairro" condicional.
- `src/routes/delivery.$slug.tsx`: taxa exibida passa a vir do bairro escolhido.
- Teste Vitest para a regra: bairro cadastrado cobra sua taxa; fora da lista bloqueia ou usa taxa padrão conforme configuração; retirada = 0.

&nbsp;

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.