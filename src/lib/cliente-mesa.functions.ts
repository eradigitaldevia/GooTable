import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  criarComandaIndividual,
  garantirSessaoAberta,
  vincularClienteSessao,
  detectarConflitoMesa,
  transferirCliente,
  juntarComandas,
  gerarDivisaoConta,
  sanitizarComandasOrfas,
  type ConflitoMesa,
  type ModoDivisao,
  type DivisaoContaResultado,
  type JuntarComandasResultado,
} from "./sessoes.server";

export type { ModoDivisao, DivisaoContaResultado, JuntarComandasResultado };
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoRestaurante } from "./auth.server";
import {
  IDENTIFICACAO_BLOQUEADA_MENSAGEM,
  identificacaoBloqueada,
  primeiroNome,
  registrarTentativaIdentificacao,
} from "./identificacao-throttle.server";

const onlyDigits = (s: string) => s.replace(/\D/g, "");

/**
 * Valida se uma sessão e comanda salvas em localStorage ainda estão `abertas`
 * no backend. Usado ao reidratar a identidade do cliente após dias.
 */
export const validarSessaoComandaFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        sessaoId: z.string().uuid(),
        comandaId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ valida: boolean }> => {
    const { data: sessao, error: sErr } = await supabaseAdmin
      .from("mesa_sessoes")
      .select("id, status")
      .eq("id", data.sessaoId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!sessao || sessao.status !== "aberta") return { valida: false };

    const { data: comanda, error: cErr } = await supabaseAdmin
      .from("comandas")
      .select("id, status, sessao_id")
      .eq("id", data.comandaId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!comanda || comanda.status !== "aberta" || comanda.sessao_id !== data.sessaoId) {
      return { valida: false };
    }
    return { valida: true };
  });

export type BuscarClientePorTelefoneResultado =
  | { encontrado: false }
  | {
      encontrado: true;
      conflito: ConflitoMesa;
      cliente: { id: string; nome: string };
    }
  | {
      encontrado: true;
      conflito?: undefined;
      cliente: { id: string; nome: string };
      sessaoId: string;
      comandaId: string;
      mesaId: string;
      restauranteId: string;
    };

/**
 * Busca um cliente pelo telefone no escopo do restaurante associado ao QR Token.
 * Se encontrado, garante sessão e comanda abertas (auto: participa de compartilhada
 * se houver ativa, senão cria individual) e devolve os IDs prontos para uso.
 */
export const buscarClientePorTelefoneFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        qrToken: z.string().min(1).max(80),
        telefone: z
          .string()
          .transform(onlyDigits)
          .pipe(z.string().min(10, "Telefone inválido").max(15, "Telefone inválido")),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<BuscarClientePorTelefoneResultado> => {
    const { data: mesa, error: mErr } = await supabaseAdmin
      .from("mesas")
      .select("id, restaurante_id, ativa")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!mesa || !mesa.ativa) throw new Error("Mesa indisponível");

    const { data: rest, error: rErr } = await supabaseAdmin
      .from("restaurantes")
      .select("ativo")
      .eq("id", mesa.restaurante_id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!rest?.ativo) throw new Error("Restaurante indisponível");

    if (
      await identificacaoBloqueada({
        restauranteId: mesa.restaurante_id,
        qrToken: data.qrToken,
        telefone: data.telefone,
      })
    ) {
      throw new Error(IDENTIFICACAO_BLOQUEADA_MENSAGEM);
    }

    const { data: cli, error: cErr } = await supabaseAdmin
      .from("clientes")
      .select("id, nome, telefone")
      .eq("restaurante_id", mesa.restaurante_id)
      .eq("telefone", data.telefone)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cli) {
      await registrarTentativaIdentificacao({
        restauranteId: mesa.restaurante_id,
        qrToken: data.qrToken,
        telefone: data.telefone,
        sucesso: false,
      });
      return { encontrado: false };
    }

    await registrarTentativaIdentificacao({
      restauranteId: mesa.restaurante_id,
      qrToken: data.qrToken,
      telefone: data.telefone,
      sucesso: true,
    });

    // Bloqueio: cliente já está em outra mesa do mesmo restaurante.
    const conflito = await detectarConflitoMesa(
      cli.id as string,
      mesa.restaurante_id,
      mesa.id,
    );
    if (conflito) {
      return {
        encontrado: true,
        conflito,
        cliente: {
          id: cli.id as string,
          nome: primeiroNome(cli.nome as string),
        },
      };
    }

    const sessao = await garantirSessaoAberta(mesa.id, mesa.restaurante_id);

    // Re-identificação idempotente: se o mesmo cliente já tem vínculo ativo
    // (saiu_em IS NULL) com uma comanda `aberta` nesta sessão, reutilizar essa
    // comanda em vez de criar uma nova compartilhada (que deixaria a individual
    // original órfã).
    let comandaId: string | null = null;
    const { data: vincExistente, error: vExistErr } = await supabaseAdmin
      .from("mesa_sessao_clientes")
      .select("comanda_id")
      .eq("sessao_id", sessao.id)
      .eq("cliente_id", cli.id)
      .is("saiu_em", null)
      .maybeSingle();
    if (vExistErr) throw new Error(vExistErr.message);
    if (vincExistente?.comanda_id) {
      const { data: comandaExist, error: cExistErr } = await supabaseAdmin
        .from("comandas")
        .select("id, status")
        .eq("id", vincExistente.comanda_id as string)
        .maybeSingle();
      if (cExistErr) throw new Error(cExistErr.message);
      if (comandaExist && comandaExist.status === "aberta") {
        comandaId = comandaExist.id as string;
      }
    }

    if (!comandaId) {
      // Sempre individual: cada cliente entra com sua própria comanda.
      comandaId = await criarComandaIndividual(
        sessao.id,
        mesa.restaurante_id,
        cli.id as string,
      );
    }

    await vincularClienteSessao(sessao.id, cli.id as string, comandaId);

    await supabaseAdmin
      .from("clientes")
      .update({ ultima_visita: new Date().toISOString() })
      .eq("id", cli.id);

    return {
      encontrado: true,
      cliente: {
        id: cli.id as string,
        nome: primeiroNome(cli.nome as string),
      },
      sessaoId: sessao.id,
      comandaId,
      mesaId: mesa.id,
      restauranteId: mesa.restaurante_id,
    };
  });

