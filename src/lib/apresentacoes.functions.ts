import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAcessoRestaurante } from "./auth.server";

export interface ApresentacaoArtista {
  id: string;
  apresentacao_id: string;
  artista_id: string;
  artista_nome: string;
  peso: number;
}

export interface Apresentacao {
  id: string;
  restaurante_id: string;
  nome: string;
  inicio_em: string;
  fim_em: string | null;
  encerrada_por: string | null;
  criada_por: string | null;
  criado_em: string;
  atualizado_em: string;
  artistas: ApresentacaoArtista[];
  valor_couvert_total?: number;
}

async function buildArtistas(
  apresentacaoIds: string[],
): Promise<Record<string, ApresentacaoArtista[]>> {
  if (apresentacaoIds.length === 0) return {};
  const { data, error } = await supabaseAdmin
    .from("apresentacao_artistas")
    .select("id, apresentacao_id, artista_id, peso, artistas:artista_id(nome)")
    .in("apresentacao_id", apresentacaoIds);
  if (error) throw new Error(error.message);
  const map: Record<string, ApresentacaoArtista[]> = {};
  for (const r of data ?? []) {
    const nome =
      (r as { artistas?: { nome: string } | null }).artistas?.nome ?? "—";
    (map[r.apresentacao_id] ??= []).push({
      id: r.id,
      apresentacao_id: r.apresentacao_id,
      artista_id: r.artista_id,
      artista_nome: nome,
      peso: Number(r.peso),
    });
  }
  return map;
}

export const listarApresentacoesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      apenasAbertas: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    let q = supabaseAdmin
      .from("apresentacoes")
      .select("*")
      .eq("restaurante_id", data.restauranteId)
      .order("inicio_em", { ascending: false })
      .limit(100);
    if (data.apenasAbertas) q = q.is("fim_em", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.id);
    const artistasMap = await buildArtistas(ids);

    // Soma do couvert artístico por apresentação (para exibir prévia)
    const totaisMap: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: tRows } = await supabaseAdmin
        .from("comanda_couverts")
        .select("apresentacao_id, quantidade, valor_unitario")
        .in("apresentacao_id", ids)
        .eq("tipo", "artistico");
      for (const c of tRows ?? []) {
        if (!c.apresentacao_id) continue;
        totaisMap[c.apresentacao_id] =
          (totaisMap[c.apresentacao_id] ?? 0) +
          Number(c.quantidade) * Number(c.valor_unitario);
      }
    }

    return (rows ?? []).map(
      (r) =>
        ({
          ...r,
          artistas: artistasMap[r.id] ?? [],
          valor_couvert_total: totaisMap[r.id] ?? 0,
        }) as Apresentacao,
    );
  });

export const apresentacaoAtivaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ restauranteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: row, error } = await supabaseAdmin
      .from("apresentacoes")
      .select("*")
      .eq("restaurante_id", data.restauranteId)
      .is("fim_em", null)
      .order("inicio_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const map = await buildArtistas([row.id]);
    return { ...row, artistas: map[row.id] ?? [] } as Apresentacao;
  });

const artistaPesoSchema = z.object({
  artista_id: z.string().uuid(),
  peso: z.number().min(0).max(100),
});

export const abrirApresentacaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      nome: z.string().trim().min(2).max(140),
      inicioEm: z.string().datetime().optional(),
      artistas: z.array(artistaPesoSchema).min(1).max(10),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const soma = data.artistas.reduce((a, x) => a + x.peso, 0);
    if (Math.abs(soma - 100) > 0.01) {
      throw new Error(`A soma dos pesos deve ser 100% (atual: ${soma.toFixed(2)}%).`);
    }

    // Verifica se já há uma aberta
    const { data: aberta } = await supabaseAdmin
      .from("apresentacoes")
      .select("id")
      .eq("restaurante_id", data.restauranteId)
      .is("fim_em", null)
      .maybeSingle();
    if (aberta) {
      throw new Error("Já existe uma apresentação aberta. Encerre-a antes de abrir outra.");
    }

    const { data: ap, error } = await supabaseAdmin
      .from("apresentacoes")
      .insert({
        restaurante_id: data.restauranteId,
        nome: data.nome,
        inicio_em: data.inicioEm ?? new Date().toISOString(),
        criada_por: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: errAA } = await supabaseAdmin
      .from("apresentacao_artistas")
      .insert(
        data.artistas.map((a) => ({
          apresentacao_id: ap.id,
          artista_id: a.artista_id,
          peso: a.peso,
        })),
      );
    if (errAA) {
      await supabaseAdmin.from("apresentacoes").delete().eq("id", ap.id);
      throw new Error(errAA.message);
    }
    return { id: ap.id as string };
  });

export const atualizarPesosApresentacaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      apresentacaoId: z.string().uuid(),
      artistas: z.array(artistaPesoSchema).min(1).max(10),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const soma = data.artistas.reduce((a, x) => a + x.peso, 0);
    if (Math.abs(soma - 100) > 0.01) {
      throw new Error(`A soma dos pesos deve ser 100% (atual: ${soma.toFixed(2)}%).`);
    }

    const { data: ap } = await supabaseAdmin
      .from("apresentacoes")
      .select("id, restaurante_id, fim_em")
      .eq("id", data.apresentacaoId)
      .maybeSingle();
    if (!ap || ap.restaurante_id !== data.restauranteId) {
      throw new Error("Apresentação não encontrada.");
    }
    if (ap.fim_em) {
      throw new Error("Apresentação já encerrada — pesos não podem ser alterados.");
    }
    await supabaseAdmin
      .from("apresentacao_artistas")
      .delete()
      .eq("apresentacao_id", data.apresentacaoId);
    const { error } = await supabaseAdmin.from("apresentacao_artistas").insert(
      data.artistas.map((a) => ({
        apresentacao_id: data.apresentacaoId,
        artista_id: a.artista_id,
        peso: a.peso,
      })),
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const encerrarApresentacaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      restauranteId: z.string().uuid(),
      apresentacaoId: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: ap } = await supabaseAdmin
      .from("apresentacoes")
      .select("id, restaurante_id, fim_em")
      .eq("id", data.apresentacaoId)
      .maybeSingle();
    if (!ap || ap.restaurante_id !== data.restauranteId) {
      throw new Error("Apresentação não encontrada.");
    }
    if (ap.fim_em) {
      throw new Error("Apresentação já encerrada.");
    }
    const { error } = await supabase
      .from("apresentacoes")
      .update({ fim_em: new Date().toISOString(), encerrada_por: userId })
      .eq("id", data.apresentacaoId);
    if (error) throw new Error(error.message);

    // Gera repasse (idempotente). Função SQL valida config e sai se desligado.
    const { error: errRep } = await supabase.rpc(
      "gerar_repasse_couvert_artistico",
      { p_apresentacao_id: data.apresentacaoId },
    );
    if (errRep) throw new Error(errRep.message);
    return { ok: true };
  });