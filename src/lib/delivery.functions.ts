import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAcessoRestaurante } from "./auth.server";
import { gerarPixPayload } from "./pix";
import { carregarBannersPublicos } from "./banners-publicos.server";
import type { BannerPublico } from "./banners.functions";
import type { Json } from "@/integrations/supabase/types";
import type {
  CategoriaPublica,
  ProdutoPublico,
  RestaurantePublico,
} from "./cardapio-publico.functions";

/* ============================================================
 * Tipos públicos
 * ============================================================ */

export interface RestauranteDeliveryPublico extends RestaurantePublico {
  delivery_ativo: boolean;
  delivery_slug: string;
  delivery_taxa_entrega: number;
  delivery_pedido_minimo: number;
  delivery_tempo_estimado_min: number;
  delivery_retirada_ativa: boolean;
  delivery_raio_km: number | null;
  delivery_aceita_dinheiro: boolean;
  delivery_aceita_cartao_entrega: boolean;
  delivery_aceita_pix: boolean;
  delivery_whatsapp: string | null;
  pix_habilitado: boolean;
  aberto_agora: boolean;
  proxima_abertura_label: string | null;
}

export interface EnderecoCliente {
  cep?: string | null;
  rua: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  referencia?: string | null;
}

export type GetRestauranteDeliveryResultado =
  | { erro: string; restaurante?: never; categorias?: never; produtos?: never; banners?: never }
  | {
      erro?: never;
      restaurante: RestauranteDeliveryPublico;
      categorias: CategoriaPublica[];
      produtos: ProdutoPublico[];
      banners: BannerPublico[];
    };

/* ============================================================
 * Helpers locais
 * ============================================================ */

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/i, "Slug inválido");

const telefoneSchema = z
  .string()
  .transform(onlyDigits)
  .pipe(z.string().min(10, "Telefone inválido").max(15, "Telefone inválido"));

const nomeSchema = z.string().trim().min(2).max(80);

const enderecoSchema = z.object({
  cep: z.string().max(9).optional().nullable(),
  rua: z.string().trim().min(1).max(150),
  numero: z.string().trim().min(1).max(20),
  complemento: z.string().max(80).optional().nullable(),
  bairro: z.string().trim().min(1).max(80),
  cidade: z.string().trim().min(1).max(80),
  uf: z.string().trim().length(2),
  referencia: z.string().max(150).optional().nullable(),
});

const itemSchema = z.object({
  produto_id: z.string().uuid(),
  quantidade: z.number().int().min(1).max(99),
  observacao: z.string().max(300).optional(),
});

const pagamentoSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("pix") }),
  z.object({
    tipo: z.literal("dinheiro"),
    troco_para: z.number().min(0).optional().nullable(),
  }),
  z.object({ tipo: z.literal("cartao_entrega") }),
]);

const SELECT_RESTAURANTE_DELIVERY =
  "id, nome, logo_url, cor_primaria, cor_secundaria, cor_acento, tema_cardapio, ativo, upsell_habilitado, " +
  "delivery_ativo, delivery_slug, delivery_taxa_entrega, delivery_pedido_minimo, delivery_tempo_estimado_min, " +
  "delivery_retirada_ativa, delivery_raio_km, delivery_aceita_dinheiro, delivery_aceita_cartao_entrega, " +
  "delivery_aceita_pix, delivery_whatsapp, pix_habilitado, pix_chave, pix_nome_titular";

type RestauranteDeliveryRow = RestauranteDeliveryPublico & {
  pix_chave: string | null;
  pix_nome_titular: string | null;
  horario_funcionamento: unknown;
};

async function carregarRestaurantePorSlug(slug: string): Promise<RestauranteDeliveryRow> {
  const { data, error } = await supabaseAdmin
    .from("restaurantes")
    .select("*")
    .eq("delivery_slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Restaurante não encontrado");
  if (!data.ativo) throw new Error("Restaurante temporariamente indisponível");
  if (!data.delivery_ativo) throw new Error("Delivery indisponível");
  return data as unknown as RestauranteDeliveryRow;
}

function toPublicRestaurante(r: RestauranteDeliveryRow): RestauranteDeliveryPublico {
  const {
    pix_chave: _pc,
    pix_nome_titular: _pn,
    horario_funcionamento: _hf,
    ...rest
  } = r;
  void _pc;
  void _pn;
  void _hf;
  return rest as RestauranteDeliveryPublico;
}

const DIAS_LABEL = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

type TurnoHorario = { inicio: string; fim: string };
type DiaHorario = { dia: number; aberto: boolean; turnos: TurnoHorario[] };

function hhmmToMin(s: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Calcula label "Reabrimos {dia} às {hh:mm}" a partir do JSON e do horário SP. */
function calcularProximaAbertura(horarioRaw: unknown): string | null {
  if (!Array.isArray(horarioRaw) || horarioRaw.length === 0) return null;
  const horario = horarioRaw as DiaHorario[];

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  // weekday short -> index
  const parts = fmt.formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hojeIdx = map[wd] ?? 0;
  const minutosAgora = hh * 60 + mm;

  type Candidato = { offsetDias: number; minutos: number };
  let melhor: Candidato | null = null;

  for (let offset = 0; offset < 7; offset++) {
    const diaIdx = (hojeIdx + offset) % 7;
    const conf = horario.find((d) => d.dia === diaIdx);
    if (!conf || !conf.aberto || !Array.isArray(conf.turnos)) continue;
    for (const t of conf.turnos) {
      const ini = hhmmToMin(t.inicio);
      if (ini == null) continue;
      if (offset === 0 && ini <= minutosAgora) continue;
      const cand: Candidato = { offsetDias: offset, minutos: ini };
      if (
        !melhor ||
        cand.offsetDias < melhor.offsetDias ||
        (cand.offsetDias === melhor.offsetDias && cand.minutos < melhor.minutos)
      ) {
        melhor = cand;
      }
    }
  }

  if (!melhor) return null;
  const diaIdx = (hojeIdx + melhor.offsetDias) % 7;
  const h = Math.floor(melhor.minutos / 60).toString().padStart(2, "0");
  const m = (melhor.minutos % 60).toString().padStart(2, "0");
  const quando = melhor.offsetDias === 0
    ? "hoje"
    : melhor.offsetDias === 1
      ? "amanhã"
      : DIAS_LABEL[diaIdx];
  return `Reabrimos ${quando} às ${h}:${m}.`;
}

async function checarAbertoAgora(restauranteId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("restaurante_aberto_agora", {
    _restaurante_id: restauranteId,
  });
  if (error) return true; // fail-open para não derrubar o cardápio
  return !!data;
}

/* ============================================================
 * 1) Carregar restaurante + cardápio (público)
 * ============================================================ */

export const getRestauranteDeliveryFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ slug: slugSchema }).parse(d))
  .handler(async ({ data }): Promise<GetRestauranteDeliveryResultado> => {
    try {
      const r = await carregarRestaurantePorSlug(data.slug);

      const [{ data: cats, error: cErr }, { data: prods, error: pErr }, banners] = await Promise.all([
        supabaseAdmin
          .from("categorias")
          .select("id, nome, ordem")
          .eq("restaurante_id", r.id)
          .order("ordem"),
        supabaseAdmin
          .from("produtos")
          .select(
            "id, nome, descricao, preco, imagem_url, categoria_id, disponivel, ordem, destaque_upsell",
          )
          .eq("restaurante_id", r.id)
          .eq("disponivel", true)
          .order("ordem"),
        carregarBannersPublicos(r.id, "delivery"),
      ]);
      if (cErr) return { erro: cErr.message };
      if (pErr) return { erro: pErr.message };

      const aberto = await checarAbertoAgora(r.id);
      const publico = toPublicRestaurante(r);
      publico.aberto_agora = aberto;
      publico.proxima_abertura_label = aberto
        ? null
        : calcularProximaAbertura((r as unknown as { horario_funcionamento: unknown }).horario_funcionamento);

      return {
        restaurante: publico,
        categorias: (cats ?? []) as CategoriaPublica[],
        produtos: (prods ?? []) as ProdutoPublico[],
        banners,
      };
    } catch (e) {
      return { erro: e instanceof Error ? e.message : "Falha ao carregar restaurante" };
    }
  });

/* ============================================================
 * 2) Buscar cliente por telefone (público)
 * ============================================================ */

export interface ClienteDeliveryResumo {
  encontrado: boolean;
  nome?: string;
  enderecos: EnderecoCliente[];
}

export const buscarClienteDeliveryFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ slug: slugSchema, telefone: telefoneSchema }).parse(d),
  )
  .handler(async ({ data }): Promise<ClienteDeliveryResumo> => {
    const r = await carregarRestaurantePorSlug(data.slug);
    const { data: cli, error } = await supabaseAdmin
      .from("clientes")
      .select("nome, enderecos")
      .eq("restaurante_id", r.id)
      .eq("telefone", data.telefone)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cli) return { encontrado: false, enderecos: [] };
    const enderecos = Array.isArray(cli.enderecos)
      ? (cli.enderecos as unknown as EnderecoCliente[])
      : [];
    return { encontrado: true, nome: cli.nome as string, enderecos };
  });

/* ============================================================
 * 3) Criar pedido delivery / retirada (público)
 * ============================================================ */

export interface CriarPedidoDeliveryResultado {
  pedidoId: string;
  comandaId: string;
  total: number;
  taxa_entrega: number;
  previsao_min: number;
  pix?: { payload: string; valor: number; chave: string; titular: string };
}

export const criarPedidoDeliveryFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        slug: slugSchema,
        cliente: z.object({ nome: nomeSchema, telefone: telefoneSchema }),
        modo: z.enum(["delivery", "retirada"]),
        endereco: enderecoSchema.optional(),
        itens: z.array(itemSchema).min(1).max(60),
        observacao: z.string().max(300).optional(),
        cupomCodigo: z.string().max(40).optional(),
        pagamento: pagamentoSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<CriarPedidoDeliveryResultado> => {
    const r = await carregarRestaurantePorSlug(data.slug);

    // 0. Bloqueia se restaurante fora do horário de funcionamento
    const aberto = await checarAbertoAgora(r.id);
    if (!aberto) {
      throw new Error("Estamos fechados no momento. Tente novamente no horário de funcionamento.");
    }

    // 1. Validações de modalidade
    if (data.modo === "delivery") {
      if (!data.endereco) throw new Error("Endereço obrigatório para delivery");
    } else if (!r.delivery_retirada_ativa) {
      throw new Error("Retirada indisponível");
    }

    // 2. Validação de pagamento aceito
    if (data.pagamento.tipo === "pix" && !(r.delivery_aceita_pix && r.pix_habilitado && r.pix_chave)) {
      throw new Error("PIX indisponível");
    }
    if (data.pagamento.tipo === "dinheiro" && !r.delivery_aceita_dinheiro) {
      throw new Error("Pagamento em dinheiro indisponível");
    }
    if (data.pagamento.tipo === "cartao_entrega" && !r.delivery_aceita_cartao_entrega) {
      throw new Error("Pagamento com cartão na entrega indisponível");
    }

    // 3. Calcula subtotal a partir dos preços reais (anti-tampering)
    const ids = Array.from(new Set(data.itens.map((i) => i.produto_id)));
    const { data: prods, error: pErr } = await supabaseAdmin
      .from("produtos")
      .select("id, nome, preco, disponivel, restaurante_id")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);
    const prodMap = new Map<string, { preco: number; nome: string; disponivel: boolean }>();
    for (const p of prods ?? []) {
      if (p.restaurante_id !== r.id) throw new Error("Produto inválido");
      prodMap.set(p.id, {
        preco: Number(p.preco),
        nome: p.nome as string,
        disponivel: p.disponivel,
      });
    }
    let subtotal = 0;
    const itensPayload: Array<{
      produto_id: string;
      nome_produto: string;
      quantidade: number;
      preco_unit: number;
      observacao: string;
      cliente_nome: string;
      cliente_id: string;
    }> = [];
    for (const it of data.itens) {
      const real = prodMap.get(it.produto_id);
      if (!real) throw new Error("Produto não encontrado");
      if (!real.disponivel) throw new Error(`${real.nome} indisponível`);
      subtotal += real.preco * it.quantidade;
      itensPayload.push({
        produto_id: it.produto_id,
        nome_produto: real.nome,
        quantidade: it.quantidade,
        preco_unit: real.preco,
        observacao: it.observacao ?? "",
        cliente_nome: data.cliente.nome,
        cliente_id: "",
      });
    }

    // 4. Pedido mínimo
    const minimo = Number(r.delivery_pedido_minimo ?? 0);
    if (minimo > 0 && subtotal < minimo) {
      throw new Error(`Pedido mínimo é R$ ${minimo.toFixed(2)}`);
    }

    // 5. Upsert cliente
    const agora = new Date().toISOString();
    const { data: existente, error: cliErr } = await supabaseAdmin
      .from("clientes")
      .select("id, enderecos")
      .eq("restaurante_id", r.id)
      .eq("telefone", data.cliente.telefone)
      .maybeSingle();
    if (cliErr) throw new Error(cliErr.message);

    let clienteId: string;
    let enderecosAtuais: EnderecoCliente[] = [];
    if (existente) {
      clienteId = existente.id as string;
      enderecosAtuais = Array.isArray(existente.enderecos)
        ? (existente.enderecos as unknown as EnderecoCliente[])
        : [];
      const { error: upErr } = await supabaseAdmin
        .from("clientes")
        .update({ nome: data.cliente.nome, ultima_visita: agora })
        .eq("id", clienteId);
      if (upErr) throw new Error(upErr.message);
    } else {
      const { data: ins, error: insErr } = await supabaseAdmin
        .from("clientes")
        .insert({
          restaurante_id: r.id,
          nome: data.cliente.nome,
          telefone: data.cliente.telefone,
          ultima_visita: agora,
        })
        .select("id")
        .single();
      if (insErr || !ins) throw new Error(insErr?.message ?? "Falha ao criar cliente");
      clienteId = ins.id as string;
    }
    for (const it of itensPayload) it.cliente_id = clienteId;

    // 6. Localiza mesa virtual DELIVERY do restaurante
    const { data: mesa, error: mErr } = await supabaseAdmin
      .from("mesas")
      .select("id")
      .eq("restaurante_id", r.id)
      .eq("is_virtual", true)
      .eq("numero", "DELIVERY")
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!mesa) throw new Error("Mesa virtual de delivery não configurada");
    const mesaId = mesa.id as string;

    // 7. Cria nova sessão + comanda individual por pedido
    const { data: sessaoIns, error: sErr } = await supabaseAdmin
      .from("mesa_sessoes")
      .insert({ mesa_id: mesaId, restaurante_id: r.id })
      .select("id")
      .single();
    if (sErr || !sessaoIns) throw new Error(sErr?.message ?? "Falha ao abrir sessão");
    const sessaoId = sessaoIns.id as string;

    const { data: comandaIns, error: coErr } = await supabaseAdmin
      .from("comandas")
      .insert({
        sessao_id: sessaoId,
        restaurante_id: r.id,
        tipo: "individual",
        titular_cliente_id: clienteId,
      })
      .select("id")
      .single();
    if (coErr || !comandaIns) throw new Error(coErr?.message ?? "Falha ao criar comanda");
    const comandaId = comandaIns.id as string;

    const { error: vErr } = await supabaseAdmin
      .from("mesa_sessao_clientes")
      .insert({ sessao_id: sessaoId, cliente_id: clienteId, comanda_id: comandaId });
    if (vErr) throw new Error(vErr.message);

    // 8. Cria pedido via RPC (reusa toda lógica de cliente_id/origem='cliente')
    const { data: pedidoIdRpc, error: rpcErr } = await supabaseAdmin.rpc(
      "criar_pedido_publico",
      {
        _restaurante_id: r.id,
        _mesa_id: mesaId,
        _sessao_id: sessaoId,
        _comanda_id: comandaId,
        _cliente_id: clienteId,
        _observacao: data.observacao ?? "",
        _total: subtotal,
        _itens: itensPayload,
      },
    );
    if (rpcErr || !pedidoIdRpc) {
      throw new Error(rpcErr?.message ?? "Falha ao criar pedido");
    }
    const pedidoId = pedidoIdRpc as unknown as string;

    // 9. Aplica cupom (se enviado)
    if (data.cupomCodigo) {
      const { error: cupErr } = await supabaseAdmin.rpc("aplicar_cupom_comanda", {
        _comanda_id: comandaId,
        _codigo: data.cupomCodigo,
        _cliente_id: clienteId,
      });
      if (cupErr) {
        // Não falha o pedido — cupom inválido apenas é ignorado e reportado em log
        console.warn("[delivery] cupom inválido:", cupErr.message);
      }
    }

    // 10. Atualiza pedido com canal/endereço/taxa/telefone/previsão
    const taxa = data.modo === "delivery" ? Number(r.delivery_taxa_entrega ?? 0) : 0;
    const previsaoMin = Number(r.delivery_tempo_estimado_min ?? 45);
    const enderecoPayload =
      data.modo === "delivery" && data.endereco
        ? {
            endereco_cep: data.endereco.cep ?? null,
            endereco_rua: data.endereco.rua,
            endereco_numero: data.endereco.numero,
            endereco_complemento: data.endereco.complemento ?? null,
            endereco_bairro: data.endereco.bairro,
            endereco_cidade: data.endereco.cidade,
            endereco_uf: data.endereco.uf.toUpperCase(),
            endereco_referencia: data.endereco.referencia ?? null,
          }
        : {};
    const { error: updPedErr } = await supabaseAdmin
      .from("pedidos")
      .update({
        canal: data.modo,
        cliente_telefone: data.cliente.telefone,
        taxa_entrega: taxa,
        previsao_entrega_min: previsaoMin,
        ...enderecoPayload,
      })
      .eq("id", pedidoId);
    if (updPedErr) throw new Error(updPedErr.message);

    // 11. Salva últimos 3 endereços do cliente (apenas delivery)
    if (data.modo === "delivery" && data.endereco) {
      const novoEnd: EnderecoCliente = { ...data.endereco, uf: data.endereco.uf.toUpperCase() };
      const chave = (e: EnderecoCliente) =>
        `${(e.cep ?? "").replace(/\D/g, "")}|${e.rua.toLowerCase()}|${e.numero}|${e.bairro.toLowerCase()}|${e.cidade.toLowerCase()}|${e.uf.toUpperCase()}`;
      const novaLista = [novoEnd, ...enderecosAtuais.filter((e) => chave(e) !== chave(novoEnd))].slice(
        0,
        3,
      );
      await supabaseAdmin
        .from("clientes")
        .update({ enderecos: novaLista as unknown as Json })
        .eq("id", clienteId);
    }

    // 12. Lê comanda final (cupom pode ter ajustado total) e cria pagamento pendente
    const { data: comandaFinal } = await supabaseAdmin
      .from("comandas")
      .select("total")
      .eq("id", comandaId)
      .maybeSingle();
    const totalComanda = Number(comandaFinal?.total ?? subtotal);
    const totalFinal = totalComanda + taxa;

    const metodoPagamento =
      data.pagamento.tipo === "pix"
        ? "pix"
        : data.pagamento.tipo === "dinheiro"
          ? "dinheiro"
          : "cartao";
    const observacaoPag =
      data.pagamento.tipo === "dinheiro" && data.pagamento.troco_para
        ? `Troco para R$ ${Number(data.pagamento.troco_para).toFixed(2)}`
        : data.pagamento.tipo === "cartao_entrega"
          ? "Cartão na entrega"
          : null;
    const { error: pagErr } = await supabaseAdmin.from("pagamentos").insert({
      restaurante_id: r.id,
      comanda_id: comandaId,
      sessao_id: sessaoId,
      cliente_id: clienteId,
      metodo: metodoPagamento,
      valor: totalFinal,
      status: "pendente",
      observacao: observacaoPag,
    });
    if (pagErr) throw new Error(pagErr.message);

    // 13. Gera PIX payload se aplicável
    let pix: CriarPedidoDeliveryResultado["pix"] | undefined;
    if (data.pagamento.tipo === "pix" && r.pix_chave && r.pix_nome_titular) {
      pix = {
        payload: gerarPixPayload({
          chave: r.pix_chave,
          nomeTitular: r.pix_nome_titular,
          valor: totalFinal,
          txid: pedidoId.replace(/-/g, "").slice(0, 25),
          descricao: `Pedido ${pedidoId.slice(0, 8)}`,
        }),
        valor: totalFinal,
        chave: r.pix_chave,
        titular: r.pix_nome_titular,
      };
    }

    return {
      pedidoId,
      comandaId,
      total: totalFinal,
      taxa_entrega: taxa,
      previsao_min: previsaoMin,
      pix,
    };
  });

