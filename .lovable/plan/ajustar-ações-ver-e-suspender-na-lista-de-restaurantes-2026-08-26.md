# Ajustar ações "Ver" e "Suspender" na lista de restaurantes

## Problemas confirmados

1. **"Ver" não faz nada** — a rota de detalhe (`superadmin.restaurantes.$id.tsx`) é filha da rota da lista (`superadmin.restaurantes.tsx`), e a lista não renderiza área de conteúdo filho. Resultado: a URL muda, mas a tela continua exibindo a lista.
2. **"Suspender"/"Reativar" e "Excluir" usam o alerta nativo do navegador** (`confirm()`), fora do padrão visual da aplicação.

## O que será feito

- Tornar a página de detalhe do restaurante independente da lista, para que "Ver" (e o clique no nome) abra realmente a tela de detalhe.
- Substituir os dois avisos nativos por diálogos de confirmação no padrão da aplicação:
  - Suspender: título "Suspender restaurante?" com o nome e aviso de que cardápio, delivery e novos pedidos ficam bloqueados; botão "Suspender".
  - Reativar: mesmo diálogo com texto e botão "Reativar".
  - Excluir: diálogo destrutivo, com aviso de exclusão definitiva de todos os dados; botão "Excluir".
- Botões com estado de carregando enquanto a ação é processada; os avisos de sucesso/erro atuais continuam iguais.

## Detalhes técnicos

- Renomear `src/routes/superadmin.restaurantes.$id.tsx` para `src/routes/superadmin.restaurantes_.$id.tsx` (rota irmã, não aninhada). Nenhuma mudança de URL: continua `/superadmin/restaurantes/$id`. Ajustar o `createFileRoute` correspondente.
- Em `src/routes/superadmin.restaurantes.tsx`: remover os `confirm()`; adicionar estados `suspenderAlvo` e `excluirAlvo` e dois `AlertDialog` (shadcn) já usados no projeto, chamando `setAtivo.mutateAsync` / `excluir.mutateAsync` na confirmação.
- Nenhuma alteração em `restaurante-row.tsx` além do necessário (nada previsto), nem em hooks/back-end.
