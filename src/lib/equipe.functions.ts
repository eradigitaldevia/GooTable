import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
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

function getOrigin(): string | undefined {
  const origin = getRequestHeader("origin") ?? undefined;
  if (origin) return origin;
  const referer = getRequestHeader("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }
  return undefined;
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

/** Convida um novo usuário por email (Supabase enviará o link de definição de senha). */
export const convidarMembroEquipeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        email: z.string().trim().email().max(255),
        papel: z.enum(PAPEIS),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdminDoRestaurante(supabase, userId, data.restauranteId);

    const origin = getOrigin();
    const redirectTo = origin ? `${origin}/reset-password` : undefined;

    // Verifica se já existe usuário com esse email
    const { data: usersList, error: errUsers } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (errUsers) throw new Error(errUsers.message);
    const existente = usersList.users.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
    );

    let targetUserId: string;
    if (existente) {
      targetUserId = existente.id;
    } else {
      const { data: invited, error: invErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
          redirectTo,
        });
      if (invErr || !invited.user) {
        throw new Error(invErr?.message ?? "Falha ao enviar convite");
      }
      targetUserId = invited.user.id;
    }

    // Verifica vínculo existente
    const { data: jaMembro } = await supabaseAdmin
      .from("restaurante_membros")
      .select("id")
      .eq("restaurante_id", data.restauranteId)
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (jaMembro) throw new Error("Este usuário já é membro do restaurante.");

    const { error } = await supabaseAdmin
      .from("restaurante_membros")
      .insert({
        restaurante_id: data.restauranteId,
        user_id: targetUserId,
        papel: data.papel,
      });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: userId,
      acao: "convidar_membro",
      entidade: "restaurante",
      entidade_id: data.restauranteId,
      metadata: {
        email: data.email,
        papel: data.papel,
        ja_existia: !!existente,
      } as any,
    });
    return { ok: true, jaExistia: !!existente };
  });

/** Cria um usuário diretamente com email + senha temporária e vincula como membro. */
export const criarMembroEquipeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        email: z.string().trim().email().max(255),
        senha: z.string().min(6).max(72),
        papel: z.enum(PAPEIS),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdminDoRestaurante(supabase, userId, data.restauranteId);

    const { data: usersList, error: errUsers } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (errUsers) throw new Error(errUsers.message);
    const existente = usersList.users.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
    );
    if (existente) {
      throw new Error(
        "Já existe um usuário com este email. Use 'Adicionar existente' ou 'Convidar'.",
      );
    }

    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.senha,
        email_confirm: true,
      });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Falha ao criar usuário");
    }

    const newUserId = created.user.id;

    const { error: memErr } = await supabaseAdmin
      .from("restaurante_membros")
      .insert({
        restaurante_id: data.restauranteId,
        user_id: newUserId,
        papel: data.papel,
      });
    if (memErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(memErr.message);
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: userId,
      acao: "criar_membro",
      entidade: "restaurante",
      entidade_id: data.restauranteId,
      metadata: { email: data.email, papel: data.papel } as any,
    });
    return { ok: true };
  });

/** Reenvia convite ou link de redefinição de senha para um membro existente. */
export const reenviarConviteMembroFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        membroId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdminDoRestaurante(supabase, userId, data.restauranteId);

    const { data: alvo } = await supabaseAdmin
      .from("restaurante_membros")
      .select("user_id, restaurante_id")
      .eq("id", data.membroId)
      .maybeSingle();
    if (!alvo || alvo.restaurante_id !== data.restauranteId) {
      throw new Error("Membro não encontrado.");
    }

    const { data: userInfo, error: getErr } =
      await supabaseAdmin.auth.admin.getUserById(alvo.user_id);
    if (getErr || !userInfo.user?.email) {
      throw new Error("Usuário não encontrado.");
    }
    const email = userInfo.user.email;
    const confirmado = !!userInfo.user.email_confirmed_at;

    const origin = getOrigin();
    const redirectTo = origin ? `${origin}/reset-password` : undefined;

    let tipo: "convite" | "reset";
    if (!confirmado) {
      const { error: invErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (invErr) throw new Error(invErr.message);
      tipo = "convite";
    } else {
      const { error: linkErr } = await supabaseAdmin.auth.resetPasswordForEmail(
        email,
        { redirectTo },
      );
      if (linkErr) throw new Error(linkErr.message);
      tipo = "reset";
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: userId,
      acao: "reenviar_convite_membro",
      entidade: "restaurante",
      entidade_id: data.restauranteId,
      metadata: { membroId: data.membroId, email, tipo } as any,
    });
    return { ok: true, tipo, email };
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