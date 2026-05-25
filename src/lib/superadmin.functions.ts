import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertPlatformAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Forbidden: not a platform admin", { status: 403 });
}

async function logAction(actorId: string, acao: string, entidade: string, entidade_id: string | null, metadata: Record<string, unknown> = {}) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_user_id: actorId,
    acao,
    entidade,
    entidade_id,
    metadata: metadata as any,
  });
}

/** Verifica se o usuário logado é platform admin. */
export const verificarPlatformAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    return { isPlatformAdmin: !!data };
  });

/** Lista restaurantes com agregações de mesas, pedidos e faturamento do mês corrente. */
export const listarRestaurantesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const [{ data: rests, error: e1 }, { data: pedidos, error: e2 }, { data: mesas, error: e3 }] = await Promise.all([
      supabaseAdmin.from("restaurantes").select("id, nome, slug, ativo, criado_em").order("criado_em", { ascending: false }),
      supabaseAdmin.from("pedidos").select("restaurante_id, total, status, criado_em").gte("criado_em", inicioMes.toISOString()),
      supabaseAdmin.from("mesas").select("restaurante_id"),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (e3) throw new Error(e3.message);

    const mesasByRest: Record<string, number> = {};
    (mesas ?? []).forEach((m: any) => {
      mesasByRest[m.restaurante_id] = (mesasByRest[m.restaurante_id] ?? 0) + 1;
    });
    const pedidosByRest: Record<string, number> = {};
    const fatByRest: Record<string, number> = {};
    (pedidos ?? []).forEach((p: any) => {
      pedidosByRest[p.restaurante_id] = (pedidosByRest[p.restaurante_id] ?? 0) + 1;
      if (p.status === "entregue") {
        fatByRest[p.restaurante_id] = (fatByRest[p.restaurante_id] ?? 0) + Number(p.total);
      }
    });

    const rows = (rests ?? []).map((r: any) => ({
      id: r.id,
      nome: r.nome,
      slug: r.slug,
      ativo: r.ativo,
      criado_em: r.criado_em,
      pedidosMes: pedidosByRest[r.id] ?? 0,
      faturamentoMes: fatByRest[r.id] ?? 0,
      mesas: mesasByRest[r.id] ?? 0,
    }));

    return { rows };
  });

/** Cria restaurante e atribui um dono pelo email. */
export const criarRestauranteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      nome: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      donoEmail: z.string().email(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    // listar usuários (limite alto pra MVP) e filtrar pelo email
    const { data: usersList, error: errUsers } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (errUsers) throw new Error(errUsers.message);
    const dono = usersList.users.find((u) => u.email?.toLowerCase() === data.donoEmail.toLowerCase());
    if (!dono) throw new Error("Usuário com este email não foi encontrado.");

    const { data: existente } = await supabaseAdmin
      .from("restaurantes")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (existente) throw new Error("Já existe um restaurante com este slug.");

    const { data: rest, error } = await supabaseAdmin
      .from("restaurantes")
      .insert({ nome: data.nome, slug: data.slug })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("restaurante_membros")
      .insert({ restaurante_id: rest.id, user_id: dono.id, papel: "admin" });

    await logAction(userId, "criar_restaurante", "restaurante", rest.id, {
      nome: data.nome,
      donoEmail: data.donoEmail,
    });

    return { restaurante: rest };
  });

/** Detalhes de um restaurante (super-admin). */
export const getRestauranteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);
    const { data: rest, error } = await supabaseAdmin
      .from("restaurantes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { restaurante: rest };
  });

/** Últimos pedidos de um restaurante (super-admin). */
export const listarPedidosRestaurante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid(), limit: z.number().int().min(1).max(100).default(20) }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);
    const { data: pedidos, error } = await supabaseAdmin
      .from("pedidos")
      .select("id, total, status, criado_em")
      .eq("restaurante_id", data.restauranteId)
      .order("criado_em", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { pedidos: pedidos ?? [] };
  });

