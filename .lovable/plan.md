## Causa

A mensagem `Password is known to be weak and easy to guess, please choose a different one.` vem do **Lovable Cloud Auth (HIBP — Have I Been Pwned)**, que está **ativado** no projeto. Sempre que uma senha é criada/alterada via `auth.admin.updateUserById` / `createUser`, o backend verifica se ela aparece em vazamentos públicos conhecidos. Se aparecer (ex.: `123456`, `senha123`, `admin123`, nome do restaurante, etc.), a operação é rejeitada com esse erro em inglês.

Não é um bug — é proteção. O problema é que:

1. A mensagem chega **em inglês** e o usuário não entende o motivo.
2. A UI só exige "mínimo 6 caracteres", sem avisar sobre o HIBP.
3. O mesmo acontece em outros 3 fluxos: criar membro direto, criar garçom com login, redefinir senha do garçom.

## Correção proposta

### 1. Traduzir e tratar o erro nos handlers (frontend)

Criar um helper `traduzirErroSenha(e)` em `src/lib/utils.ts` (ou novo `src/lib/auth-errors.ts`) que mapeia mensagens conhecidas do Supabase Auth para PT-BR:

- `Password is known to be weak...` → *"Esta senha é muito comum e aparece em vazamentos conhecidos. Escolha uma senha mais forte (combine letras, números e símbolos)."*
- `Password should be at least N characters` → *"A senha deve ter no mínimo N caracteres."*
- `New password should be different from the old password` → *"A nova senha deve ser diferente da atual."*

Aplicar nos `catch` de:

- `src/components/admin/equipe-panel.tsx` → `handleCriar`, `handleRedefinirSenha`
- `src/components/admin/garcons/garcons-roster.tsx` (ou onde está o dialog de senha do garçom) → criar usuário + redefinir senha
- `src/routes/reset-password.tsx` → `handleSubmit`

### 2. Avisos preventivos na UI

Nos dialogs/forms de senha (equipe e garçom), trocar o placeholder e o helper text:

- Antes: `mínimo 6 caracteres`
- Depois: `Use ao menos 8 caracteres, combinando letras, números e símbolos. Evite senhas comuns.`

Aumentar a validação client-side de `length < 6` para `length < 8` (alinhado à boa prática), mantendo a mensagem clara — o HIBP continua sendo a checagem final no servidor.

### 3. (Opcional, não recomendado agora) - Não implementar

Desativar HIBP via `supabase--configure_auth` com `password_hibp_enabled: false`. **Não recomendo** — reduz a segurança da conta de membros da equipe. Melhor manter ativo e apenas comunicar bem o erro. Não desativar.

## Arquivos alterados

- `src/lib/auth-errors.ts` (novo) — função `traduzirErroSenha`.
- `src/components/admin/equipe-panel.tsx` — usar helper + textos novos.
- `src/components/admin/garcons/garcons-roster.tsx` — mesmo tratamento.
- `src/routes/reset-password.tsx` — mesmo tratamento.

## Fora de escopo

- Mudar política de senha no servidor.
- Forçar troca periódica de senha.
- Política de complexidade adicional (regex de símbolos obrigatórios).