/* ============================================================
 * 4) Rastreio do pedido (público, com polling)
 * ============================================================ */

export interface RastreioPedido {
  id: string;
  status: "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";
  criado_em: string;
  previsao_min: number | null;
  modo: "delivery" | "retirada";
  total: number;
  taxa_entrega: number;
  endereco_resumo: string | null;
  pagamento_metodo: string | null;
  pagamento_status: string | null;
  pix_payload: string | null;
  itens: Array<{ nome: string; quantidade: number; preco_unit: number }>;
  restaurante: {
    nome: string;
    cor_primaria: string | null;
    logo_url: string | null;
    whatsapp: string | null;
  };
}

export const getPedidoRastreioFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        slug: slugSchema,
        pedidoId: z.string().uuid(),
        telefone: telefoneSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<RastreioPedido> => {
    const r = await carregarRestaurantePorSlug(data.slug);

    const { data: ped, error } = await supabaseAdmin
      .from("pedidos")
      .select("*")
      .eq("id", data.pedidoId)
      .eq("restaurante_id", r.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ped) throw new Error("Pedido não encontrado");
    if ((ped.cliente_telefone as string | null) !== data.telefone) {
      throw new Error("Telefone não confere com o pedido");
    }
    if (ped.canal !== "delivery" && ped.canal !== "retirada") {
      throw new Error("Pedido inválido");
    }

    const [{ data: itens }, { data: pag }] = await Promise.all([
      supabaseAdmin
        .from("pedido_itens")
        .select("nome_produto, quantidade, preco_unit")
        .eq("pedido_id", ped.id),
      supabaseAdmin
        .from("pagamentos")
        .select("metodo, status, valor")
        .eq("comanda_id", ped.comanda_id as string)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const taxa = Number(ped.taxa_entrega ?? 0);
    const totalComItens = Number(ped.total ?? 0) + taxa;

    const enderecoResumo =
      ped.canal === "delivery" && ped.endereco_rua
        ? `${ped.endereco_rua}, ${ped.endereco_numero}${
            ped.endereco_complemento ? ` (${ped.endereco_complemento})` : ""
          } — ${ped.endereco_bairro}, ${ped.endereco_cidade}/${ped.endereco_uf}`
        : null;

    let pixPayload: string | null = null;
    if (
      pag?.metodo === "pix" &&
      pag.status === "pendente" &&
      r.pix_chave &&
      r.pix_nome_titular
    ) {
      pixPayload = gerarPixPayload({
        chave: r.pix_chave,
        nomeTitular: r.pix_nome_titular,
        valor: Number(pag.valor ?? totalComItens),
        txid: ped.id.replace(/-/g, "").slice(0, 25),
        descricao: `Pedido ${ped.id.slice(0, 8)}`,
      });
    }

    return {
      id: ped.id as string,
      status: ped.status as RastreioPedido["status"],
      criado_em: ped.criado_em as string,
      previsao_min: (ped.previsao_entrega_min as number | null) ?? null,
      modo: ped.canal as "delivery" | "retirada",
      total: totalComItens,
      taxa_entrega: taxa,
      endereco_resumo: enderecoResumo,
      pagamento_metodo: (pag?.metodo as string | null) ?? null,
      pagamento_status: (pag?.status as string | null) ?? null,
      pix_payload: pixPayload,
      itens: (itens ?? []).map((it) => ({
        nome: it.nome_produto as string,
        quantidade: it.quantidade as number,
        preco_unit: Number(it.preco_unit),
      })),
      restaurante: {
        nome: r.nome,
        cor_primaria: r.cor_primaria,
        logo_url: r.logo_url,
        whatsapp: r.delivery_whatsapp,
      },
    };
  });

/* ============================================================
 * 5) Confirmar pagamento PIX delivery (admin)
 * ============================================================ */

export const confirmarPagamentoPixDeliveryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restauranteId: z.string().uuid(),
        pagamentoId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAcessoRestaurante(supabase, userId, data.restauranteId);

    const { data: pag, error: selErr } = await supabase
      .from("pagamentos")
      .select("id, status, valor, comanda_id, restaurante_id")
      .eq("id", data.pagamentoId)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!pag || pag.restaurante_id !== data.restauranteId) {
      throw new Error("Pagamento não encontrado");
    }
    if (pag.status !== "pendente") {
      throw new Error("Pagamento não está pendente");
    }

    const { error: updErr } = await supabase
      .from("pagamentos")
      .update({
        status: "confirmado",
        confirmado_por: userId,
        confirmado_em: new Date().toISOString(),
      })
      .eq("id", data.pagamentoId);
    if (updErr) throw new Error(updErr.message);

    return { ok: true };
  });