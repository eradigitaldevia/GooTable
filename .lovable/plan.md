## Impressão da conta — Garçom e Caixa

Implementação simples baseada em `window.print()` com layout dedicado para impressora térmica (80mm). **Sem agente externo, sem novas tabelas operacionais** — reusa os dados já carregados pelas telas atuais. Funciona em qualquer impressora instalada no SO (térmica USB, rede via spooler, ou A4) através do diálogo de impressão do navegador.

---

### 1) Dados cadastrais do restaurante (pré-requisito para o cabeçalho)

Hoje a tabela `restaurantes` só tem `nome` e `logo_url` — não há `cnpj`, `endereco`, `telefone`. Precisamos criar:

**Migration:** adicionar em `public.restaurantes` as colunas:
- `cnpj` text NULL
- `telefone` text NULL
- `endereco` text NULL  (linha única livre, ex.: "Rua X, 123 - Bairro - Cidade/UF")

**UI:** editar `src/components/configuracoes/identidade-form.tsx` — adicionar uma seção **"Dados para impressão"** logo abaixo do campo "Nome do restaurante", com três inputs (CNPJ, Telefone, Endereço). Todos opcionais; o que estiver vazio simplesmente não aparece no comprovante. Reaproveita o mesmo botão "Salvar" da aba Identidade (sem nova tab, sem nova rota).

Atualizar `src/lib/configuracoes.functions.ts` (ou a fn que salva identidade) para persistir os três campos novos.

---

### 2) Componente compartilhado de comprovante

**Novo** `src/components/impressao/comprovante-conta.tsx`

Componente "print-only" que renderiza a conta para 80mm em fonte monospace. Recebe props já disponíveis nas telas atuais (mesa-detalhe-view, caixa.pagamentos):

```ts
type Props = {
  restaurante: { nome; cnpj?; endereco?; telefone?; logo_url? };
  contexto: { tipo: "mesa" | "comanda"; mesaNumero?; comandaTitular?; garcomNome?: string | null };
  itens: Array<{ nome; quantidade; preco_unit; observacao?: string | null }>;
  couverts?: Array<{ descricao; total }>;
  totais: { subtotal; couvert?; taxa_servico?; desconto?; total; total_pago?; saldo? };
  pagamentos?: Array<{ metodo; valor; quando }>; // só quando "comprovante pago"
  divisao?: { pessoas: number; valorPorPessoa: number }; // opcional, rodapé
  variante: "rascunho" | "pago"; // "pago" carimba PAGO no rodapé
};
```

Cabeçalho com logo (opcional), nome, CNPJ/endereço/telefone (cada um só aparece se preenchido). Identificação Mesa/Comanda + garçom. Tabela de itens (qtd × nome — preço). Couverts. Totais. Pagamentos (variante "pago"). Divisão por pessoa quando informada. Rodapé com data/hora e "Não é documento fiscal".

**Novo** `src/styles/print.css` (importado uma vez em `__root.tsx`):

```css
@media screen { .print-only { display: none; } }
@media print {
  body * { visibility: hidden; }
  .print-only, .print-only * { visibility: visible; }
  .print-only { position: absolute; inset: 0; width: 80mm; }
  @page { size: 80mm auto; margin: 4mm; }
}
```

**Novo** `src/hooks/use-imprimir.ts` — wrapper trivial em torno de `window.print()`.

---

### 3) Garçom — botões no detalhe da mesa

**Editar** `src/components/sala/mesa-detalhe-view.tsx`:

- Botão **"Imprimir conta"** no header (ao lado de Dividir total / Juntar comandas). Visível também em `readOnly`.
- Botão **"Imprimir"** (ícone) dentro de cada card de comanda no accordion, para imprimir a comanda individual.
- Renderiza `<ComprovanteConta variante="rascunho">` oculto via `print-only` com os dados do contexto clicado.

**Editar** `src/components/sala/dividir-total-dialog.tsx`:
- Adicionar botão **"Imprimir conta com divisão"** que imprime **uma única via** com o detalhamento completo e, no rodapé, "Dividido por N pessoas: R$ X por pessoa". (Sem múltiplas vias — economia de papel; se o cliente quiser vias separadas, usa "Imprimir" por comanda.)

Sem novos server functions — todos os dados já vêm de `useCarregarMesa`.

---

### 4) Caixa — botão na lista e comprovante pós-pagamento

**Editar** `src/routes/_authenticated/caixa.pagamentos.tsx`:
- Na coluna de ações da tabela, adicionar **botão-ícone "Imprimir conta"** (ícone `Receipt`) ao lado de "Registrar pagamento" em cada linha, imprimindo a conta rascunho da comanda.

**Editar** `src/components/admin/confirmar-pagamento-dialog-body.tsx`:
- Após o `registrar.mutateAsync` bem-sucedido, **antes** de fechar o diálogo, exibir um estado de sucesso com botão destacado **"Imprimir comprovante"** (`variante="pago"`, incluindo a linha de pagamentos e carimbo PAGO) + botão "Fechar". Quem não quiser imprimir só fecha.

**Server function nova** (se necessário) em `src/lib/caixa.functions.ts`:
- `carregarComandaParaImpressaoFn({ comandaId })` → retorna `{ restaurante, comanda, itens, couverts, totais, pagamentos }`. Reusa selects de `sala.functions.ts`. (A confirmar durante implementação se realmente é necessária ou se algo equivalente já existe.)

---

### 5) Arquivos afetados

**Migration:**
- Nova migration: adicionar `cnpj`, `telefone`, `endereco` em `restaurantes`.

**Novos:**
- `src/components/impressao/comprovante-conta.tsx`
- `src/hooks/use-imprimir.ts`
- `src/styles/print.css`

**Editados:**
- `src/routes/__root.tsx` (importar `print.css`)
- `src/components/configuracoes/identidade-form.tsx` (seção "Dados para impressão")
- `src/lib/configuracoes.functions.ts` (persistir os 3 campos novos)
- `src/components/sala/mesa-detalhe-view.tsx` (botões + render oculto)
- `src/components/sala/dividir-total-dialog.tsx` (botão "Imprimir conta com divisão")
- `src/routes/_authenticated/caixa.pagamentos.tsx` (botão-ícone na linha)
- `src/components/admin/confirmar-pagamento-dialog-body.tsx` (estado pós-sucesso + botão "Imprimir comprovante")
- `src/lib/caixa.functions.ts` (apenas se precisar de fn nova de carregamento por comanda)

---

### Fora de escopo

- Agente Node.js local e impressão automática de comanda de cozinha (KDS já cobre).
- Tabelas `impressoras`, `regras_impressao`, `impressoes_log`, `fila_reimpressao`.
- Log persistente de impressões/reimpressões.
- Múltiplas vias na divisão de conta (decisão: 1 via única para economizar papel).
- Tela de configuração de layout de impressão (largura, toggles). Pode entrar num PR futuro se demandado.
