import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Registra o aceite dos documentos legais pelo restaurante recém-criado. */
export const registrarConsentimentoRestauranteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: membro, error } = await context.supabase
      .from("restaurante_membros")
      .select("id")
      .eq("restaurante_id", data.restauranteId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!membro) throw new Error("Sem permissão");

    const { registrarConsentimentoLgpd } = await import("./lgpd.server");
    await registrarConsentimentoLgpd({
      escopo: "restaurante_cadastro",
      entidadeTipo: "restaurante",
      entidadeId: data.restauranteId,
    });
    return { ok: true };
  });

/** Abre uma solicitação de direitos do titular (público). */
export const enviarSolicitacaoLgpdFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        tipo: z.enum(["consulta", "exclusao", "retificacao", "oposicao"]),
        nome: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(160),
        telefone: z.string().trim().max(30).optional(),
        mensagem: z.string().trim().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("lgpd_solicitacoes").insert({
      tipo: data.tipo,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone || null,
      mensagem: data.mensagem || null,
    });
    if (error) throw new Error("Não foi possível registrar sua solicitação agora.");
    return { ok: true };
  });

/** Registra a escolha de cookies do visitante (público, anônimo). */
export const registrarConsentimentoCookiesFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        visitanteId: z.string().uuid(),
        funcionais: z.boolean(),
        analise: z.boolean(),
        origem: z.string().trim().min(1).max(40).default("landing"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { registrarConsentimentoCookies } = await import("./lgpd.server");
    await registrarConsentimentoCookies({
      visitanteId: data.visitanteId,
      funcionais: data.funcionais,
      analise: data.analise,
      origem: data.origem,
    });
    return { ok: true };
  });