/** Atualiza dados básicos de um restaurante (super-admin). */
export const atualizarRestauranteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      nome: z.string().trim().min(2),
      slug: z.string().trim().min(2),
      cor_primaria: z.string().nullable(),
      pix_habilitado: z.boolean(),
      pix_chave: z.string().nullable(),
      pix_nome_titular: z.string().nullable(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);
    const { error } = await supabaseAdmin
      .from("restaurantes")
      .update({
        nome: data.nome,
        slug: data.slug,
        cor_primaria: data.cor_primaria,
        pix_habilitado: data.pix_habilitado,
        pix_chave: data.pix_chave,
        pix_nome_titular: data.pix_nome_titular,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAction(userId, "atualizar_restaurante", "restaurante", data.id, {});
    return { ok: true };
  });

/** Suspende ou reativa um restaurante. */
export const setRestauranteAtivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      ativo: z.boolean(),
      motivo: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    const { error } = await supabaseAdmin
      .from("restaurantes")
      .update({ ativo: data.ativo })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await logAction(userId, data.ativo ? "reativar_restaurante" : "suspender_restaurante", "restaurante", data.id, {
      motivo: data.motivo ?? null,
    });

    return { ok: true };
  });

/** Exclui restaurante (cascata manual). */
export const excluirRestaurante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    // remover dependências
    await supabaseAdmin.from("pedido_itens").delete().in(
      "pedido_id",
      (await supabaseAdmin.from("pedidos").select("id").eq("restaurante_id", data.id)).data?.map((p) => p.id) ?? []
    );
    await supabaseAdmin.from("pedidos").delete().eq("restaurante_id", data.id);
    await supabaseAdmin.from("produtos").delete().eq("restaurante_id", data.id);
    await supabaseAdmin.from("categorias").delete().eq("restaurante_id", data.id);
    await supabaseAdmin.from("mesas").delete().eq("restaurante_id", data.id);
    await supabaseAdmin.from("restaurante_membros").delete().eq("restaurante_id", data.id);
    const { error } = await supabaseAdmin.from("restaurantes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    await logAction(userId, "excluir_restaurante", "restaurante", data.id);
    return { ok: true };
  });

/** Adiciona um membro (por email) a um restaurante. */
export const adicionarMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      email: z.string().email(),
      papel: z.enum(["admin", "staff"]).default("admin"),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    const { data: usersList, error: errUsers } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (errUsers) throw new Error(errUsers.message);
    const target = usersList.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!target) throw new Error("Usuário com este email não foi encontrado.");

    const { error } = await supabaseAdmin
      .from("restaurante_membros")
      .insert({ restaurante_id: data.restauranteId, user_id: target.id, papel: data.papel });
    if (error) throw new Error(error.message);

    await logAction(userId, "adicionar_membro", "restaurante", data.restauranteId, {
      email: data.email,
      papel: data.papel,
    });
    return { ok: true };
  });

/** Lista membros de um restaurante com email. */
export const listarMembros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    const { data: membros, error } = await supabaseAdmin
      .from("restaurante_membros")
      .select("id, user_id, papel, criado_em")
      .eq("restaurante_id", data.restauranteId);
    if (error) throw new Error(error.message);

    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const emailMap = new Map(usersList?.users.map((u) => [u.id, u.email ?? ""]));
    return {
      membros: (membros ?? []).map((m) => ({ ...m, email: emailMap.get(m.user_id) ?? "—" })),
    };
  });

/** Remove um membro. */
export const removerMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ membroId: z.string().uuid(), restauranteId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    const { error } = await supabaseAdmin
      .from("restaurante_membros")
      .delete()
      .eq("id", data.membroId);
    if (error) throw new Error(error.message);

    await logAction(userId, "remover_membro", "restaurante", data.restauranteId, {
      membroId: data.membroId,
    });
    return { ok: true };
  });
