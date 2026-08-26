import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { registrarConsentimentoLgpd } from "./lgpd.server";

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
      supabaseAdmin.from("restaurantes").select("id, nome, slug, ativo, contrato_vencimento_em, contrato_notas, contrato_bloqueio_automatico, criado_em").order("criado_em", { ascending: false }),
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
      contrato_vencimento_em: r.contrato_vencimento_em,
      contrato_notas: r.contrato_notas,
      contrato_bloqueio_automatico: r.contrato_bloqueio_automatico,
      criado_em: r.criado_em,
      pedidosMes: pedidosByRest[r.id] ?? 0,
      faturamentoMes: fatByRest[r.id] ?? 0,
      mesas: mesasByRest[r.id] ?? 0,
    }));

    return { rows };
  });

/** Cria restaurante e um dono confirmado pelo superadmin. */
export const criarRestauranteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      nome: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      donoEmail: z.string().email(),
      donoSenha: z.string().min(6),
      donoNome: z.string().min(1),
      vencimento: z.string().nullable().optional(),
      notas: z.string().nullable().optional(),
      bloqueioAutomatico: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    const { data: existente } = await supabaseAdmin
      .from("restaurantes")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (existente) throw new Error("Já existe um restaurante com este slug.");

    const { data: usersList, error: errUsers } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (errUsers) throw new Error(errUsers.message);
    const donoExistente = usersList.users.find((u) => u.email?.toLowerCase() === data.donoEmail.toLowerCase());

    let donoUserId: string;
    if (donoExistente?.id) {
      donoUserId = donoExistente.id;
    } else {
      const { data: novoUsuario, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.donoEmail,
        password: data.donoSenha,
        email_confirm: true,
        user_metadata: { nome: data.donoNome },
      });
      if (createErr || !novoUsuario.user) throw new Error(createErr?.message ?? "Falha ao criar usuário.");
      donoUserId = novoUsuario.user.id;
    }

    const { data: rest, error } = await supabaseAdmin
      .from("restaurantes")
      .insert({
        nome: data.nome,
        slug: data.slug,
        delivery_slug: data.slug,
        contrato_vencimento_em: data.vencimento ?? null,
        contrato_notas: data.notas ?? null,
        ...(data.bloqueioAutomatico === undefined
          ? {}
          : { contrato_bloqueio_automatico: data.bloqueioAutomatico }),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("restaurante_membros")
      .insert({ restaurante_id: rest.id, user_id: donoUserId, papel: "admin" });

    await registrarConsentimentoLgpd({
      escopo: "termos+privacidade",
      entidadeTipo: "restaurante",
      entidadeId: donoUserId,
    });

    await logAction(userId, "criar_restaurante", "restaurante", rest.id, {
      nome: data.nome,
      donoEmail: data.donoEmail,
      donoNome: data.donoNome,
      vencimento: data.vencimento,
    });

    return { restaurante: rest, donoUserId };
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
      cor_primaria: z.string().nullable().optional(),
      pix_habilitado: z.boolean().optional(),
      pix_chave: z.string().nullable().optional(),
      pix_nome_titular: z.string().nullable().optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);
    const patch = {
      nome: data.nome,
      slug: data.slug,
      ...(data.cor_primaria !== undefined ? { cor_primaria: data.cor_primaria } : {}),
      ...(data.pix_habilitado !== undefined ? { pix_habilitado: data.pix_habilitado } : {}),
      ...(data.pix_chave !== undefined ? { pix_chave: data.pix_chave } : {}),
      ...(data.pix_nome_titular !== undefined ? { pix_nome_titular: data.pix_nome_titular } : {}),
    };
    const { error } = await supabaseAdmin
      .from("restaurantes")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAction(userId, "atualizar_restaurante", "restaurante", data.id, {});
    return { ok: true };
  });

/** Atualiza dados comerciais (vencimento e notas) de um restaurante. */
export const atualizarContratoRestaurante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      vencimento: z.string().nullable().optional(),
      notas: z.string().nullable().optional(),
      bloqueioAutomatico: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);
    const { error } = await supabaseAdmin
      .from("restaurantes")
      .update({
        contrato_vencimento_em: data.vencimento ?? null,
        contrato_notas: data.notas ?? null,
        ...(data.bloqueioAutomatico === undefined
          ? {}
          : { contrato_bloqueio_automatico: data.bloqueioAutomatico }),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAction(userId, "atualizar_contrato", "restaurante", data.id, {
      vencimento: data.vencimento,
      bloqueio_automatico: data.bloqueioAutomatico,
    });
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

/** Retorna o dono (primeiro membro admin) de um restaurante. */
export const getDonoRestaurante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restauranteId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    const { data: membro, error } = await supabaseAdmin
      .from("restaurante_membros")
      .select("user_id")
      .eq("restaurante_id", data.restauranteId)
      .eq("papel", "admin")
      .order("criado_em", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!membro) return { dono: null };

    const { data: userRes, error: errUser } = await supabaseAdmin.auth.admin.getUserById(membro.user_id);
    if (errUser) throw new Error(errUser.message);
    const u = userRes.user;
    return {
      dono: {
        user_id: u.id,
        nome: (u.user_metadata?.nome as string) ?? "",
        email: u.email ?? "",
      },
    };
  });

/** Atualiza nome, email e (opcionalmente) senha do dono de um restaurante. */
export const atualizarDonoRestaurante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      nome: z.string().trim().min(1).max(100),
      email: z.string().trim().email().max(255),
      senha: z.string().min(6).max(72).optional(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    const { data: membro, error } = await supabaseAdmin
      .from("restaurante_membros")
      .select("user_id")
      .eq("restaurante_id", data.restauranteId)
      .eq("papel", "admin")
      .order("criado_em", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!membro) throw new Error("Este restaurante não possui um dono cadastrado.");

    const { data: usersList, error: errUsers } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (errUsers) throw new Error(errUsers.message);
    const emailEmUso = usersList.users.find(
      (u) => u.id !== membro.user_id && u.email?.toLowerCase() === data.email.toLowerCase()
    );
    if (emailEmUso) throw new Error("Já existe outro usuário com este email.");

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(membro.user_id, {
      email: data.email,
      email_confirm: true,
      user_metadata: { nome: data.nome },
      ...(data.senha ? { password: data.senha } : {}),
    });
    if (updErr) throw new Error(updErr.message);

    await logAction(userId, "atualizar_dono_restaurante", "restaurante", data.restauranteId, {
      donoEmail: data.email,
      senhaAlterada: !!data.senha,
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
