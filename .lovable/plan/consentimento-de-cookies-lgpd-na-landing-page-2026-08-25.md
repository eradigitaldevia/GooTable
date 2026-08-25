# Consentimento de cookies (LGPD) na landing page

Banner de cookies com preferências por categoria, exibido apenas na página inicial (`/`), com registro auditável de cada consentimento no banco.

## Como funciona para o visitante

1. Na primeira visita à landing page, sobe uma faixa fixa no rodapé:
   - "Usamos cookies para operar o site e entender como ele é usado."
   - Botões: **Aceitar todos**, **Rejeitar não essenciais**, **Personalizar**, e link para a Política de Privacidade.
2. "Personalizar" abre um modal com três categorias:
   - **Essenciais** — sempre ativos, switch desabilitado (sessão, segurança, preferências básicas).
   - **Funcionais** — opcional (preferências de exibição).
   - **Análise** — opcional (métricas de uso agregadas).
3. A escolha é salva no navegador (`localStorage`) e a faixa não reaparece enquanto a versão dos documentos legais não mudar.
4. Um link discreto **"Preferências de cookies"** no rodapé da landing permite reabrir o modal e alterar a escolha a qualquer momento.

## Registro no banco (auditoria)

Cada decisão (aceitar, rejeitar ou salvar preferências) é gravada de forma anônima: um identificador aleatório gerado no navegador, a versão dos documentos, as categorias aceitas e a data. Nenhum dado pessoal é coletado — sem e-mail, sem IP em texto claro.

## Detalhes técnicos

**Banco de dados** (migração):
- Nova tabela `public.lgpd_cookies_consentimentos`: `visitante_id` (uuid gerado no cliente), `versao`, `essenciais`, `funcionais`, `analise` (boolean), `origem` (text, ex. `landing`), `criado_em`.
- GRANTs: `service_role` com acesso total; sem acesso para `anon`/`authenticated`. RLS habilitada com política de leitura apenas para platform admins (`is_platform_admin`), negando insert/update/delete direto — a gravação passa exclusivamente pelo servidor.

**Servidor**:
- `src/lib/lgpd.server.ts`: nova função `registrarConsentimentoCookies` usando `supabaseAdmin`, seguindo o padrão atual (nunca lança erro).
- `src/lib/lgpd.functions.ts`: nova server function pública `registrarConsentimentoCookiesFn` com validação Zod (`visitanteId` uuid, booleans, `origem`), carregando o helper server-only dentro do handler.

**Frontend**:
- `src/lib/cookies.ts`: constantes das categorias, chave de storage (`mesa:cookies:v1`), tipo `PreferenciasCookies`, leitura/escrita no `localStorage` e geração/persistência do `visitante_id`.
- `src/hooks/use-cookie-consent.ts`: estado do consentimento (hidratado em `useEffect` para evitar mismatch de SSR), ações `aceitarTodos`, `rejeitarNaoEssenciais`, `salvarPreferencias`, `abrirPreferencias`, e mutation TanStack Query chamando a server function.
- `src/components/legal/cookie-banner.tsx`: faixa fixa no rodapé (componentes shadcn: `Button`, `Card`) com os três botões e link para `/privacidade`.
- `src/components/legal/cookie-preferencias-dialog.tsx`: modal com `Dialog` + `Switch` por categoria e botão Salvar.
- `src/routes/index.tsx`: renderiza o banner e o diálogo (carregados via `React.lazy` + `ClientOnly`), e adiciona o link "Preferências de cookies" no rodapé, ao lado dos links legais existentes.

**Escopo**: nenhuma outra rota é alterada; painéis internos, cardápio por QR e delivery seguem sem banner.

**Texto legal**: a seção de cookies em `src/routes/privacidade.tsx` recebe um parágrafo descrevendo as três categorias e como alterar a escolha.
