import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAcessoRestaurante } from "./auth.server";

/**
 * Cria um usuário de login (Supabase Auth) com senha temporária e vincula
 * ao garçom informado. Também cria/garante o registro em restaurante_membros
 * com papel 'garcom'.
 */
export const vincularUsuarioGarcomFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        garcomId: z.string().uuid(),
        email: z.string().trim().email().max(255),
        senha: z.string().min(6).max(72),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    // Garante que o garçom pertence ao restaurante e não está vinculado
    const { data: garcom, error: gErr } = await supabase
      .from("garcons")
      .select("id, user_id, restaurante_id")
      .eq("id", data.garcomId)
      .eq("restaurante_id", data.restauranteId)
      .maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!garcom) throw new Error("Garçom não encontrado");
    if (garcom.user_id) {
      throw new Error("Este garçom já possui usuário vinculado");
    }

    // Cria usuário no Supabase Auth com e-mail já confirmado
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.senha,
        email_confirm: true,
      });
    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Falha ao criar usuário";
      throw new Error(msg);
    }

    const newUserId = created.user.id;

    // Vincula garçom -> user_id
    const { error: linkErr } = await supabaseAdmin
      .from("garcons")
      .update({ user_id: newUserId })
      .eq("id", data.garcomId);
    if (linkErr) {
      // rollback do usuário criado para não deixar órfão
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(linkErr.message);
    }

    // Garante membership com papel 'garcom'
    const { error: memErr } = await supabaseAdmin
      .from("restaurante_membros")
      .insert({
        user_id: newUserId,
        restaurante_id: data.restauranteId,
        papel: "garcom",
      });
    if (memErr) {
      await supabaseAdmin
        .from("garcons")
        .update({ user_id: null })
        .eq("id", data.garcomId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(memErr.message);
    }

    return { ok: true, userId: newUserId };
  });