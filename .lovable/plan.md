# Corrigir URL pública dos QR Codes das mesas

## Problema

O `MesaCard` monta a URL do QR com `window.location.origin`. Quando o admin abre o painel pelo editor do Lovable (`id-preview--*.lovable.app`), o QR é gerado apontando para esse host — que **exige login do Lovable**. O cliente que escaneia cai numa tela de autenticação em vez do cardápio.

O domínio publicado (`dine-tap-flow.lovable.app`) já é público; o QR só precisa apontar para ele (ou para o domínio próprio do restaurante, se houver).

## Solução

Adicionar um campo opcional **"URL pública do cardápio"** por restaurante. O QR usa esse valor; se vazio, usa `window.location.origin` (comportamento atual, sem regressão).

## Mudanças

### 1. Banco (migration)
- `ALTER TABLE public.restaurantes ADD COLUMN url_publica_cardapio text NULL;`
- Sem alteração de RLS/GRANT (coluna nova em tabela existente).

### 2. Backend
- `src/lib/configuracoes.functions.ts` (`atualizarConfiguracoesFn`, aba `geral`): aceitar e persistir `url_publica_cardapio` (validação Zod: string opcional, trim, deve começar com `http://` ou `https://`, sem barra final).
- `src/lib/restaurante.functions.ts` (carregamento do "meu restaurante"): incluir a coluna no `select` para o admin ler o valor salvo.

### 3. Tipos
- `ConfigPayload` em `src/hooks/use-configuracoes.ts`, variante `geral`: adicionar `url_publica_cardapio: string | null`.

### 4. UI — Configurações
- `src/components/configuracoes/geral-form.tsx`: novo `Input` "URL pública do cardápio" (opcional), com placeholder `https://dine-tap-flow.lovable.app` e texto de ajuda curto explicando que é o endereço usado nos QR Codes das mesas. Incluir no submit junto com os demais campos da aba Geral.

### 5. UI — Mesas (correção do QR)
- `src/routes/_authenticated/admin/mesas.tsx`: ler `url_publica_cardapio` do restaurante carregado e passar como prop `baseUrl` para `MesaCard`.
- `src/components/mesas/mesa-card.tsx`: aceitar `baseUrl?: string`. Montar `url` como `(baseUrl?.replace(/\/$/, "") || origin) + "/m/" + qr_token`. Manter `origin` como fallback — zero regressão quando o campo estiver vazio.

## Detalhes técnicos

- Nada muda no fluxo público do cardápio (`/m/$qrToken`) — só a forma como a string do QR é montada no admin.
- Nenhuma refatoração: apenas adição de coluna, campo de formulário e prop opcional.
- Nenhum impacto em layout, cores, tipografia, regras de negócio ou outros fluxos.

## Arquivos afetados

- `supabase/migrations/<novo>.sql` (criar)
- `src/lib/configuracoes.functions.ts`
- `src/lib/restaurante.functions.ts`
- `src/hooks/use-configuracoes.ts`
- `src/components/configuracoes/geral-form.tsx`
- `src/routes/_authenticated/admin/mesas.tsx`
- `src/components/mesas/mesa-card.tsx`

## Pós-implementação (ação do usuário)

Abrir **Admin → Configurações → Geral**, preencher `https://dine-tap-flow.lovable.app` (ou o domínio próprio, quando houver) e salvar. Os QR Codes passam a ser gerados com esse endereço imediatamente.
