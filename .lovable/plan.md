## Objetivo

Separar da aba **Identidade** os campos não-visuais (nome, CNPJ, telefone, endereço) e adicionar **horário de funcionamento** do restaurante. Quando o estabelecimento estiver fora do horário, o cardápio de delivery passa a ficar somente leitura (sem permitir finalizar pedido).

## Nome sugerido para a aba

Sugestão: **"Geral"** (curto, padrão de mercado, abriga informações do negócio + horário). Alternativas: "Negócio", "Informações". A aba Identidade fica focada apenas em logo/cores/tema do cardápio.

## Escopo

### 1. Reorganização da aba Identidade

- Mover de `IdentidadeForm` para a nova aba "Geral":
  - Campo **Nome do restaurante**
  - Bloco **Dados para impressão** (CNPJ, telefone, endereço)
- Identidade mantém: logo, paletas de cores, tema do cardápio e prévia ao vivo.
- O nome continua sendo passado para a prévia (apenas leitura na Identidade).

### 2. Nova aba "Geral"

Conteúdo:

- **Informações do restaurante**: nome, CNPJ, telefone, endereço.
- **Horário de funcionamento**:
  - 7 linhas (Dom–Sáb), cada uma com toggle "Aberto" + horário de abertura e fechamento (`HH:MM`).
  - Suporte a turno único por dia (ex.: 11:00–23:00). Horários que cruzam meia-noite são aceitos (fechamento < abertura).
  - Fuso horário fixo: America/Sao_Paulo (sem campo de fuso por enquanto).
  - Botão "Aplicar a todos os dias" para copiar o primeiro dia preenchido.
- Validação: se "Aberto" marcado, abertura e fechamento obrigatórios e diferentes.

### 3. Efeito no Delivery (somente leitura quando fechado)

- Cardápio público de delivery (`/delivery/$slug`) e o checkout passam a consultar o status "aberto agora".
- Quando fechado:
  - Banner no topo: "Estamos fechados no momento. Reabrimos {dia} às {hora}."
  - Botões "Adicionar ao carrinho" e "Finalizar pedido" desabilitados.
  - Server function de criação de pedido delivery rejeita com mensagem clara (defesa em profundidade).
- Quando aberto: comportamento atual inalterado.

### 4. Escopo NÃO incluído (confirmar se deseja agora)

- Não altera cardápio de mesa/QR (somente delivery).
- Sem múltiplos turnos por dia (ex.: 11–14 e 18–23).
- Sem feriados/exceções por data.
- Sem agendamento de pedido para abertura futura.

## Detalhes técnicos

### Banco

Migration adicionando à tabela `restaurantes`:

- `horario_funcionamento jsonb not null default '[]'::jsonb`
Formato:
  ```json
  [
    { "dia": 0, "aberto": false, "inicio": null, "fim": null },
    { "dia": 1, "aberto": true,  "inicio": "11:00", "fim": "23:00" },
    ...
  ]
  ```
  (`dia`: 0=Domingo … 6=Sábado)

Função SQL utilitária (usada pelo servidor):

- `public.restaurante_aberto_agora(restaurante_id uuid) returns boolean` — calcula em `America/Sao_Paulo` com base no JSON.

### Server functions (`src/lib/configuracoes.functions.ts`)

- Novo `aba: "geral"` no `atualizarConfiguracoesFn` com Zod validando: `nome`, `cnpj`, `telefone`, `endereco`, `horario_funcionamento`.
- Remover esses campos do payload da aba `identidade`.

### Delivery

- `src/lib/cardapio-publico.functions.ts` (ou equivalente do delivery): retornar `aberto_agora: boolean` + `proxima_abertura: { dia, hora } | null` via `restaurante_aberto_agora()` + cálculo simples.
- `src/lib/delivery.functions.ts` (criação de pedido): bloquear quando fechado.
- `src/components/delivery/delivery-header.tsx` + página `/delivery/$slug`: banner + desabilitar CTAs.

### Frontend Configurações

- Novo componente `src/components/configuracoes/geral-form.tsx` (informações + horário).
- Novo componente `src/components/configuracoes/horario-funcionamento-form.tsx`.
- `src/routes/_authenticated/admin/configuracoes.tsx`:
  - Adicionar `"geral"` ao enum `TabId` e ao `searchSchema` (default `"geral"`).
  - Inserir aba "Geral" como **primeira** da lista, antes de "Identidade".
  - Estado, dirty-tracking e payload de salvar replicados para a nova aba.
- Hook `useAtualizarConfiguracoes` (`src/hooks/use-configuracoes.ts`): novo variant `aba: "geral"` no `ConfigPayload`.

### Compatibilidade

- Restaurantes existentes recebem `horario_funcionamento = []` (sem horário). Regra: lista vazia ⇒ considerado **sempre aberto** (mantém comportamento atual do delivery até o lojista configurar).

## Perguntas antes de implementar

1. Confirma o nome **"Geral"** para a aba (ou prefere "Informações"/"Negócio")?
2. Turno único por dia está OK, ou precisa suportar 2 turnos (almoço/jantar) já nesta entrega?
3. Quando fechado, o cardápio delivery deve ficar **visível em somente leitura** (como descrito) ou **totalmente oculto** com tela "Fechado"?
4. Aplicar o bloqueio de horário apenas no **delivery**, ou também no **cardápio QR de mesa**?

Respostas:  
1. sim, Geral  
2. suportar 2 turnos (almoço/jantar) já nesta entrega  
3. o cardápio delivery deve ficar **visível em somente leitura** (como descrito)   
4. bloqueio de horário apenas no **delivery**