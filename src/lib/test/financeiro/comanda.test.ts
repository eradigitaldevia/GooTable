import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabaseAdmin } from "@/lib/test/__helpers/supabase";
import {
  getOrCreateTestUser,
  releaseTestUser,
  ensureSignedIn,
} from "@/lib/test/__helpers/auth";
import { createFixtures, cleanupFixtures, type FixtureContext } from "@/lib/test/__helpers/fixtures";

describe("Comanda - recálculo de total", () => {
  let ctx: FixtureContext;
  let user: { userId: string; email: string; password: string };

  beforeAll(async () => {
    const auth = await getOrCreateTestUser();
    await ensureSignedIn(auth.client);
    user = { userId: auth.userId, email: auth.email, password: (auth.client as any).__testCredentials.password };
    ctx = await createFixtures(auth.userId, auth.email);
  });

  afterAll(async () => {
    await cleanupFixtures(ctx);
    await releaseTestUser(user);
  });

  it("recalcula subtotal e total quando há pedidos não cancelados", async () => {
    const item = {
      produto_id: ctx.produto.id,
      nome_produto: ctx.produto.nome,
      quantidade: 2,
      preco_unit: ctx.produto.preco,
      observacao: null,
      cliente_nome: ctx.cliente.nome,
      cliente_id: ctx.cliente.id,
    };

    const { data: pedidoId, error: pedidoError } = await supabaseAdmin.rpc(
      "criar_pedido_publico",
      {
        _restaurante_id: ctx.restaurante.id,
        _mesa_id: ctx.mesa.id,
        _sessao_id: ctx.sessao.id,
        _comanda_id: ctx.comanda.id,
        _cliente_id: ctx.cliente.id,
        _observacao: "",
        _total: ctx.produto.preco * 2,
        _itens: [item],
      }
    );

    if (pedidoError) throw pedidoError;
    expect(pedidoId).toBeTruthy();

    const { data: comanda, error } = await supabaseAdmin
      .from("comandas")
      .select("subtotal, total, taxa_servico_valor")
      .eq("id", ctx.comanda.id)
      .single();

    if (error) throw error;
    expect(comanda?.subtotal).toBe(ctx.produto.preco * 2);
    expect(comanda?.total).toBe(ctx.produto.preco * 2);
  });

  it("não fecha comanda se pagamento for parcial", async () => {
    const { data: result, error } = await supabaseAdmin.rpc("fechar_comanda_se_quitada", {
      _comanda_id: ctx.comanda.id,
    });

    if (error) throw error;
    expect(result).toBe(false);

    const { data: comanda } = await supabaseAdmin
      .from("comandas")
      .select("status")
      .eq("id", ctx.comanda.id)
      .single();
    expect(comanda?.status).toBe("aberta");
  });

  it("inclui taxa de serviço no total quando habilitada", async () => {
    await supabaseAdmin
      .from("restaurantes")
      .update({
        taxa_servico_habilitada: true,
        taxa_servico_percentual: 10,
      })
      .eq("id", ctx.restaurante.id);

    await supabaseAdmin.rpc("recalcular_total_comanda", {
      _comanda_id: ctx.comanda.id,
    });

    const { data: comanda, error } = await supabaseAdmin
      .from("comandas")
      .select("subtotal, taxa_servico_valor, total")
      .eq("id", ctx.comanda.id)
      .single();

    if (error) throw error;
    const expectedTaxa = Math.round((comanda!.subtotal || 0) * 0.1 * 100) / 100;
    expect(comanda?.taxa_servico_valor).toBeCloseTo(expectedTaxa, 2);
    expect(comanda?.total).toBeCloseTo((comanda?.subtotal || 0) + expectedTaxa, 2);
  });
});
