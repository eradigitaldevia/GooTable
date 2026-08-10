# Ícone em português na tabela de tipos de chamado

## Problema
Na aba **Configurações** da página Chamados, a coluna **Ícone** mostra o valor técnico armazenado no banco (`bell`, `receipt`, `coffee`, `hand`) em vez do rótulo em português já usado no seletor do formulário (Sino, Conta, Bebida, Mão).

## Correção
Exibir na coluna Ícone o rótulo em português correspondente, usando a lista `ICONES` que já existe no próprio arquivo da página. Caso o valor não esteja na lista, mantém o valor original como fallback.

## Detalhe técnico
- Arquivo: `src/routes/_authenticated/admin/chamados.tsx`
- Linha 331: substituir `{t.icone}` por uma busca do `label` em `ICONES` (`ICONES.find(i => i.value === t.icone)?.label ?? t.icone`).
- Nenhuma alteração de banco, de dados salvos ou de outras telas.
