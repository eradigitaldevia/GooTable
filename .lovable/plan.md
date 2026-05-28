## Objetivo

Permitir que o admin abra uma cópia **somente leitura** da área do garçom (rota `/sala`) para qualquer garçom do seu restaurante, reaproveitando os componentes existentes e sem expor ações que possam alterar dados ou distorcer auditoria.

## Escopo

- Visualização da tela completa da Sala do garçom selecionado: abas **Prontos**, **Mesas** e **Chamados**, com mesmos cards, contagens e cabeçalho.
- Apenas leitura: nenhum botão de "Confirmar entrega" ou "Atender chamado".
- Atualização em tempo real (realtime) mantida para refletir o estado vivo, igual o garçom vê.
- Indicação visual clara de que é uma visualização do admin.

## Fora de escopo

- Não muda RLS, schema, policies ou comportamento do garçom real.
- Não cria ações "agir como garçom".
- Não altera a rota `/sala` existente nem seus hooks de mutação.

## Mudanças

### 1. Server function nova — `carregarSalaAdminFn`
Arquivo: `src/lib/sala.functions.ts` (adiciona, não altera a existente).

- Recebe `{ garcomId: string }`.
- Usa `requireSupabaseAuth` (RLS já garante que só membros do restaurante leem os dados).
- Busca o garçom por `id` (em vez de `user_id = auth.uid()`), valida `ativo`.
- A partir daí, reproduz exatamente a lógica de `carregarSalaFn` (mesas atribuídas, pedidos prontos, chamados pendentes) e retorna o mesmo tipo `SalaDados`.
- Se o garçom não pertence a um restaurante do qual o usuário é membro, o próprio RLS devolve vazio → função retorna `null`.

### 2. Hook novo — `useSalaAdmin(garcomId)`
Arquivo: `src/hooks/use-sala.ts` (adiciona, não altera os hooks atuais).

- `useQuery` chamando `carregarSalaAdminFn` com `queryKey: ["sala-admin", garcomId]`.
- Reaproveita `useRealtimeSala` (já é parametrizado por `restauranteId` + `mesaIds`) — porém invalidando a key `["sala-admin", garcomId]` em vez de `SALA_KEY`. Para isso, generalizar `useRealtimeSala` aceitando uma `queryKey` opcional (default = `SALA_KEY`, preservando o comportamento atual).

### 3. Rota nova — `/_authenticated/admin/garcons/$garcomId/sala`
Arquivo: `src/routes/_authenticated/admin/garcons.$garcomId.sala.tsx`.

- Estrutura idêntica a `sala.tsx`, mas:
  - Usa `useSalaAdmin(garcomId)` em vez de `useSalaDados()`.
  - Renderiza `PratosProntosList`, `MinhasMesasGrid` e `ChamadosList` **sem** os callbacks `onConfirmarEntrega` / `onAtender` (passa `undefined`).
  - Banner fixo no topo: *"Visualizando como [Nome do garçom] — modo somente leitura"* + botão "Voltar" para `/admin/garcons`.
  - Não importa `useConfirmarEntregaSala` nem `useAtenderChamadoSala`.

### 4. Componentes read-only
Arquivos: `src/components/sala/pratos-prontos-list.tsx` e `src/components/sala/chamados-list.tsx`.

- Tornar opcionais as props `onConfirmarEntrega` / `onAtender` e `pendingId`. Quando ausentes, ocultar o botão de ação (mantém todo o resto: layout, badges, info do pedido/chamado).
- `MinhasMesasGrid` já é puramente visual; nenhuma mudança.
- `SalaHeader`: aceitar prop opcional `readOnly` para esconder/ajustar qualquer ação que dispare navegação interna da sala — confirmar ao abrir o arquivo se há algo a esconder.

### 5. Ponto de entrada no admin
Arquivo: `src/components/admin/garcons/garcons-roster.tsx`.

- Adicionar botão **"Visualizar área"** (ícone `Eye`) em cada linha do roster, ao lado dos botões existentes (Extrato, Editar, etc.), que navega para `/admin/garcons/$garcomId/sala`.

## Considerações

- **Sem mudança de schema/RLS**: admin já é `is_restaurante_membro`, então leitura via cliente Supabase autenticado funciona.
- **Realtime**: o canal já filtra por `restaurante_id` e filtra mesas via `mesaSetRef`. Vai funcionar igual para o admin sem alteração de policies.
- **Auditoria preservada**: como não há mutações no modo admin, nenhum registro fica gravado como se fosse do garçom.
- **Performance**: query separada (`sala-admin/$garcomId`) não interfere no cache da sala do próprio garçom.
