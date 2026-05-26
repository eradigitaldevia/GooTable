import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const PAPEIS = ["admin", "staff", "cozinheiro"] as const;
export type PapelMembro = (typeof PAPEIS)[number];

async function assertAdminDoRestaurante(
  supabase: any,
  userId: string,
  restauranteId: string,
) {
  const { data: pa } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (pa) return;
  const { data: membro } = await supabase
    .from("restaurante_membros")
    .select("papel")
    .eq("user_id", userId)
    .eq("restaurante_id", restauranteId)
    .maybeSingle();
  if (!membro || membro.papel !== "admin") {
    throw new Response("Forbidden: apenas admins do restaurante", { status: 403 });
  }
}

/** Retorna papel e restaurante do usuário logado (primeiro vínculo). */
export const getMeuPapelFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("restaurante_membros")
      .select("papel, restaurante_id")
      .eq("user_id", userId)
      .order("criado_em", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!data) return { papel: null, restauranteId: null };
    return {
      papel: data.papel as PapelMembro,
      restauranteId: data.restaurante_id as string,
    };
  });

/** Lista membros do restaurante (apenas admin). */
export const listarMembrosEquipeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdminDoRestaurante(supabase, userId, data.restauranteId);

    const { data: membros, error } = await supabaseAdmin
      .from("restaurante_membros")
      .select("id, user_id, papel, criado_em")
      .eq("restaurante_id", data.restauranteId)
      .order("criado_em", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const emailMap = new Map(usersList?.users.map((u) => [u.id, u.email ?? ""]));
    return {
      membros: (membros ?? []).map((m) => ({
        ...m,
        email: emailMap.get(m.user_id) ?? "—",
      })),
      meuUserId: userId,
    };
  });

/** Adiciona um membro existente (por email) ao restaurante. */
export const adicionarMembroEquipeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        email: z.string().email(),
        papel: z.enum(PAPEIS),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdminDoRestaurante(supabase, userId, data.restauranteId);

    const { data: usersList, error: errUsers } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (errUsers) throw new Error(errUsers.message);
    const target = usersList.users.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
    );
    if (!target) {
      throw new Error(
        "Usuário com este email não foi encontrado. Peça para a pessoa criar uma conta antes.",
      );
    }

    const { data: existente } = await supabaseAdmin
      .from("restaurante_membros")
      .select("id")
      .eq("restaurante_id", data.restauranteId)
      .eq("user_id", target.id)
      .maybeSingle();
    if (existente) throw new Error("Este usuário já é membro do restaurante.");

    const { error } = await supabaseAdmin
      .from("restaurante_membros")
      .insert({
        restaurante_id: data.restauranteId,
        user_id: target.id,
        papel: data.papel,
      });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: userId,
      acao: "adicionar_membro",
      entidade: "restaurante",
      entidade_id: data.restauranteId,
      metadata: { email: data.email, papel: data.papel } as any,
    });
    return { ok: true };
  });

/** Altera o papel de um membro existente. Protege o último admin. */
export const alterarPapelMembroFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        membroId: z.string().uuid(),
        restauranteId: z.string().uuid(),
        novoPapel: z.enum(PAPEIS),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdminDoRestaurante(supabase, userId, data.restauranteId);

    const { data: alvo } = await supabaseAdmin
      .from("restaurante_membros")
      .select("id, papel, user_id, restaurante_id")
      .eq("id", data.membroId)
      .maybeSingle();
    if (!alvo || alvo.restaurante_id !== data.restauranteId) {
      throw new Error("Membro não encontrado.");
    }
    if (alvo.papel === data.novoPapel) return { ok: true };

    if (alvo.papel === "admin" && data.novoPapel !== "admin") {
      const { count } = await supabaseAdmin
        .from("restaurante_membros")
        .select("id", { count: "exact", head: true })
        .eq("restaurante_id", data.restauranteId)
        .eq("papel", "admin");
      if ((count ?? 0) <= 1) {
        throw new Error("Não é possível rebaixar o último admin do restaurante.");
      }
    }

    const { error } = await supabaseAdmin
      .from("restaurante_membros")
      .update({ papel: data.novoPapel })
      .eq("id", data.membroId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: userId,
      acao: "alterar_papel_membro",
      entidade: "restaurante",
      entidade_id: data.restauranteId,
      metadata: { membroId: data.membroId, de: alvo.papel, para: data.novoPapel } as any,
    });
    return { ok: true };
  });

/** Remove um membro. Protege o último admin. */
export const removerMembroEquipeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ membroId: z.string().uuid(), restauranteId: z.string().uuid() })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdminDoRestaurante(supabase, userId, data.restauranteId);

    const { data: alvo } = await supabaseAdmin
      .from("restaurante_membros")
      .select("papel, restaurante_id")
      .eq("id", data.membroId)
      .maybeSingle();
    if (!alvo || alvo.restaurante_id !== data.restauranteId) {
      throw new Error("Membro não encontrado.");
    }

    if (alvo.papel === "admin") {
      const { count } = await supabaseAdmin
        .from("restaurante_membros")
        .select("id", { count: "exact", head: true })
        .eq("restaurante_id", data.restauranteId)
        .eq("papel", "admin");
      if ((count ?? 0) <= 1) {
        throw new Error("Não é possível remover o último admin do restaurante.");
      }
    }

    const { error } = await supabaseAdmin
      .from("restaurante_membros")
      .delete()
      .eq("id", data.membroId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: userId,
      acao: "remover_membro",
      entidade: "restaurante",
      entidade_id: data.restauranteId,
      metadata: { membroId: data.membroId } as any,
    });
    return { ok: true };
  });