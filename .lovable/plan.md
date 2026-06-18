## Contexto

Na aba **Geral** de Configurações, a seção "Dados para impressão" lista apenas CNPJ, Telefone e Endereço. O **Nome do restaurante** fica em um campo separado acima e o texto auxiliar atual diz que "CNPJ, telefone e endereço aparecem no cabeçalho dos comprovantes", o que dá a impressão de que o nome **não** é impresso.

Verifiquei `src/components/impressao/comprovante-conta.tsx`: o nome **já é impresso** (em negrito, no topo do cabeçalho), junto com CNPJ, endereço e telefone. Ou seja, o comportamento de impressão já está correto — o que confunde é apenas a UI da tela de Configurações.

## Mudança proposta (apenas UI / texto)

Arquivo único: `src/components/configuracoes/geral-form.tsx`

1. Ajustar o texto auxiliar do campo **Nome do restaurante** para deixar claro que ele também aparece no comprovante impresso.
  - De: (sem helper)
  - Para: algo como *"Aparece em destaque no cabeçalho dos comprovantes impressos."*
2. Ajustar o texto auxiliar da seção **Dados para impressão** para refletir que ela complementa o nome (que já está acima).
  - De: *"Aparecem no cabeçalho dos comprovantes impressos pelo garçom e pelo caixa. Campos opcionais — só aparece o que estiver preenchido."*
  - Para: *"Complementam o nome do restaurante no cabeçalho dos comprovantes impressos. Campos opcionais — só aparece o que estiver preenchido."*

## Fora de escopo

- Nenhuma mudança em backend, schema, componente de impressão, layout ou regras.
- Nenhuma mudança em outras abas/arquivos.

## Pergunta

Confirma essa abordagem (somente texto auxiliar), ou prefere que eu **mova o campo Nome para dentro da seção "Dados para impressão"** visualmente, mantendo-o como o primeiro campo do bloco?  
  
resposta: Confirmo essa abordagem (somente texto auxiliar)