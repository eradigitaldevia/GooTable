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
  /**
   * Telefone existe e o cliente tem comanda aberta em outra mesa.
   * Nenhum dado do cliente é revelado antes da confirmação (nome + 4 dígitos).
   */
  | { encontrado: true; exigeConfirmacao: true }
  | {
      encontrado: true;
      exigeConfirmacao?: false;
      conflito?: undefined;
      cliente: { id: string; nome: string };
      sessaoId: string;
      comandaId: string;
      mesaId: string;
      restauranteId: string;
    };

export type ConfirmarIdentidadeResultado =
  | {
      conflito: ConflitoMesa;
      cliente: { id: string; nome: string };
    }
  | {
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
    const mesa = await resolverMesaAtivaPorQr(data.qrToken);

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

    // Cliente já está em outra mesa: exige confirmação antes de revelar
    // nome e mesa de origem.
    const conflito = await detectarConflitoMesa(
      cli.id as string,
      mesa.restaurante_id,
      mesa.id,
    );
    if (conflito) {
      return { encontrado: true, exigeConfirmacao: true };
    }

    const { sessaoId, comandaId } = await entrarComClienteExistente(
      mesa,
      cli.id as string,
    );

    return {
      encontrado: true,
      cliente: {
        id: cli.id as string,
        nome: primeiroNome(cli.nome as string),
      },
      sessaoId,
      comandaId,
      mesaId: mesa.id,
      restauranteId: mesa.restaurante_id,
    };
  });

/**
 * Confirma a identidade (nome + 4 últimos dígitos) quando o telefone existe e
 * o cliente está com comanda aberta em outra mesa. Só após acertar é que o
 * nome e a mesa de origem são revelados.
 */
export const confirmarIdentidadeConflitoFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        qrToken: z.string().min(1).max(80),
        telefone: z
          .string()
          .transform(onlyDigits)
          .pipe(z.string().min(10, "Telefone inválido").max(15, "Telefone inválido")),
        nome: z.string().trim().min(2).max(80),
        ultimos4: z
          .string()
          .transform(onlyDigits)
          .pipe(z.string().length(4, "Informe os 4 últimos dígitos")),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<ConfirmarIdentidadeResultado> => {
    const mesa = await resolverMesaAtivaPorQr(data.qrToken);

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

    const confere =
      !!cli &&
      confirmacaoIdentidadeConfere({
        nomeCadastro: cli.nome as string,
        telefoneCadastro: cli.telefone as string,
        nomeInformado: data.nome,
        ultimos4: data.ultimos4,
      });

    if (!confere) {
      await registrarTentativaIdentificacao({
        restauranteId: mesa.restaurante_id,
        qrToken: data.qrToken,
        telefone: data.telefone,
        sucesso: false,
      });
      throw new Error(CONFIRMACAO_INVALIDA_MENSAGEM);
    }

    await registrarTentativaIdentificacao({
      restauranteId: mesa.restaurante_id,
      qrToken: data.qrToken,
      telefone: data.telefone,
      sucesso: true,
    });

    const clienteId = cli!.id as string;
    const cliente = { id: clienteId, nome: primeiroNome(cli!.nome as string) };

    const conflito = await detectarConflitoMesa(
      clienteId,
      mesa.restaurante_id,
      mesa.id,
    );
    if (conflito) return { conflito, cliente };

    const { sessaoId, comandaId } = await entrarComClienteExistente(mesa, clienteId);
    return {
      cliente,
      sessaoId,
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
