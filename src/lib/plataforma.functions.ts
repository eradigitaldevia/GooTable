import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ConfigPlataforma = {
  vendas_whatsapp: string | null;
  vendas_mensagem: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_youtube: string | null;
  social_linkedin: string | null;
  social_tiktok: string | null;
  social_x: string | null;
};

/** Configuração pública da plataforma (link de vendas e redes sociais). */
export const getConfigPlataforma = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConfigPlataforma> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("plataforma_config")
      .select(
        "vendas_whatsapp, vendas_mensagem, social_instagram, social_facebook, social_youtube, social_linkedin, social_tiktok, social_x",
      )
      .order("criado_em", { ascending: true })
      .limit(1)
      .maybeSingle();
    return {
      vendas_whatsapp: data?.vendas_whatsapp ?? null,
      vendas_mensagem: data?.vendas_mensagem ?? null,
      social_instagram: data?.social_instagram ?? null,
      social_facebook: data?.social_facebook ?? null,
      social_youtube: data?.social_youtube ?? null,
      social_linkedin: data?.social_linkedin ?? null,
      social_tiktok: data?.social_tiktok ?? null,
      social_x: data?.social_x ?? null,
    };
  },
);


/** Atualiza o WhatsApp de vendas (somente platform admin). */
export const atualizarConfigVendas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        vendas_whatsapp: z.string().trim().max(30).nullable(),
        vendas_mensagem: z.string().trim().max(300).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: pa, error: errPa } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (errPa) throw new Error(errPa.message);
    if (!pa) throw new Response("Forbidden: not a platform admin", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existente } = await supabaseAdmin
      .from("plataforma_config")
      .select("id")
      .order("criado_em", { ascending: true })
      .limit(1)
      .maybeSingle();

    const payload = {
      vendas_whatsapp: data.vendas_whatsapp || null,
      vendas_mensagem: data.vendas_mensagem || null,
    };

    if (existente) {
      const { error } = await supabaseAdmin
        .from("plataforma_config")
        .update(payload)
        .eq("id", existente.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("plataforma_config").insert(payload);
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: userId,
      acao: "atualizar_config_vendas",
      entidade: "plataforma_config",
      entidade_id: null,
      metadata: { vendas_whatsapp: payload.vendas_whatsapp } as never,
    });

    return { ok: true };
  });

/** Atualiza os perfis de redes sociais (somente platform admin). */
export const atualizarConfigSociais = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => {
    const campo = z.string().trim().max(200).nullable();
    return z
      .object({
        social_instagram: campo,
        social_facebook: campo,
        social_youtube: campo,
        social_linkedin: campo,
        social_tiktok: campo,
        social_x: campo,
      })
      .parse(d);
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: pa, error: errPa } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (errPa) throw new Error(errPa.message);
    if (!pa) throw new Response("Forbidden: not a platform admin", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existente } = await supabaseAdmin
      .from("plataforma_config")
      .select("id")
      .order("criado_em", { ascending: true })
      .limit(1)
      .maybeSingle();

    const payload = {
      social_instagram: data.social_instagram || null,
      social_facebook: data.social_facebook || null,
      social_youtube: data.social_youtube || null,
      social_linkedin: data.social_linkedin || null,
      social_tiktok: data.social_tiktok || null,
      social_x: data.social_x || null,
    };

    if (existente) {
      const { error } = await supabaseAdmin
        .from("plataforma_config")
        .update(payload)
        .eq("id", existente.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("plataforma_config").insert(payload);
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: userId,
      acao: "atualizar_config_sociais",
      entidade: "plataforma_config",
      entidade_id: null,
      metadata: payload as never,
    });

    return { ok: true };
  });
