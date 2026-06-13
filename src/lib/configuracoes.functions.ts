import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { assertAcessoRestaurante } from "./auth.server";

/* ---------- Validação PIX (chamada no submit) ---------- */

const pixSchema = z.object({
  pix_habilitado: z.boolean(),
  pix_chave: z.string().trim().max(120).nullable(),
  pix_nome_titular: z.string().trim().max(80).nullable(),
});

export const validarPixFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => pixSchema.parse(d))
  .handler(async ({ data }) => {
    if (data.pix_habilitado && !data.pix_chave) {
      throw new Error("Informe a chave PIX ou desabilite o PIX");
    }
    return { ok: true };
  });

const configSchema = z.discriminatedUnion("aba", [
  z.object({
    aba: z.literal("identidade"),
    restauranteId: z.string().uuid(),
    nome: z.string().trim().min(2).max(100),
    cor_primaria: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
    cor_secundaria: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
    cor_acento: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
    tema_cardapio: z.enum(["claro", "escuro"]),
    logo_url: z.string().nullable(),
  }),
  z.object({
    aba: z.literal("pagamentos"),
    restauranteId: z.string().uuid(),
    pix_habilitado: z.boolean(),
    pix_chave: z.string().trim().max(120).nullable(),
    pix_nome_titular: z.string().trim().max(80).nullable(),
  }),
  z.object({
    aba: z.literal("taxas"),
    restauranteId: z.string().uuid(),
    taxa_servico_habilitada: z.boolean(),
    taxa_servico_percentual: z.number().min(0).max(30).nullable(),
    taxa_servico_descricao: z.string().trim().max(200).nullable(),
    taxa_servico_repasse_habilitado: z.boolean(),
    taxa_servico_repasse_percentual: z.number().min(0).max(100).nullable(),
    couvert_mesa_habilitado: z.boolean(),
    couvert_mesa_valor: z.number().min(0).max(1000).nullable(),
    couvert_mesa_descricao: z.string().trim().max(300).nullable(),
  }),
  z.object({
    aba: z.literal("couvert-artistico"),
    restauranteId: z.string().uuid(),
    couvert_artistico_habilitado: z.boolean(),
    couvert_artistico_valor: z.number().min(0).max(1000).nullable(),
    couvert_artistico_descricao: z.string().trim().max(300).nullable(),
    couvert_artistico_repasse_habilitado: z.boolean(),
    couvert_artistico_repasse_percentual: z.number().min(0).max(100).nullable(),
  }),
  z.object({
    aba: z.literal("comissoes"),
    restauranteId: z.string().uuid(),
    comissao_modo: z.enum(["pedido", "item"]),
    comissao_rateio_troca_turno: z.boolean(),
    comissao_pedido_cliente: z.boolean(),
    comissao_pedido_cliente_percentual: z.number().min(0).max(100).nullable(),
    permitir_atendimento_cruzado: z.boolean(),
  }),
  z.object({
    aba: z.literal("caixa"),
    restauranteId: z.string().uuid(),
    caixa_alerta_horas: z.number().int().min(1).max(72),
    caixa_teto_dinheiro: z.number().min(0).max(10_000_000).nullable(),
    caixa_conferencia_cega: z.boolean(),
    caixa_obrigatorio_para_pagamento: z.boolean(),
  }),
  z.object({
    aba: z.literal("cardapio"),
    restauranteId: z.string().uuid(),
    upsell_habilitado: z.boolean(),
  }),
]);

