# Impressão automática de comandas na cozinha e no bar

Quando um pedido novo chega, a tela da cozinha (KDS) e a tela do bar imprimem sozinhas a comanda de preparo daquele destino — sem ninguém clicar em nada. O admin liga ou desliga isso separadamente para cozinha e para bar.

## Como vai funcionar

- Na tela da Cozinha e na tela do Bar, ao chegar um pedido novo do respectivo destino, o cupom de preparo é gerado e enviado à impressora automaticamente.
- Também imprime quando **itens novos** são lançados numa comanda que já existia (sai só o que é novo, marcado como "ADICIONAL").
- Também imprime um cupom curto de **CANCELAMENTO** quando um pedido ou item é cancelado.
- Se o destino estiver desligado nas configurações, nada é impresso naquela tela.
- Cada tela só imprime o que chega enquanto ela está aberta. Recarregar a página não reimprime o que já saiu (controle por dispositivo), evitando cupons duplicados.

## Configuração (Admin → Configurações → Geral)

Nova seção "Impressão automática de comandas", junto dos dados de impressão já existentes:

- Switch **Cozinha** (padrão: desligado)
- Switch **Bar** (padrão: desligado)
- Texto de ajuda explicando que a impressão sai pela tela KDS/Bar aberta no computador ligado à impressora, e que para sair sem a janela de confirmação o navegador precisa estar em modo quiosque com impressão silenciosa (ex.: Chrome com `--kiosk --kiosk-printing`). Sem isso, a janela de impressão do navegador aparece a cada cupom.

## Layout do cupom de preparo (80mm)

Só o necessário para a produção, sem valores:

```text
        COZINHA            <- ou BAR
    ** ADICIONAL **        <- só quando forem itens extras
Mesa 12 · Comanda: Alison
Garçom: Alison · 19:42
--------------------------------
2x  Picanha na chapa
      obs: mal passada
1x  Batata frita
--------------------------------
Pedido #a1b2c3
```

## Detalhes técnicos

**Banco (migração)** — duas colunas em `restaurantes`:
- `impressao_auto_cozinha boolean not null default false`
- `impressao_auto_bar boolean not null default false`

**Backend** — incluir os dois campos em `atualizarConfiguracoesFn` (aba `geral`) e no tipo `Restaurante` de `src/lib/restaurante.functions.ts`.

**Frontend**
- `src/components/impressao/comanda-preparo.tsx`: novo componente de cupom (portal + `@media print`, no mesmo padrão de `comprovante-conta.tsx`), com variantes `novo | adicional | cancelamento`.
- `src/hooks/use-impressao-auto.ts`: hook que recebe os pedidos/itens do destino, compara com o que já foi impresso (chaves em `localStorage`, por dispositivo), enfileira os cupons e dispara `window.print()` em sequência (intervalo curto entre um e outro). Ignora tudo que já existia no primeiro carregamento da tela.
- `src/routes/_authenticated/cozinha.tsx` e `src/routes/_authenticated/bar.tsx`: consomem o hook, condicionado ao switch do destino no restaurante. Indicador discreto no header ("Impressão automática: ligada/desligada").
- `src/components/configuracoes/geral-form.tsx` + `src/routes/_authenticated/admin/configuracoes.tsx` + `ConfigPayload` (aba `geral`): os dois switches.

Nenhuma regra de negócio de pedidos, comissão ou financeiro é alterada.
