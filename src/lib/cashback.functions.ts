import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertClienteNaSessao } from "./sessoes.server";

/**
 * Aplica resgate de cashback do cliente em uma comanda.
 * Pública: valida qrToken → mesa → sessão → comanda → cliente.
 * Cliente só pode resgatar para si mesmo.
 */
export const aplicarCashbackFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        qrToken: z.string().min(1).max(80),
        clienteId: z.string().uuid(),
        comandaId: z.string().uuid(),
        sessaoId: z.string().uuid(),
        valor: z.number().positive().max(100000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: mesa, error: mErr } = await supabaseAdmin
      .from("mesas")
      .select("id, restaurante_id, ativa")
      .eq("qr_token", data.qrToken)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!mesa || !mesa.ativa) throw new Error("Mesa indisponível");

    const { data: sessao, error: sErr } = await supabaseAdmin
      .from("mesa_sessoes")
      .select("id, mesa_id, status")
      .eq("id", data.sessaoId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!sessao || sessao.mesa_id !== mesa.id || sessao.status !== "aberta") {
      throw new Error("Sessão indisponível");
    }

    const { data: comanda, error: cErr } = await supabaseAdmin
      .from("comandas")
      .select("id, sessao_id, status, restaurante_id")
      .eq("id", data.comandaId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (
      !comanda ||
      comanda.sessao_id !== sessao.id ||
      comanda.status !== "aberta" ||
      comanda.restaurante_id !== mesa.restaurante_id
    ) {
      throw new Error("Comanda indisponível");
    }

    const { data: cliente, error: cliErr } = await supabaseAdmin
      .from("clientes")
      .select("id, restaurante_id")
      .eq("id", data.clienteId)
      .maybeSingle();
    if (cliErr) throw new Error(cliErr.message);
    if (!cliente || cliente.restaurante_id !== mesa.restaurante_id) {
      throw new Error("Cliente inválido");
    }

    await assertClienteNaSessao(sessao.id as string, data.clienteId);

    const { data: rpc, error: rpcErr } = await supabaseAdmin.rpc("aplicar_cashback", {
      _comanda_id: data.comandaId,
      _cliente_id: data.clienteId,
      _valor: data.valor,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    return rpc as { aplicado: number; novo_saldo: number; cashback_resgatado_comanda: number };
  });
