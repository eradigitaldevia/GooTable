## Análise

### 1. Toast "Bem-vindo(a) de volta" repete a cada retorno ao cardápio
`src/routes/m.$qrToken.tsx` usa `welcomedRef = useRef(false)`. Ao navegar para `/conta` ou `/minha-conta`, o componente `ClienteMenu` desmonta e o ref zera. Ao voltar, o `useEffect` que reconhece a identidade hidratada dispara o toast novamente.

### 2. "Esta mesa tem 2 comandas ativas" persiste após a limpeza
Em `src/lib/pedidos.functions.ts` → `resumoContaFn` (linhas 392-395), a query que monta `comandas_da_mesa` faz apenas `.eq("sessao_id", data.sessaoId)` — **sem filtrar por status**. A comanda órfã `29d1a0b3…` foi marcada como `fechada`, mas continua sendo retornada e contada. A UI em `m.$qrToken_.conta.tsx` (linha 148) faz `data.comandas_da_mesa.length > 1` e exibe o card.

### 3. "Última visita" mostra a data da visita atual
Em `m.$qrToken_.minha-conta.tsx` (linhas 135-142) o "Resumo do cliente" mostra `cliente.ultima_visita`, que é atualizado para `now()` no momento da identificação (`identificarClienteFn`). Por isso sempre exibe a visita atual. O usuário pede para remover dali e adicionar a data da sessão atual em "Esta visita".

---

## Correções (escopo mínimo)

### Correção 1 — Persistir o flag de "já saudado" por sessão do navegador
**Arquivo:** `src/routes/m.$qrToken.tsx`

Substituir `welcomedRef` por leitura/gravação em `sessionStorage` com chave `mesa-welcomed:${qrToken}`. Assim, dentro da mesma aba/sessão do navegador, o toast aparece uma única vez, mesmo após navegar para outras rotas e voltar.

- Em `showWelcome(nome)`: ler `sessionStorage.getItem("mesa-welcomed:" + qrToken)`. Se existir, retornar. Senão, gravar e exibir o toast.
- Remover o `useRef` e a checagem `welcomedRef.current`.
- Limpar a chave também em `limpar()` do `useClienteMesa` não é necessário — quando o cliente troca de identidade via `salvar()`, queremos mostrar o welcome de novo apenas se for outra pessoa. Para simplicidade e mínima intervenção, basta usar `sessionStorage` com chave por `qrToken`. Se trocar de cliente na mesma aba, o toast já saudou e ficará suprimido até a aba ser fechada — comportamento aceitável (e melhor que repetir 5 vezes).

Nenhuma outra mudança de comportamento.

### Correção 2 — Filtrar comandas fechadas em `resumoContaFn`
**Arquivo:** `src/lib/pedidos.functions.ts` (apenas a query das linhas 392-395)

Adicionar `.eq("status", "aberta")` na seleção de `comandas` para o cálculo de `comandas_da_mesa` e `total_mesa`. Com isso:
- O card "Esta mesa tem N comandas ativas" passa a refletir somente comandas abertas.
- `total_mesa` deixa de somar comandas fechadas (que neste caso valem 0, então sem efeito numérico hoje).
- A comanda atual (`atual = lista.find(...)`) também passa a vir filtrada por aberta — o que é correto, já que a tela "Conta da mesa" só faz sentido para comandas abertas. Se a atual estiver fechada, cai no branch existente "Nenhum pedido ainda nesta comanda" sem quebrar.

Nenhuma outra função (`listarComandasAtivas`, `entrarNaMesaFn`, etc.) é tocada — todas já filtram por `status='aberta'`.

### Correção 3 — Mover data para o card "Esta visita"
**Arquivo:** `src/routes/m.$qrToken_.minha-conta.tsx`

- **Remover** o bloco `col-span-2` "Última visita" do card "Resumo do cliente" (linhas 135-142). O grid permanece com "Total gasto" e "Ticket médio".
- **Adicionar** no card "Esta visita" (logo abaixo do título, antes das linhas atuais) uma linha de subtítulo com a data/hora formatada. Fonte da data: `data.cliente.ultima_visita` (já disponível no payload, e é equivalente à abertura desta visita, já que é atualizado na identificação). Formato pedido pelo usuário: `01/06/2026, 16:46` → `toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })`.

Exemplo de marcação adicionada no card "Esta visita":
```tsx
<div className="text-sm font-semibold">
  Esta visita
  {data.cliente.ultima_visita ? (
    <span className="ml-2 text-xs font-normal text-muted-foreground">
      {new Date(data.cliente.ultima_visita).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })}
    </span>
  ) : null}
</div>
```

Nenhuma alteração no backend, tipos ou hooks. Nenhuma mudança em outros cards, cores, espaçamentos ou textos.

---

## Arquivos alterados (3)
1. `src/routes/m.$qrToken.tsx` — `sessionStorage` no `showWelcome`.
2. `src/lib/pedidos.functions.ts` — `.eq("status", "aberta")` na query de `comandas` dentro de `resumoContaFn`.
3. `src/routes/m.$qrToken_.minha-conta.tsx` — remover "Última visita" do "Resumo do cliente" e adicionar data no header de "Esta visita".

## Fora de escopo
- Não altero `listarComandasAtivas`, hooks, layout, cores, ou outros componentes.
- Não toco no banco de dados.
- Não mexo na lógica de identificação/sessão.