export const atualizarConfiguracoesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => configSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    let update: TablesUpdate<"restaurantes"> = {};

    switch (data.aba) {
      case "identidade": {
        update = {
          nome: data.nome,
          cor_primaria: data.cor_primaria,
          cor_secundaria: data.cor_secundaria,
          cor_acento: data.cor_acento,
          tema_cardapio: data.tema_cardapio,
          logo_url: data.logo_url,
        };
        break;
      }
      case "pagamentos": {
        if (data.pix_habilitado && !data.pix_chave) {
          throw new Error("Informe a chave PIX ou desabilite o PIX");
        }
        update = {
          pix_habilitado: data.pix_habilitado,
          pix_chave: data.pix_chave || null,
          pix_nome_titular: data.pix_nome_titular || null,
        };
        break;
      }
      case "taxas": {
        if (data.taxa_servico_habilitada && (data.taxa_servico_percentual == null || data.taxa_servico_percentual <= 0)) {
          throw new Error("Informe o percentual da taxa de serviço (> 0).");
        }
        if (data.couvert_mesa_habilitado && (data.couvert_mesa_valor == null || data.couvert_mesa_valor <= 0)) {
          throw new Error("Informe o valor do couvert de mesa (> 0).");
        }
        let repasseHab = data.taxa_servico_repasse_habilitado;
        let repassePerc = data.taxa_servico_repasse_percentual;
        if (!data.taxa_servico_habilitada) {
          repasseHab = false;
          repassePerc = null;
        } else if (repasseHab && (repassePerc == null || repassePerc <= 0)) {
          throw new Error("Informe o percentual de repasse aos garçons (> 0).");
        }
        update = {
          taxa_servico_habilitada: data.taxa_servico_habilitada,
          taxa_servico_percentual: data.taxa_servico_percentual,
          taxa_servico_descricao: data.taxa_servico_descricao,
          taxa_servico_repasse_habilitado: repasseHab,
          taxa_servico_repasse_percentual: repassePerc,
          couvert_mesa_habilitado: data.couvert_mesa_habilitado,
          couvert_mesa_valor: data.couvert_mesa_valor,
          couvert_mesa_descricao: data.couvert_mesa_descricao,
        };
        break;
      }
      case "couvert-artistico": {
        if (data.couvert_artistico_habilitado && (data.couvert_artistico_valor == null || data.couvert_artistico_valor <= 0)) {
          throw new Error("Informe o valor por pessoa do couvert artístico (> 0).");
        }
        let repCouvHab = data.couvert_artistico_repasse_habilitado;
        let repCouvPerc = data.couvert_artistico_repasse_percentual;
        if (!data.couvert_artistico_habilitado) {
          repCouvHab = false;
          repCouvPerc = null;
        } else if (repCouvHab && (repCouvPerc == null || repCouvPerc <= 0)) {
          throw new Error("Informe o percentual de repasse aos artistas (> 0).");
        }
        update = {
          couvert_artistico_habilitado: data.couvert_artistico_habilitado,
          couvert_artistico_valor: data.couvert_artistico_valor,
          couvert_artistico_descricao: data.couvert_artistico_descricao,
          couvert_artistico_repasse_habilitado: repCouvHab,
          couvert_artistico_repasse_percentual: repCouvPerc,
        };
        break;
      }
      case "comissoes": {
        update = {
          comissao_modo: data.comissao_modo,
          comissao_rateio_troca_turno: data.comissao_rateio_troca_turno,
          comissao_pedido_cliente: data.comissao_pedido_cliente,
          comissao_pedido_cliente_percentual: data.comissao_pedido_cliente_percentual,
          permitir_atendimento_cruzado: data.permitir_atendimento_cruzado,
        };
        break;
      }
      case "caixa": {
        update = {
          caixa_alerta_horas: data.caixa_alerta_horas,
          caixa_teto_dinheiro: data.caixa_teto_dinheiro,
          caixa_conferencia_cega: data.caixa_conferencia_cega,
          caixa_obrigatorio_para_pagamento: data.caixa_obrigatorio_para_pagamento,
        };
        break;
      }
      case "cardapio": {
        update = { upsell_habilitado: data.upsell_habilitado };
        break;
      }
    }

    const { error } = await supabase
      .from("restaurantes")
      .update(update)
      .eq("id", data.restauranteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Upload de logo ---------- */

export const uploadLogoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => {
    if (!(d instanceof FormData)) throw new Error("Esperado FormData");
    const file = d.get("file");
    const restauranteId = d.get("restauranteId");
    if (!(file instanceof File)) throw new Error("Arquivo inválido");
    if (typeof restauranteId !== "string" || !restauranteId) throw new Error("restauranteId inválido");
    z.string().uuid().parse(restauranteId);
    if (file.size > 2 * 1024 * 1024) throw new Error("Logo maior que 2MB");
    return { file, restauranteId };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const ext = data.file.name.split(".").pop() ?? "png";
    const path = `${data.restauranteId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("produtos")
      .upload(path, data.file, { upsert: true, contentType: data.file.type || undefined });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("produtos").getPublicUrl(path);
    return { url: pub.publicUrl };
  });
