import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAcessoRestaurante } from "./auth.server";

export interface Cumim {
  id: string;
  restaurante_id: string;
  nome: string;
  telefone: string | null;
  ativo: boolean;
  user_id: string | null;
  criado_em: string;
  atualizado_em: string;
}

/* ---------- CRUD ---------- */

export const listarCuminsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        incluirInativos: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    let q = supabase
      .from("cumins")
      .select("*")
      .eq("restaurante_id", data.restauranteId)
      .order("nome", { ascending: true });
    if (!data.incluirInativos) q = q.eq("ativo", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as Cumim[];
  });

export const criarCumimFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        nome: z.string().min(1).max(120),
        telefone: z.string().max(40).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: row, error } = await supabase
      .from("cumins")
      .insert({
        restaurante_id: data.restauranteId,
        nome: data.nome.trim(),
        telefone: data.telefone?.trim() || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as Cumim;
  });

export const atualizarCumimFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        restauranteId: z.string().uuid(),
        nome: z.string().min(1).max(120),
        telefone: z.string().max(40).optional().nullable(),
        ativo: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("cumins")
      .update({
        nome: data.nome.trim(),
        telefone: data.telefone?.trim() || null,
        ativo: data.ativo,
      })
      .eq("id", data.id)
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Vinculo de usuário (login) ---------- */

export const vincularUsuarioCumimFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        cumimId: z.string().uuid(),
        email: z.string().trim().email().max(255),
        senha: z.string().min(6).max(72),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: cumim, error: cErr } = await supabase
      .from("cumins")
      .select("id, user_id, restaurante_id")
      .eq("id", data.cumimId)
      .eq("restaurante_id", data.restauranteId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cumim) throw new Error("Cumim não encontrado");
    if (cumim.user_id) {
      throw new Error("Este cumim já possui usuário vinculado");
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

    const { error: linkErr } = await supabaseAdmin
      .from("cumins")
      .update({ user_id: newUserId })
      .eq("id", data.cumimId);
    if (linkErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(linkErr.message);
    }

    const { error: memErr } = await supabaseAdmin
      .from("restaurante_membros")
      .insert({
        user_id: newUserId,
        restaurante_id: data.restauranteId,
        papel: "cumim",
      });
    if (memErr) {
      await supabaseAdmin
        .from("cumins")
        .update({ user_id: null })
        .eq("id", data.cumimId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(memErr.message);
    }

    return { ok: true, userId: newUserId };
  });

export const redefinirSenhaCumimFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        cumimId: z.string().uuid(),
        novaSenha: z.string().min(6).max(72),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: cumim } = await supabase
      .from("cumins")
      .select("user_id")
      .eq("id", data.cumimId)
      .eq("restaurante_id", data.restauranteId)
      .maybeSingle();
    if (!cumim?.user_id) throw new Error("Cumim sem usuário vinculado");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      cumim.user_id,
      { password: data.novaSenha },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const alterarEmailCumimFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        cumimId: z.string().uuid(),
        email: z.string().trim().email().max(255),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: cumim } = await supabase
      .from("cumins")
      .select("user_id")
      .eq("id", data.cumimId)
      .eq("restaurante_id", data.restauranteId)
      .maybeSingle();
    if (!cumim?.user_id) throw new Error("Cumim sem usuário vinculado");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      cumim.user_id,
      { email: data.email, email_confirm: true },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Flag usa_cumim no restaurante ---------- */

export const setUsaCumimFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        usaCumim: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { error } = await supabase
      .from("restaurantes")
      .update({ usa_cumim: data.usaCumim })
      .eq("id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });