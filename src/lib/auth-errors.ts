/**
 * Traduz mensagens conhecidas do Lovable Cloud Auth (Supabase) para PT-BR
 * com texto mais claro para o usuário final.
 */
export function traduzirErroSenha(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  const lower = msg.toLowerCase();

  if (lower.includes("weak") && lower.includes("password")) {
    return "Esta senha é muito comum e aparece em vazamentos públicos conhecidos. Escolha uma senha mais forte — combine letras maiúsculas, minúsculas, números e símbolos.";
  }
  const minMatch = msg.match(/at least (\d+) characters/i);
  if (minMatch) {
    return `A senha deve ter no mínimo ${minMatch[1]} caracteres.`;
  }
  if (lower.includes("different from the old password")) {
    return "A nova senha deve ser diferente da senha atual.";
  }
  if (lower.includes("password") && lower.includes("short")) {
    return "A senha é muito curta. Use ao menos 8 caracteres.";
  }
  if (lower.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (lower.includes("email") && lower.includes("already")) {
    return "Este e-mail já está cadastrado.";
  }
  return msg || "Erro ao processar a senha.";
}