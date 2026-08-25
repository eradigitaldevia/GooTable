# Plano: Legal/LGPD — Termos, Privacidade, Aceite e Exercício de Direitos

## Objetivo

Publicar páginas de Termos de Uso e Política de Privacidade, exigir e registrar o aceite dos termos nos fluxos de cadastro do restaurante e de identificação do cliente, e oferecer uma tela pública para o titular solicitar direitos LGPD (exclusão/consulta) — registrando a solicitação no banco.

## Escopo definido

- Páginas + aceite obrigatório + registro da data/versão do aceite.
- Dados do titular/operador em placeholders, para preenchimento manual depois.
- Direitos do titular via e-mail de contato + tela no app para abrir solicitação.

## Etapas de implementação

### 1. Modelo de dados (migração)

Criar duas tabelas no `public` com GRANTs e RLS:

```text
public.lgpd_consentimentos
- id uuid pk default gen_random_uuid()
- escopo text not null                -- ex: 'restaurante_cadastro', 'cliente_identificacao'
- entidade_tipo text not null         -- 'restaurante' | 'cliente'
- entidade_id uuid not null           -- referência lógica a restaurantes.id ou clientes.id
- versao text not null                -- 'v1.0'
- aceito_em timestamptz default now() not null
- GRANT ALL TO service_role; GRANT SELECT TO authenticated
- RLS: policy de leitura para membros do restaurante quando entidade_tipo='restaurante'

public.lgpd_solicitacoes
- id uuid pk default gen_random_uuid()
- tipo text not null                   -- 'exclusao' | 'consulta' | 'retificacao' | 'oposicao'
- nome text not null
- email text not null
- telefone text
- mensagem text
- status text not null default 'pendente'
- criado_em timestamptz default now() not null
- atualizado_em timestamptz default now() not null
- GRANT INSERT, SELECT TO service_role; GRANT INSERT TO anon
- RLS: anon pode inserir; service_role acesso total
```

### 2. Rotas de conteúdo legal

Criar três rotas públicas com `head()` próprio (title, description, og, twitter) e texto sem placeholders sensíveis:

- `src/routes/termos.tsx` — Termos de Uso.
- `src/routes/privacidade.tsx` — Política de Privacidade.
- `src/routes/direitos.tsx` — Formulário para o titular exercer direitos.

Os documentos usarão placeholders como `[RAZÃO SOCIAL]`, `[CNPJ]` e `[EMAIL DPO]` em seções específicas, para substituição manual futura.

### 3. Tela de exercício de direitos

A rota `/direitos` conterá:

- Seleção do tipo de solicitação (exclusão, consulta, retificação, oposição).
- Campos: nome, e-mail, telefone, mensagem.
- Validação client-side (Zod) e server-side.
- Server function `enviarSolicitacaoLgpdFn` pública que insere em `public.lgpd_solicitacoes`.
- Confirmação ao usuário: "Recebemos sua solicitação. Entraremos em contato pelo e-mail em até X dias.".
- Link para o e-mail de contato/DPO.

### 4. Consentimento do restaurante no cadastro

Em `src/routes/cadastro.tsx`:

- Adicionar checkbox "Li e aceito os Termos de Uso e a Política de Privacidade" com links para `/termos` e `/privacidade`.
- Botão de criar conta desabilitado enquanto o aceite não estiver marcado.
- Após a criação do restaurante, chamar `registrarConsentimentoRestauranteFn` (autenticada) gravando escopo `restaurante_cadastro` vinculado ao `restaurantes.id`.

### 5. Consentimento do cliente na identificação

Em `src/components/cliente/identificacao-modal.tsx` e no fluxo que o consome:

- Adicionar checkbox com links para `/termos` e `/privacidade`.
- Botão "Continuar" desabilitado sem o aceite.
- Após criar/encontrar o cliente, registrar consentimento `cliente_identificacao` vinculado ao `clientes.id`. Será feito dentro da server function de identificação existente, para evitar que o cliente manipule o registro.

### 6. Links e descoberta

- Atualizar o footer da landing (`src/routes/index.tsx`) com links para Termos, Privacidade e Direitos.
- Adicionar links nos formulários de `src/routes/login.tsx` e `src/routes/cadastro.tsx`.
- Incluir menção curta nos modais de identificação e checkout delivery.

### 7. Head/SEO

Cada nova rota define `head()` com:

- `title` e `meta name="description"`.
- `og:title`, `og:description`, `og:type`.
- `twitter:card`.
- Sem imagem og (não há hero/cover absoluto específico).

### 8. Validação e testes

- `bunx tsgo --noEmit`.
- Verificar build.
- Verificar que o checkbox bloqueia o envio e que o aceite é gravado no banco.
- Verificar que `/direitos` insere solicitação sem autenticação.

## Arquivos que serão alterados

- `src/routes/termos.tsx` (novo)
- `src/routes/privacidade.tsx` (novo)
- `src/routes/direitos.tsx` (novo)
- `src/routes/index.tsx` (footer + links)
- `src/routes/login.tsx` (links)
- `src/routes/cadastro.tsx` (checkbox + consentimento)
- `src/components/cliente/identificacao-modal.tsx` (checkbox + consentimento)
- `src/lib/cliente-mesa.functions.ts` ou `src/lib/clientes.functions.ts` (registro do consentimento do cliente)
- `src/lib/restaurante.functions.ts` ou novo `src/lib/lgpd.functions.ts` (registro do consentimento do restaurante + solicitação)
- Nova migração Supabase para `public.lgpd_consentimentos` e `public.lgpd_solicitacoes`

## Notas

- Não serão armazenados IP ou user-agent dos consentimentos para minimizar dados pessoais desnecessários.
- A versão dos termos será fixada em `v1.0`; quando o documento for alterado, a versão deve ser bumpada e um novo consentimento poderá ser requerido.
- Placeholders nos documentos devem ser substituídos antes de publicar para clientes finais.
