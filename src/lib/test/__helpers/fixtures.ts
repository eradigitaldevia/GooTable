import { supabaseAdmin } from "./supabase";

export type FixtureContext = {
  user: {
    id: string;
    email: string;
  };
  restaurante: {
    id: string;
    nome: string;
    slug: string;
  };
  mesa: {
    id: string;
    numero: string;
  };
  categoria: {
    id: string;
    nome: string;
  };
  produto: {
    id: string;
    nome: string;
    preco: number;
  };
  cliente: {
    id: string;
    nome: string;
    telefone: string;
  };
  sessao: {
    id: string;
  };
  comanda: {
    id: string;
  };
  garcom?: {
    id: string;
    nome: string;
  };
};

export async function createRestauranteFixture(
  userId: string,
  overrides: Partial<{ nome: string; slug: string }> = {}
): Promise<FixtureContext["restaurante"]> {
  const suffix = crypto.randomUUID().slice(0, 8);
  const nome = overrides.nome ?? `Restaurante Teste ${suffix}`;
  const slug = overrides.slug ?? `rest-teste-${suffix}`;

  const { data, error } = await supabaseAdmin
    .from("restaurantes")
    .insert({
      nome,
      slug,
      pix_habilitado: false,
      ativo: true,
      comissao_modo: "pedido",
      permitir_atendimento_cruzado: false,
      caixa_alerta_horas: 4,
      caixa_conferencia_cega: false,
      caixa_obrigatorio_para_pagamento: false,
      comissao_rateio_troca_turno: false,
      comissao_pedido_cliente: false,
      upsell_habilitado: false,
      taxa_servico_habilitada: false,
      couvert_mesa_habilitado: false,
      couvert_artistico_habilitado: false,
      taxa_servico_repasse_habilitado: false,
      couvert_artistico_repasse_habilitado: false,
      tema_cardapio: "escuro",
      usa_cumim: false,
      delivery_ativo: false,
      delivery_taxa_entrega: 0,
      delivery_pedido_minimo: 0,
      delivery_tempo_estimado_min: 0,
      delivery_retirada_ativa: false,
      delivery_aceita_dinheiro: false,
      delivery_aceita_cartao_entrega: false,
      delivery_aceita_pix: false,
      comissao_ativa: false,
      banners_habilitados: false,
      sessao_ociosa_horas: 4,
      horario_funcionamento: {},
    })
    .select("id, nome, slug")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create restaurante");

  const { error: membroError } = await supabaseAdmin.from("restaurante_membros").insert({
    restaurante_id: data.id,
    user_id: userId,
    papel: "admin",
  });
  if (membroError) throw membroError;

  return data;
}

export async function createMesaFixture(
  restauranteId: string,
  overrides: Partial<{ numero: string }> = {}
): Promise<FixtureContext["mesa"]> {
  const numero = overrides.numero ?? "1";
  const { data, error } = await supabaseAdmin
    .from("mesas")
    .insert({
      restaurante_id: restauranteId,
      numero,
      qr_token: crypto.randomUUID(),
      ativa: true,
      is_virtual: false,
    })
    .select("id, numero")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create mesa");
  return data;
}

export async function createCategoriaFixture(
  restauranteId: string,
  overrides: Partial<{ nome: string; destino: string }> = {}
): Promise<FixtureContext["categoria"]> {
  const { data, error } = await supabaseAdmin
    .from("categorias")
    .insert({
      restaurante_id: restauranteId,
      nome: overrides.nome ?? "Categoria Teste",
      ordem: 1,
      destino: (overrides.destino ?? "cozinha") as "cozinha" | "bar",
    })
    .select("id, nome")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create categoria");
  return data;
}

export async function createProdutoFixture(
  restauranteId: string,
  categoriaId: string,
  overrides: Partial<{ nome: string; preco: number; comissao_aplicavel: boolean }> = {}
): Promise<FixtureContext["produto"]> {
  const { data, error } = await supabaseAdmin
    .from("produtos")
    .insert({
      restaurante_id: restauranteId,
      categoria_id: categoriaId,
      nome: overrides.nome ?? "Produto Teste",
      descricao: "Produto para testes",
      preco: overrides.preco ?? 10,
      disponivel: true,
      ordem: 1,
      comissao_aplicavel: overrides.comissao_aplicavel ?? true,
      destaque_upsell: false,
    })
    .select("id, nome, preco")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create produto");
  return data;
}

export async function createClienteFixture(
  restauranteId: string,
  overrides: Partial<{ nome: string; telefone: string }> = {}
): Promise<FixtureContext["cliente"]> {
  const suffix = crypto.randomUUID().slice(0, 8);
  const { data, error } = await supabaseAdmin
    .from("clientes")
    .insert({
      restaurante_id: restauranteId,
      nome: overrides.nome ?? `Cliente ${suffix}`,
      telefone: overrides.telefone ?? `1199999${suffix.slice(-4)}`,
      cashback_saldo: 0,
      total_gasto: 0,
      pedidos_count: 0,
      ticket_medio: 0,
      enderecos: [],
    })
    .select("id, nome, telefone")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create cliente");
  return data;
}

export async function createSessaoFixture(
  mesaId: string,
  restauranteId: string
): Promise<FixtureContext["sessao"]> {
  const { data, error } = await supabaseAdmin
    .from("mesa_sessoes")
    .insert({
      mesa_id: mesaId,
      restaurante_id: restauranteId,
      status: "aberta",
      aberta_em: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create sessao");
  return data;
}

export async function createComandaFixture(
  sessaoId: string,
  restauranteId: string,
  clienteId: string,
  overrides: Partial<{ tipo: "individual" | "compartilhada" }> = {}
): Promise<FixtureContext["comanda"]> {
  const { data, error } = await supabaseAdmin
    .from("comandas")
    .insert({
      sessao_id: sessaoId,
      restaurante_id: restauranteId,
      tipo: overrides.tipo ?? "individual",
      titular_cliente_id: clienteId,
      subtotal: 0,
      cashback_resgatado: 0,
      total: 0,
      status: "aberta",
      total_pago: 0,
      desconto_cupom: 0,
      taxa_servico_valor: 0,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create comanda");
  return data;
}

export async function createFixtures(userId: string, userEmail: string): Promise<FixtureContext> {
  const restaurante = await createRestauranteFixture(userId);
  const mesa = await createMesaFixture(restaurante.id);
  const categoria = await createCategoriaFixture(restaurante.id);
  const produto = await createProdutoFixture(restaurante.id, categoria.id);
  const cliente = await createClienteFixture(restaurante.id);
  const sessao = await createSessaoFixture(mesa.id, restaurante.id);
  const comanda = await createComandaFixture(sessao.id, restaurante.id, cliente.id);

  return {
    user: { id: userId, email: userEmail },
    restaurante,
    mesa,
    categoria,
    produto,
    cliente,
    sessao,
    comanda,
  };
}

export async function createGarcomFixture(
  restauranteId: string,
  overrides: Partial<{ nome: string; percentual_comissao: number }> = {}
): Promise<NonNullable<FixtureContext["garcom"]>> {
  const { data, error } = await supabaseAdmin
    .from("garcons")
    .insert({
      restaurante_id: restauranteId,
      nome: overrides.nome ?? "Garçom Teste",
      percentual_comissao: overrides.percentual_comissao ?? 10,
      ativo: true,
    })
    .select("id, nome")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create garcom");
  return data;
}

export async function cleanupFixtures(ctx: FixtureContext) {
  // Cleanup in reverse dependency order
  if (ctx.garcom) {
    await supabaseAdmin.from("comissoes").delete().eq("garcom_id", ctx.garcom.id);
    await supabaseAdmin.from("garcons").delete().eq("id", ctx.garcom.id);
  }
  await supabaseAdmin.from("comandas").delete().eq("id", ctx.comanda.id);
  await supabaseAdmin.from("mesa_sessoes").delete().eq("id", ctx.sessao.id);
  await supabaseAdmin.from("clientes").delete().eq("id", ctx.cliente.id);
  await supabaseAdmin.from("produtos").delete().eq("id", ctx.produto.id);
  await supabaseAdmin.from("categorias").delete().eq("id", ctx.categoria.id);
  await supabaseAdmin.from("mesas").delete().eq("id", ctx.mesa.id);
  await supabaseAdmin.from("restaurante_membros").delete().eq("restaurante_id", ctx.restaurante.id);
  await supabaseAdmin.from("restaurantes").delete().eq("id", ctx.restaurante.id);
}
