# Identificação do cliente: limite adaptativo e recuperação

Quatro etapas independentes, na ordem de implementação. Cada uma pode ser entregue e testada isoladamente.

## Etapa 1 — Limite de tentativas adaptativo

Hoje o controle é uma janela fixa de 10 minutos (5 falhas por QR, 3 por telefone) que zera por completo ao final. Passa a ser progressivo:

- Separar as tentativas de "buscar telefone" das de "confirmar identidade", para que cada uma tenha seu próprio limite.
- Bloqueio temporário crescente conforme as falhas recentes (janela de 30 minutos): 3 falhas → 1 minuto de espera; 5 → 5 minutos; 8 → 30 minutos; 12 → 2 horas.
- Continua contando por mesa (QR) e por telefone, em paralelo.
- A tela passa a mostrar quanto tempo falta para tentar de novo, em vez de uma mensagem genérica sem saída.
- Um acerto zera o histórico de falhas daquele telefone.

## Etapa 2 — Sair do impasse sem reexpor a outra mesa

Depois de 2 erros na confirmação, aparece a opção "Não consigo confirmar":

- O cliente segue como novo cadastro na mesa atual, com comanda própria.
- Nada da outra mesa é exibido, alterado ou vinculado — nem nome, nem número da mesa, nem consumo.
- A junção do histórico/cashback com o cadastro antigo fica para o admin resolver depois, pela área interna.

## Etapa 3 — Ajuda presencial

Botão "Chamar garçom para me identificar" na mesma tela de confirmação:

- Abre um chamado do tipo existente na mesa, para o garçom validar a pessoa presencialmente e vincular pela área interna.
- Mensagem de confirmação simples ("Garçom a caminho"), sem revelar nada do cadastro.

## Etapa 4 — Limpeza automática do histórico de tentativas

- Rotina diária removendo registros de tentativas com mais de 7 dias, para a tabela não crescer indefinidamente.
- Os registros de auditoria de falhas permanecem.

## Detalhes técnicos

- `identificacao_tentativas`: nova coluna `escopo` (`lookup` | `confirmacao`, default `lookup`) e índice por (`restaurante_id`, `telefone_hash`, `criado_em`) e (`restaurante_id`, `qr_token`, `criado_em`).
- `src/lib/identificacao-throttle.server.ts`: `identificacaoBloqueada` passa a receber `escopo` e retornar `{ bloqueado, bloqueadoAte }`, calculando o nível de backoff a partir da contagem de falhas em 30 min e do timestamp da última falha. `registrarTentativaIdentificacao` grava o escopo.
- `src/lib/cliente-mesa.functions.ts`: `buscarClientePorTelefoneFn` usa escopo `lookup`; `confirmarIdentidadeConflitoFn` usa `confirmacao` e devolve `bloqueadoAte` no erro. Nova server fn `entrarSemVincularFn` (Etapa 2) cria cliente novo na mesa do QR — reaproveita `entrarComClienteExistente` após criar o cadastro; nunca lê o cliente conflitante. Nova server fn para abrir chamado (Etapa 3) usando `chamados_garcom` + `tipos_chamado` da mesa do QR.
- `src/components/cliente/confirmar-identidade-step.tsx`: contador local de erros, exibição do tempo de espera, botões "Não consigo confirmar" e "Chamar garçom".
- `src/routes/m.$qrToken.tsx`: liga os dois novos caminhos ao fluxo já existente de confirmação.
- Etapa 4: função SQL de limpeza agendada via pg_cron (mesmo padrão de `encerrar_sessoes_ociosas`).
