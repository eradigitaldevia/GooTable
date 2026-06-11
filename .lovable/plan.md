# Reorganizar /admin/configuracoes em 6 abas

## Escopo

- Reorganizar a página em 6 abas agrupando campos interdependentes.
- 5 abas com botão **Salvar** próprio; 1 aba (Cardápio) com auto-save no toggle.
- Validação executada apenas para os campos da aba salva; demais campos preservam o valor atual do `form`.
- Não alterar regras de negócio, hooks, componentes filhos (`IdentidadeForm`, `PixForm`, `TaxaServicoForm`, `CouvertForm`, `ComissaoModoForm`), nem o servidor (`atualizarConfiguracoesFn`).
- Alteração restrita a `src/routes/_authenticated/admin/configuracoes.tsx`.

## Estrutura das 6 abas

| Aba | Campos | Salvar | Validações |
|---|---|---|---|
| **Identidade** | `nome`, `cor_primaria`, `logo_url` | Botão | nome ≥ 2 chars |
| **Pagamentos** | `pix_habilitado`, `pix_chave`, `pix_nome_titular` | Botão | `validarPixFn` |
| **Taxas e couverts** | `taxa_servico_*` (+ repasse garçons), `couvert_mesa_*`, `couvert_artistico_*` (+ repasse artistas) | Botão | Percentuais 0–30 / valores 0–1000 / repasses 0–100; se habilitado, valor > 0 |
| **Comissões** | `comissao_modo`, `comissao_rateio_troca_turno`, `comissao_pedido_cliente`, `comissao_pedido_cliente_percentual`, `permitir_atendimento_cruzado` | Botão | `comissaoFormValido` + percentual cliente 0–100 |
| **Caixa** | `caixa_alerta_horas`, `caixa_teto_dinheiro`, `caixa_conferencia_cega`, `caixa_obrigatorio_para_pagamento` | Botão | clamp 1–72h; teto ≥ 0 |
| **Cardápio** | `upsell_habilitado` | Auto-save no toggle | — |

Atendimento cruzado fica em **Comissões** (regra de quem recebe). Upsell fica em **Cardápio** (afeta o app do cliente).

## Implementação

- Componente `Tabs` do shadcn (`@/components/ui/tabs`).
- Aba ativa persistida via search param `?tab=identidade|pagamentos|taxas|comissoes|caixa|cardapio` (default `identidade`).
- Estado `form` permanece **único** (já hidratado).
- Função `salvar(aba)`:
  1. Roda apenas as validações daquela aba (toast em erro).
  2. Chama `atualizarConfiguracoesFn` com payload **completo** — campos da aba com novos valores, demais com valores correntes do `form`.
  3. Em sucesso: `toast.success("Configurações salvas")`.
- `atualizar.isPending` desabilita apenas o botão da aba ativa.
- Aba **Cardápio**: `onCheckedChange` do switch chama `salvar("cardapio")` direto após `patch({ upsell_habilitado: v })`.
- Cada `TabsContent` renderiza seu(s) form(s) + botão **Salvar alterações** no rodapé da aba (exceto Cardápio).
- Header (`Configurações` + descrição) acima das abas. Container `max-w-2xl` mantido.

## Observação sobre rascunhos entre abas

Estado `form` é único: editar campos sem salvar e trocar de aba **mantém** os valores na memória. Se a aba B for salva, os valores não-salvos da aba A vão junto no payload completo. Mesmo comportamento do submit único atual, apenas com mais pontos de commit.

## Fora do escopo

- Refatorar `atualizarConfiguracoesFn` para aceitar payload parcial.
- Fragmentar `form` em estados por aba.
- Indicador visual de "alterações não salvas" por aba.

## Arquivo afetado

- `src/routes/_authenticated/admin/configuracoes.tsx`
