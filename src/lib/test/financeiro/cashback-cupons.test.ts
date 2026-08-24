import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabaseAdmin } from "@/lib/test/__helpers/supabase";
import {
  getOrCreateTestUser,
  releaseTestUser,
  ensureSignedIn,
} from "@/lib/test/__helpers/auth";
import { createFixtures, cleanupFixtures, type FixtureContext } from "@/lib/test/__helpers/fixtures";

describe("Cashback e cupons", () => {
  let ctx: FixtureContext;
  let user: { userId: string; email: string; password: string };
  let client: any;

  beforeAll(async () => {
    const auth = await getOrCreateTestUser();
    client = auth.client;
    await ensureSignedIn(client);
    user = { userId: auth.userId, email: auth.email, password: (auth.client as any).__testCredentials.password };
    ctx = await createFixtures(auth.userId, auth.email);

    // Cria pedido de R$ 100
    const { error: pedidoError } = await supabaseAdmin.rpc("criar_pedido_publico", {
      _restaurante_id: ctx.restaurante.id,
      _mesa_id: ctx.mesa.id,
      _sessao_id: ctx.sessao.id,
      _comanda_id: ctx.comanda.id,
      _cliente_id: ctx.cliente.id,
      _observacao: "",
      _total: 100,
      _itens: [
        {
          produto_id: ctx.produto.id,
          nome_produto: ctx.produto.nome,
          quantidade: 10,
          preco_unit: 10,
          observacao: null,
          cliente_nome: ctx.cliente.nome,
          cliente_id: ctx.cliente.id,
        },
      ],
    });
    if (pedidoError) throw pedidoError;
  });

  afterAll(async () => {
    await cleanupFixtures(ctx);
    await releaseTestUser(user);
  });

  it("aplica cashback respeitando limite máximo", async () => {
    await supabaseAdmin
      .from("clientes")
      .update({ cashback_saldo: 50 })
      .eq("id", ctx.cliente.id);

    await supabaseAdmin.from("programa_fidelidade").insert({
      restaurante_id: ctx.restaurante.id,
      ativo: true,
      percentual_cashback: 10,
      percentual_max_resgate: 20,
      validade_dias: 30,
      valor_minimo_pedido: 0,
      regras_json: {},
    });

    const { data, error } = await client.rpc("aplicar_cashback", {
      _comanda_id: ctx.comanda.id,
      _cliente_id: ctx.cliente.id,
      _valor: 20,
    });

    if (error) throw error;
    expect(data?.aplicado).toBe(20);

    const { data: comanda } = await client
      .from("comandas")
      .select("cashback_resgatado, total")
      .eq("id", ctx.comanda.id)
      .single();

    expect(comanda?.cashback_resgatado).toBe(20);
    expect(comanda?.total).toBe(80);
  });

  it("rejeita cashback acima do limite permitido", async () => {
    const { error } = await client.rpc("aplicar_cashback", {
      _comanda_id: ctx.comanda.id,
      _cliente_id: ctx.cliente.id,
      _valor: 100,
    });

    expect(error).not.toBeNull();
  });

  it("aplica e remove cupom recalculando total", async () => {
    const codigo = `CUPOM-${crypto.randomUUID().slice(0, 6)}`;
    await supabaseAdmin.from("cupons").insert({
      restaurante_id: ctx.restaurante.id,
      codigo,
      tipo: "percentual",
      valor: 10,
      uso_max: 10,
      uso_atual: 0,
      ativo: true,
      regras_json: {},
    });

    // Reseta cashback para não interferir
    await supabaseAdmin
      .from("comandas")
      .update({ cashback_resgatado: 0 })
      .eq("id", ctx.comanda.id);
    await supabaseAdmin.rpc("recalcular_total_comanda", { _comanda_id: ctx.comanda.id });

    const { data: aplicar, error: aplicarError } = await client.rpc("aplicar_cupom_comanda", {
      _comanda_id: ctx.comanda.id,
      _codigo: codigo,
      _cliente_id: ctx.cliente.id,
    });

    if (aplicarError) throw aplicarError;
    expect(aplicar?.valido).toBe(true);

    const { data: comandaComCupom } = await client
      .from("comandas")
      .select("desconto_cupom, total")
      .eq("id", ctx.comanda.id)
      .single();
    expect(comandaComCupom?.desconto_cupom).toBe(10);
    expect(comandaComCupom?.total).toBe(90);

    const { error: removerError } = await client.rpc("remover_cupom_comanda", {
      _comanda_id: ctx.comanda.id,
    });
    expect(removerError).toBeNull();

    const { data: comandaSemCupom } = await client
      .from("comandas")
      .select("desconto_cupom, total")
      .eq("id", ctx.comanda.id)
      .single();
    expect(comandaSemCupom?.desconto_cupom).toBe(0);
    expect(comandaSemCupom?.total).toBe(100);
  });
});
