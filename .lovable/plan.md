## Objetivo

Corrigir o erro de hex inválido na aba "Cores manuais" e deixar explícito que ela ajusta a paleta atual.

## Mudanças

### 1. `src/components/configuracoes/identidade/cores-manuais-form.tsx`

**Validação onBlur no campo de texto do hex** (o `<input type="color">` continua igual — ele já garante valor válido):

- Cada `CampoCor` mantém um estado local `rascunho` (string que o usuário digita).
- `useEffect` sincroniza `rascunho` quando o `value` externo muda (ex.: usuário trocou de aba, escolheu paleta pronta).
- Digitar atualiza apenas `rascunho` (não propaga).
- `onBlur` (ou Enter):
  - Se `isValidHex(rascunho)` → propaga via `onChange(rascunho)`.
  - Senão → reverte `rascunho` para o `value` válido atual e mostra `toast.error("Cor inválida. Use o formato #RRGGBB (ex.: #c2410c).")`.
- O `<input type="color">` continua propagando direto (sempre válido) e também atualiza `rascunho`.

Resultado: impossível ficar com hex incompleto no estado salvo → fim do `ZodError "Cor inválida"` ao clicar Salvar.

### 2. `src/components/configuracoes/identidade/paletas-tabs.tsx`

Adicionar uma linha curta de ajuda **dentro do `TabsContent value="manual"`**, acima do `<CoresManuaisForm>`:

> "Ajuste fino sobre a paleta atual. As cores exibidas são as que estão ativas no cardápio agora."

Classes: `text-xs text-muted-foreground` (padrão já usado em outras explicações do form).

## Fora de escopo

- Não mudar arquitetura de abas (continuam compartilhando o estado).
- Não mudar `paleta-presets.ts`, `paleta-gerador.tsx`, `paleta-picker.tsx`, `identidade-form.tsx`, schemas Zod do backend, nem `configuracoes.functions.ts`.
- Não alterar layout, cores, tokens ou tipografia.
- Não tocar no aviso de upsell já existente na aba Cardápio.
