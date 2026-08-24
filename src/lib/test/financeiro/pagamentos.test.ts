import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getOrCreateTestUser,
  releaseTestUser,
  ensureSignedIn,
} from "@/lib/test/__helpers/auth";
import { createFixtures, cleanupFixtures, type FixtureContext } from "@/lib/test/__helpers/fixtures";

describe("Pagamentos", () => {
  let ctx: FixtureContext;
  let user: { userId: string; email: string; password: string };
  let client: any;

  beforeAll(async () => {
    const auth = await getOrCreateTestUser();
    client = auth.client;
    await ensureSignedIn(client);
    user = { userId: auth.userId, email: auth.email, password: (auth.client as any).__testCredentials.password };
    ctx = await createFixtures(auth.userId, auth.email);

    // Cria um pedido de R$ 50
    const { error: pedidoError } = await (client as any).rpc("criar_pedido_publico", {
      _restaurante_id: ctx.restaurante.id,
      _mesa_id: ctx.mesa.id,
      _sessao_id: ctx.sessao.id,
      _comanda_id: ctx.comanda.id,
      _cliente_id: ctx.cliente.id,
      _observacao: "",
      _total: 50,
      _itens: [
        {
          produto_id: ctx.produto.id,
          nome_produto: ctx.produto.nome,
          quantidade: 5,
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

  it("registra pagamento parcial e mantém comanda aberta", async () => {
    const { data, error } = await (client as any).rpc("registrar_pagamento", {
      _comanda_id: ctx.comanda.id,
      _metodo: "dinheiro",
      _valor: 20,
      _observacao: "",
    });

    if (error) throw error;
    expect(data).toBeTruthy();

    const { data: comanda } = await (client as any)
      .from("comandas")
      .select("status, total_pago, total")
      .eq("id", ctx.comanda.id)
      .single();

    expect(comanda?.status).toBe("aberta");
    expect(comanda?.total_pago).toBe(20);
  });

  it("fecha comanda quando pagamento completo é registrado", async () => {
    const { data: comandaAntes } = await (client as any)
      .from("comandas")
      .select("total, total_pago")
      .eq("id", ctx.comanda.id)
      .single();

    const restante = (comandaAntes?.total || 0) - (comandaAntes?.total_pago || 0);

    const { data, error } = await (client as any).rpc("registrar_pagamento", {
      _comanda_id: ctx.comanda.id,
      _metodo: "pix",
      _valor: restante,
      _observacao: "",
    });

    if (error) throw error;
    expect(data).toBeTruthy();

    const { data: comanda } = await (client as any)
      .from("comandas")
      .select("status, total_pago")
      .eq("id", ctx.comanda.id)
      .single();

    expect(comanda?.status).toBe("fechada");
    expect(comanda?.total_pago).toBeCloseTo(comandaAntes?.total || 0, 2);
  });
});
