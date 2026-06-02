import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  criarComandaIndividual,
  garantirComandaCompartilhada,
  garantirSessaoAberta,
  listarComandasAtivas,
  vincularClienteSessao,
  detectarConflitoMesa,
  transferirCliente,
  type ConflitoMesa,
} from "./sessoes.server";

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
      cliente: { id: string; nome: string; telefone: string };
    }
  | {
      encontrado: true;
      conflito?: undefined;
      cliente: { id: string; nome: string; telefone: string };
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

    const { data: cli, error: cErr } = await supabaseAdmin
      .from("clientes")
      .select("id, nome, telefone")
      .eq("restaurante_id", mesa.restaurante_id)
      .eq("telefone", data.telefone)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cli) return { encontrado: false };

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
          nome: cli.nome as string,
          telefone: cli.telefone as string,
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
      const ativas = await listarComandasAtivas(sessao.id);
      comandaId =
        ativas.length > 0
          ? await garantirComandaCompartilhada(sessao.id, mesa.restaurante_id)
          : await criarComandaIndividual(sessao.id, mesa.restaurante_id, cli.id as string);
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
        nome: cli.nome as string,
        telefone: cli.telefone as string,
      },
      sessaoId: sessao.id,
      comandaId,
      mesaId: mesa.id,
      restauranteId: mesa.restaurante_id,
    };
  });
