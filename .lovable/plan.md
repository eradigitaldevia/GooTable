Desabilitar os botões de ação na área do garçom em modo somente leitura (admin), mantendo-os visíveis para preservar a visão real da página.

## Arquivos afetados

1. **`src/components/sala/minhas-mesas-grid.tsx`**
   - Adicionar prop opcional `readOnly?: boolean`.
   - Quando `readOnly` for `true`, renderizar o botão `+` como `<Button disabled>` (sem `<Link>`), em vez do `<Link to="/sala/nova-comanda/$mesaId">` atual.
   - Quando `readOnly` for `false`/omitido, manter exatamente o comportamento atual.

2. **`src/components/sala/pratos-prontos-list.tsx`**
   - Adicionar prop opcional `readOnly?: boolean`.
   - Quando `readOnly` for `true`, renderizar o botão "Confirmar entrega" como `disabled` (em vez de ocultá-lo quando `onConfirmarEntrega` é ausente).
   - Comportamento atual (ocultar quando callback ausente) permanece para os demais call sites.

3. **`src/components/sala/chamados-list.tsx`**
   - Adicionar prop opcional `readOnly?: boolean`.
   - Quando `readOnly` for `true`, renderizar o botão "Atender" como `disabled`.
   - Demais call sites mantêm comportamento atual.

4. **`src/routes/_authenticated/admin/garcons_.$garcomId.sala.tsx`**
   - Passar `readOnly` para os três componentes (`MinhasMesasGrid`, `PratosProntosList`, `ChamadosList`).

## Fora de escopo

- Não alterar a rota `/sala` real (garçom).
- Não mexer em estilos, textos, banner amarelo, navegação ou qualquer outra lógica.
- Não tocar em arquivos não listados.

Confirma para eu aplicar?
