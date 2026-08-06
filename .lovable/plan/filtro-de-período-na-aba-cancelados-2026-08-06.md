# Filtro de período na aba Cancelados

Adicionar um seletor rápido de período na aba **Cancelados** da página Pedidos, mantendo os campos de data existentes.

## Comportamento

- Novo campo "Período" com as opções: Últimos 7 dias, Últimos 30 dias, Últimos 60 dias e Personalizado.
- Padrão passa a ser **Últimos 7 dias** (hoje é 30 dias).
- Ao escolher um período, as datas "De" e "Até" são preenchidas automaticamente (De = hoje menos N dias, Até = hoje) e a lista recarrega.
- Se o usuário alterar manualmente "De" ou "Até", o seletor muda para "Personalizado" e as datas escolhidas são respeitadas.

## Detalhes técnicos

- Arquivo único: `src/components/pedidos/aba-cancelados.tsx`.
- Adicionar estado `periodo` ("7" | "30" | "60" | "custom") iniciando em "7", e inicializar `dataInicio` em hoje-7.
- Usar o componente `Select` do shadcn no mesmo grid dos campos de data (grid passa a ter 3 colunas em telas maiores).
- Nenhuma mudança no hook `usePedidosCancelados` nem no backend: continua enviando `dataInicio`/`dataFim`.
