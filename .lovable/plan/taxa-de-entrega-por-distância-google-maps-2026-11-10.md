# Taxa de entrega por distância (Google Maps)

## Objetivo

Em Configurações > Delivery, o restaurante escolhe **um** modo de taxa:

1. **Taxa fixa única** (como hoje)
2. **Taxa por bairro** (como hoje)
3. **Taxa por distância** — calculada pela rota real de carro entre o restaurante e o cliente, com raio máximo.

No modo distância, o restaurante escolhe a forma de cobrança:

- **Faixas**: lista de "até X km → R$ Y" (ex.: até 3 km R$ 6; até 6 km R$ 10).
- **Base + por km**: R$ base cobre os primeiros N km, depois R$ por km extra (arredondado para cima ao 0,1 km).

Acima do raio máximo, o pedido de entrega é bloqueado com "Endereço fora da área de entrega". Sem mapa no checkout: o cliente vê só a distância e a taxa.

## O que o restaurante vê (Admin > Configurações > Delivery)

- Seletor "Como cobrar a entrega": Fixa / Por bairro / Por distância. Substitui o switch atual de taxa por bairro (o modo bairro continua igual).
- Quando escolher "Por distância":
  - **Endereço de saída do restaurante** (CEP com preenchimento automático + número). Ao salvar, o sistema localiza o endereço e mostra "Localizado: …" para conferência. Sem endereço localizado, o modo não pode ser ativado.
  - **Raio máximo (km)** — reaproveita o campo de raio que já existe.
  - Forma de cobrança: Faixas (tabela editável) ou Base + por km (3 campos).
  - Opção "Se não for possível calcular a distância": *Cobrar taxa fixa* ou *Bloquear pedido*.

## O que o cliente vê (checkout do delivery)

- Depois de preencher CEP (já automático) e número, aparece "Calculando taxa…" e depois "3,4 km · Taxa R$ 8,00".
- Fora do raio: "Endereço fora da área de entrega (máx. 8 km)" e o botão de enviar fica travado.
- O valor final é sempre recalculado no servidor ao receber o pedido.

## Custos e proteção de uso

O Google cobra por consulta. Para controlar:

- Consulta só quando CEP (8 dígitos) + número estão preenchidos, com espera de ~800 ms após digitar.
- **Cache no banco** por endereço normalizado + restaurante (30 dias): o mesmo endereço não é consultado de novo, nem no envio do pedido.
- Limite por restaurante (ex.: 300 consultas novas por dia) e por visitante (ex.: 10 por hora); acima disso aplica a opção de falha escolhida.
- Endereço do restaurante é localizado uma única vez, ao salvar.

## Detalhes técnicos

- **Conexão Google Maps**: conectar o Google Maps Platform (gerenciado pela Lovable). Chamadas apenas no servidor via gateway: Geocoding (`/maps/api/geocode/json`) e Routes (`/routes/directions/v2:computeRoutes`, `travelMode: DRIVE`, field mask `routes.distanceMeters,routes.duration`). Tratamento explícito de 403 e de rota não encontrada.
- **Banco (migração)**:
  - `restaurantes`: `delivery_modo_taxa` (`fixa|bairro|distancia`, default derivado de `delivery_taxa_por_bairro` no backfill), `delivery_origem_endereco`, `delivery_origem_lat`, `delivery_origem_lng`, `delivery_km_modelo` (`faixas|base_km`), `delivery_km_base_valor`, `delivery_km_base_km`, `delivery_km_valor_extra`, `delivery_km_falha` (`taxa_fixa|bloquear`). `delivery_taxa_por_bairro` mantido e sincronizado (não removido).
  - Nova `delivery_faixas_km` (restaurante_id, ate_km, taxa) com GRANTs + RLS (admin do restaurante gerencia; leitura pública via servidor).
  - Nova `delivery_distancia_cache` (restaurante_id, chave_endereco, distancia_m, duracao_s, criado_em) e contador de uso diário; acesso só pelo servidor.
- **Regra pura** `src/lib/taxa-distancia.ts` (faixas, base+km, raio) usada no servidor e no checkout, com testes Vitest (faixa limite, km extra arredondado, acima do raio bloqueia, falha → fixa/bloquear). `resolverTaxaEntrega` ganha o modo `distancia` sem alterar o comportamento de fixa/bairro.
- **Servidor**: `calcularDistanciaEntregaFn` (pública, por slug, valida endereço, usa cache e limites) e recálculo em `criarPedidoDeliveryFn`; `localizarOrigemFn` (admin autenticado). Salvar `distancia_km` no pedido (nova coluna nullable em `pedidos`) e exibir no detalhe do pedido.
- **Frontend**: novo card `delivery-distancia-card.tsx` + `delivery-faixas-km` em Configurações; hook `use-taxa-distancia.ts` (TanStack Query, debounce) no checkout; ajuste mínimo no resumo do pedido de `delivery.$slug.tsx`.
- **Limitação**: o comportamento real do Google Maps não pode ser testado aqui; será validado no app publicado.

## Arquivos afetados

- Migração do banco (nova)
- `src/lib/taxa-bairro.ts`, novo `src/lib/taxa-distancia.ts` + teste
- `src/lib/delivery.functions.ts`, novo `src/lib/delivery-distancia.functions.ts`
- `src/components/configuracoes/delivery-form.tsx`, novos `delivery-distancia-card.tsx`, `delivery-faixas-km.tsx`
- `src/routes/_authenticated/admin/configuracoes.tsx` (salvar novos campos)
- `src/routes/delivery.$slug.tsx`, novo `src/hooks/use-taxa-distancia.ts`
- `src/components/pedidos/delivery-info-section.tsx` (mostrar km)

&nbsp;

IMPORTANTE:

Execute APENAS a alteração explicitamente solicitada.

NÃO refatore, otimize, melhore ou modifique código não relacionado.

NÃO faça suposições.

Se algo não estiver claro, PARE e pergunte antes de alterar qualquer coisa.

Preserve 100% do comportamento e da funcionalidade existentes.