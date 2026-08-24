import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabaseAdmin } from "@/lib/test/__helpers/supabase";
import {
  getOrCreateTestUser,
  releaseTestUser,
  ensureSignedIn,
} from "@/lib/test/__helpers/auth";
import {
  createFixtures,
  createGarcomFixture,
  cleanupFixtures,
  type FixtureContext,
} from "@/lib/test/__helpers/fixtures";

describe("Comissões", () => {
  let ctx: FixtureContext & { garcom: NonNullable<FixtureContext["garcom"]> };
  let user: { userId: string; email: string; password: string };
  let client: any;

  beforeAll(async () => {
    const auth = await getOrCreateTestUser();
    client = auth.client;
    await ensureSignedIn(client);
    user = { userId: auth.userId, email: auth.email, password: (auth.client as any).__testCredentials.password };

    const base = await createFixtures(auth.userId, auth.email);
    const garcom = await createGarcomFixture(base.restaurante.id, {
      nome: "Garçom Comissão",
      percentual_comissao: 10,
    });

    // Atribui garçom à mesa como usuário autenticado (membro do restaurante)
    const { error: atribuirError } = await client.rpc("atribuir_garcom_mesa", {
      _mesa_id: base.mesa.id,
      _garcom_id: garcom.id,
      _sessao_id: base.sessao.id,
    });
    if (atribuirError) throw atribuirError;

    // Ativa comissão para o restaurante
    const { error: ativaError } = await supabaseAdmin
      .from("restaurantes")
      .update({ comissao_ativa: true })
      .eq("id", base.restaurante.id);
    if (ativaError) throw ativaError;

    // Cria pedido de R$ 100 para a mesa
    const { data: pedidoId, error: pedidoError } = await supabaseAdmin.rpc("criar_pedido_publico", {
      _restaurante_id: base.restaurante.id,
      _mesa_id: base.mesa.id,
      _sessao_id: base.sessao.id,
      _comanda_id: base.comanda.id,
      _cliente_id: base.cliente.id,
      _observacao: "",
      _total: 100,
      _itens: [
        {
          produto_id: base.produto.id,
          nome_produto: base.produto.nome,
          quantidade: 10,
          preco_unit: 10,
          observacao: null,
          cliente_nome: base.cliente.nome,
          cliente_id: base.cliente.id,
        },
      ],
    });
    if (pedidoError) throw pedidoError;

    // Marca pedido como entregue para gerar comissão
    await supabaseAdmin
      .from("pedidos")
      .update({ status: "entregue", entregue_em: new Date().toISOString() })
      .eq("id", pedidoId);

    ctx = { ...base, garcom };
  });

  afterAll(async () => {
    await cleanupFixtures(ctx);
    await releaseTestUser(user);
  });

  it("gera comissão apenas quando a comanda é quitada", async () => {
    const { data: comandaAntes } = await client
      .from("comandas")
      .select("total, status")
      .eq("id", ctx.comanda.id)
      .single();
    expect(comandaAntes?.status).toBe("aberta");

    const { error: pagamentoError } = await client.rpc("registrar_pagamento", {
      _comanda_id: ctx.comanda.id,
      _metodo: "pix",
      _valor: comandaAntes?.total || 0,
      _observacao: "",
    });
    if (pagamentoError) throw pagamentoError;

    const { data: comanda } = await client
      .from("comandas")
      .select("status, total, total_pago")
      .eq("id", ctx.comanda.id)
      .single();
    expect(comanda?.status).toBe("fechada");

    const { data: comissoes } = await client
      .from("comissoes")
      .select("valor_comissao, percentual, status, pedido_id, garcom_id")
      .eq("garcom_id", ctx.garcom.id);

    expect(comissoes?.length).toBeGreaterThan(0);
    const comissao = comissoes?.[0];
    expect(comissao?.percentual).toBe(10);
    expect(comissao?.valor_comissao).toBe(10);
    expect(comissao?.status).toBe("pendente");
  });
});