/**
 * Transfere a identidade do cliente de uma comanda/sessão de outra mesa
 * para a mesa identificada pelo QR atual. Bloqueia quando há consumo
 * lançado pelo cliente na origem.
 */
export const transferirClienteParaMesaFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        qrToken: z.string().min(1).max(80),
        clienteId: z.string().uuid(),
        sessaoOrigemId: z.string().uuid(),
        comandaOrigemId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{ sessaoId: string; comandaId: string; mesaId: string; restauranteId: string }> => {
      const { data: mesa, error: mErr } = await supabaseAdmin
        .from("mesas")
        .select("id, restaurante_id, ativa")
        .eq("qr_token", data.qrToken)
        .maybeSingle();
      if (mErr) throw new Error(mErr.message);
      if (!mesa || !mesa.ativa) throw new Error("Mesa indisponível");

      const { data: rest, error: rErr } = await supabaseAdmin
        .from("restaurantes")
        .select("ativo")
        .eq("id", mesa.restaurante_id)
        .maybeSingle();
      if (rErr) throw new Error(rErr.message);
      if (!rest?.ativo) throw new Error("Restaurante indisponível");

      const { sessaoId, comandaId } = await transferirCliente(
        data.clienteId,
        data.sessaoOrigemId,
        data.comandaOrigemId,
        mesa.id,
        mesa.restaurante_id,
      );

      return {
        sessaoId,
        comandaId,
        mesaId: mesa.id,
        restauranteId: mesa.restaurante_id,
      };
    },
  );

/* ============================================================
 * Garçom/Caixa: juntar comandas da mesa
 * ============================================================ */

export const juntarComandasMesaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        sessaoId: z.string().uuid(),
        comandaIds: z.array(z.string().uuid()).min(2).max(20),
        titularClienteId: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<JuntarComandasResultado> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    // Sanity: sessão pertence ao restaurante.
    const { data: sessao, error: sErr } = await supabaseAdmin
      .from("mesa_sessoes")
      .select("id, restaurante_id, status")
      .eq("id", data.sessaoId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!sessao || sessao.restaurante_id !== data.restauranteId) {
      throw new Error("Sessão inválida");
    }
    if (sessao.status !== "aberta") throw new Error("Sessão não está aberta");
    return juntarComandas(data.sessaoId, data.comandaIds, data.titularClienteId);
  });

/* ============================================================
 * Garçom/Caixa: calcular plano de divisão
 * ============================================================ */

const modoSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("igual"), n: z.number().int().min(1).max(30) }),
  z.object({
    tipo: z.literal("por_participante"),
    clienteIds: z.array(z.string().uuid()).min(1).max(30),
  }),
  z.object({
    tipo: z.literal("por_item"),
    atribuicoes: z
      .array(
        z.object({
          itemId: z.string().uuid(),
          clienteId: z.string().uuid().nullable(),
        }),
      )
      .min(1)
      .max(500),
  }),
]);

export const gerarDivisaoContaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        sessaoId: z.string().uuid(),
        comandaIds: z.array(z.string().uuid()).min(1).max(20),
        modo: modoSchema,
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<DivisaoContaResultado> => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const { data: sessao, error: sErr } = await supabaseAdmin
      .from("mesa_sessoes")
      .select("id, restaurante_id")
      .eq("id", data.sessaoId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!sessao || sessao.restaurante_id !== data.restauranteId) {
      throw new Error("Sessão inválida");
    }
    return gerarDivisaoConta(data.sessaoId, data.comandaIds, data.modo as ModoDivisao);
  });

/* ============================================================
 * Garçom/Caixa: sanitizar manualmente comandas órfãs de uma sessão
 * ============================================================ */

export const sanitizarComandasOrfasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        sessaoId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);
    const fechadas = await sanitizarComandasOrfas(data.sessaoId);
    return { fechadas };
  });
