import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { Loader2, ShoppingBag, Bike, Store, MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemaCardapioProvider } from "@/components/cliente/tema-cardapio-provider";
import { ProdutosListaCategorizada } from "@/components/cliente/produtos-lista-categorizada";
import { ProdutoDialog } from "@/components/cliente/produto-dialog";
import { CarrinhoItemRow } from "@/components/cliente/carrinho-item-row";
import { DeliveryHeader } from "@/components/delivery/delivery-header";
import { EnderecoForm } from "@/components/delivery/endereco-form";
import {
  buscarClienteDeliveryFn,
  criarPedidoDeliveryFn,
  getRestauranteDeliveryFn,
  type EnderecoCliente,
} from "@/lib/delivery.functions";
import type { ProdutoPublico } from "@/lib/cardapio-publico.functions";
import {
  addToDeliveryCart,
  cartCount,
  cartTotal,
  clearDeliveryCart,
  formatBRL,
  getDeliveryCart,
  setDeliveryCart,
  type CartItem,
} from "@/lib/cart";

/* ----------------------------- Route ----------------------------- */

const searchSchema = z.object({
  step: fallback(z.enum(["identificacao", "cardapio", "revisao"]), "cardapio").default(
    "cardapio",
  ),
});

export const Route = createFileRoute("/delivery/$slug")({
  validateSearch: zodValidator(searchSchema),
  component: DeliveryPage,
});

/* ----------------------------- State persist ----------------------------- */

interface DeliveryState {
  telefone: string;
  nome: string;
  modo: "delivery" | "retirada";
  endereco: EnderecoCliente | null;
  enderecosSalvos: EnderecoCliente[];
}

const EMPTY_ENDERECO: EnderecoCliente = {
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  referencia: "",
};

const stateKey = (slug: string) => `delivery-state:${slug}`;
const lastPhoneKey = (slug: string) => `delivery-last-phone:${slug}`;

function loadState(slug: string): DeliveryState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(stateKey(slug));
    return raw ? (JSON.parse(raw) as DeliveryState) : null;
  } catch {
    return null;
  }
}
function saveState(slug: string, s: DeliveryState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(stateKey(slug), JSON.stringify(s));
}

function formatTelefoneBR(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function resumoEndereco(e: EnderecoCliente) {
  return `${e.rua}, ${e.numero}${e.complemento ? ` (${e.complemento})` : ""} — ${e.bairro}`;
}

function ClosedBanner({ mensagem }: { mensagem: string | null }) {
  return (
    <div className="sticky top-[57px] z-20 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm font-medium text-destructive">
      Estamos fechados no momento.
      {mensagem ? ` ${mensagem}` : " Volte no horário de funcionamento."}
    </div>
  );
}

/* ----------------------------- Component ----------------------------- */

function DeliveryPage() {
  const { slug } = Route.useParams();
  const { step } = Route.useSearch();
  const navigate = useNavigate();

  const getRest = useServerFn(getRestauranteDeliveryFn);
  const buscarCliente = useServerFn(buscarClienteDeliveryFn);
  const criarPedido = useServerFn(criarPedidoDeliveryFn);

  const { data, isLoading } = useQuery({
    queryKey: ["delivery-restaurante", slug],
    queryFn: () => getRest({ data: { slug } }),
  });

  const [state, setState] = useState<DeliveryState>(() => ({
    telefone: "",
    nome: "",
    modo: "delivery",
    endereco: null,
    enderecosSalvos: [],
  }));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = loadState(slug);
    if (s) setState(s);
    setHydrated(true);
  }, [slug]);

  useEffect(() => {
    if (hydrated) saveState(slug, state);
  }, [hydrated, slug, state]);

  const erro = data && "erro" in data ? data.erro : null;
  const restaurante = data && !("erro" in data) ? data.restaurante : null;
  const aberto = restaurante ? restaurante.aberto_agora : true;
  const mensagemFechado = restaurante?.proxima_abertura_label ?? null;

  const irPara = (s: DeliveryState["modo"] extends never ? never : "identificacao" | "cardapio" | "revisao") =>
    navigate({
      to: "/delivery/$slug",
      params: { slug },
      search: { step: s },
    });

  // Guard: bloquear acesso direto a `revisao` sem identificação concluída.
  useEffect(() => {
    if (!hydrated) return;
    if (step === "revisao" && !state.telefone) {
      navigate({
        to: "/delivery/$slug",
        params: { slug },
        search: { step: "identificacao" },
        replace: true,
      });
    }
  }, [hydrated, step, state.telefone, slug, navigate]);

  if (isLoading || !hydrated) {
    return (
      <TemaCardapioProvider
        restaurante={restaurante}
        className="flex min-h-screen items-center justify-center"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </TemaCardapioProvider>
    );
  }

  if (erro || !restaurante) {
    return (
      <TemaCardapioProvider
        restaurante={restaurante}
        className="flex min-h-screen items-center justify-center px-6 text-center"
      >
        <div>
          <h1 className="text-2xl font-bold">Ops!</h1>
          <p className="mt-2 text-muted-foreground">{erro ?? "Não foi possível carregar."}</p>
        </div>
      </TemaCardapioProvider>
    );
  }

  const categorias = data && !("erro" in data) ? data.categorias : [];
  const produtos = data && !("erro" in data) ? data.produtos : [];

  return (
    <TemaCardapioProvider restaurante={restaurante} className="min-h-screen pb-32">
      {step === "identificacao" && (
        <StepIdentificacao
          slug={slug}
          restauranteNome={restaurante.nome}
          logo={restaurante.logo_url}
          tempoMin={restaurante.delivery_tempo_estimado_min}
          taxa={restaurante.delivery_taxa_entrega}
          minimo={restaurante.delivery_pedido_minimo}
          state={state}
          setState={setState}
          buscar={async (telefone) => {
            try {
              const r = await buscarCliente({ data: { slug, telefone } });
              return r;
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Erro ao buscar");
              return null;
            }
          }}
          onVoltar={() => irPara("cardapio")}
          onContinuar={() => irPara("revisao")}
        />
      )}

      {step === "cardapio" && (
        <StepCardapio
          slug={slug}
          restauranteNome={restaurante.nome}
          logo={restaurante.logo_url}
          identificado={!!state.telefone}
          minimo={restaurante.delivery_pedido_minimo}
          categorias={categorias}
          produtos={produtos}
          aberto={aberto}
          mensagemFechado={mensagemFechado}
          onContinuar={() => irPara(state.telefone ? "revisao" : "identificacao")}
        />
      )}

      {step === "revisao" && (
        <StepRevisao
          slug={slug}
          restauranteNome={restaurante.nome}
          logo={restaurante.logo_url}
          state={state}
          setState={setState}
          taxa={Number(restaurante.delivery_taxa_entrega ?? 0)}
          minimo={Number(restaurante.delivery_pedido_minimo ?? 0)}
          previsao={restaurante.delivery_tempo_estimado_min}
          retiradaAtiva={restaurante.delivery_retirada_ativa}
          aceitaPix={restaurante.delivery_aceita_pix && restaurante.pix_habilitado}
          aceitaDinheiro={restaurante.delivery_aceita_dinheiro}
          aceitaCartao={restaurante.delivery_aceita_cartao_entrega}
          aberto={aberto}
          mensagemFechado={mensagemFechado}
          onVoltar={() => irPara("cardapio")}
          onTrocarIdentificacao={() => irPara("identificacao")}
          enviar={async (payload) => {
            try {
              const r = await criarPedido({ data: { slug, ...payload } });
              clearDeliveryCart(slug);
              if (typeof window !== "undefined") {
                window.localStorage.setItem(lastPhoneKey(slug), state.telefone);
              }
              toast.success("Pedido enviado!");
              navigate({
                to: "/delivery/$slug/pedido/$pedidoId",
                params: { slug, pedidoId: r.pedidoId },
              });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Erro ao enviar pedido");
            }
          }}
        />
      )}
    </TemaCardapioProvider>
  );
}

/* ============================================================
 * Step 1 — Identificação
 * ============================================================ */

function StepIdentificacao({
  slug,
  restauranteNome,
  logo,
  tempoMin,
  taxa,
  minimo,
  state,
  setState,
  buscar,
  onVoltar,
  onContinuar,
}: {
  slug: string;
  restauranteNome: string;
  logo: string | null;
  tempoMin: number;
  taxa: number;
  minimo: number;
  state: DeliveryState;
  setState: (s: DeliveryState | ((p: DeliveryState) => DeliveryState)) => void;
  buscar: (telefone: string) => Promise<
    | { encontrado: boolean; nome?: string; enderecos: EnderecoCliente[] }
    | null
  >;
  onVoltar: () => void;
  onContinuar: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [telefoneFmt, setTelefoneFmt] = useState(formatTelefoneBR(state.telefone));

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    const digitos = telefoneFmt.replace(/\D/g, "");
    if (digitos.length < 10) {
      toast.error("Informe um telefone válido com DDD");
      return;
    }
    if (state.nome.trim().length < 2) {
      toast.error("Informe seu nome");
      return;
    }
    setEnviando(true);
    const r = await buscar(digitos);
    setEnviando(false);
    setState((p) => ({
      ...p,
      telefone: digitos,
      nome: r?.encontrado && r.nome ? (p.nome.trim() ? p.nome : r.nome) : p.nome,
      enderecosSalvos: r?.enderecos ?? p.enderecosSalvos,
      endereco:
        p.modo === "delivery" && !p.endereco && r?.enderecos?.[0] ? r.enderecos[0] : p.endereco,
    }));
    onContinuar();
  };

  return (
    <>
      <DeliveryHeader nome={restauranteNome} logoUrl={logo} onBack={onVoltar} subtitulo="Identificação" />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tempo estimado</span>
            <span className="font-semibold">~{tempoMin} min</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Taxa de entrega</span>
            <span className="font-semibold">{taxa > 0 ? formatBRL(taxa) : "Grátis"}</span>
          </div>
          {minimo > 0 && (
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pedido mínimo</span>
              <span className="font-semibold">{formatBRL(minimo)}</span>
            </div>
          )}
        </div>

        <form onSubmit={handle} className="space-y-4 rounded-2xl border bg-card p-5">
          <div>
            <Label htmlFor="tel">Telefone</Label>
            <Input
              id="tel"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={telefoneFmt}
              onChange={(e) => setTelefoneFmt(formatTelefoneBR(e.target.value))}
              placeholder="(11) 99999-9999"
              required
            />
          </div>
          <div>
            <Label htmlFor="nome">Seu nome</Label>
            <Input
              id="nome"
              value={state.nome}
              onChange={(e) => setState((p) => ({ ...p, nome: e.target.value }))}
              placeholder="Como podemos te chamar?"
              required
              maxLength={80}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-2xl"
            disabled={enviando}
          >
            {enviando ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Continuar
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Seus dados ficam salvos só neste aparelho. Slug: <code>{slug}</code>
          </p>
        </form>
      </main>
    </>
  );
}

/* ============================================================
 * Step 2 — Cardápio + carrinho
 * ============================================================ */

function StepCardapio({
  slug,
  restauranteNome,
  logo,
  identificado,
  minimo,
  categorias,
  produtos,
  aberto,
  mensagemFechado,
  onContinuar,
}: {
  slug: string;
  restauranteNome: string;
  logo: string | null;
  identificado: boolean;
  minimo: number;
  categorias: { id: string; nome: string; ordem: number }[];
  produtos: ProdutoPublico[];
  aberto: boolean;
  mensagemFechado: string | null;
  onContinuar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [catAtiva, setCatAtiva] = useState<string | "todas">("todas");
  const [selecionado, setSelecionado] = useState<ProdutoPublico | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    setCart(getDeliveryCart(slug));
    const h = () => setCart(getDeliveryCart(slug));
    window.addEventListener("delivery-cart-change", h);
    return () => window.removeEventListener("delivery-cart-change", h);
  }, [slug]);

  const filtrados = useMemo(
    () =>
      produtos.filter((p) => {
        if (catAtiva !== "todas" && p.categoria_id !== catAtiva) return false;
        if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
        return true;
      }),
    [produtos, busca, catAtiva],
  );

  const porCategoria = useMemo(() => {
    const map = new Map<string, ProdutoPublico[]>();
    for (const p of filtrados) {
      const cid = p.categoria_id ?? "sem";
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid)!.push(p);
    }
    return map;
  }, [filtrados]);

  const subtotal = cartTotal(cart);
  const count = cartCount(cart);
  const falta = Math.max(0, minimo - subtotal);
  const podeContinuar = count > 0 && falta === 0 && aberto;

  return (
    <>
      <DeliveryHeader
        nome={restauranteNome}
        logoUrl={logo}
        subtitulo="Cardápio"
      />
      {!aberto && <ClosedBanner mensagem={mensagemFechado} />}
      <div className="sticky top-[57px] z-20 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl space-y-2">
          <Input
            placeholder="Buscar no cardápio…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {categorias.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setCatAtiva("todas")}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                  catAtiva === "todas"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card"
                }`}
              >
                Todas
              </button>
              {categorias.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCatAtiva(c.id)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                    catAtiva === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card"
                  }`}
                >
                  {c.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-4">
        <ProdutosListaCategorizada
          produtosFiltrados={filtrados}
          porCategoria={porCategoria}
          categorias={categorias}
          onSelect={setSelecionado}
        />
      </main>

      <ProdutoDialog
        produto={aberto ? selecionado : null}
        onClose={() => setSelecionado(null)}
        onAdd={(item) => {
          if (!aberto) {
            toast.error("Estamos fechados no momento.");
            return;
          }
          setSelecionado(null);
          addToDeliveryCart(slug, item);
          requestAnimationFrame(() => toast.success("Adicionado ao carrinho"));
        }}
      />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-2xl space-y-2 px-4 py-3">
          {minimo > 0 && falta > 0 && count > 0 && (
            <div className="rounded-xl bg-accent/15 px-3 py-2 text-center text-xs font-medium text-accent-foreground">
              Faltam <strong>{formatBRL(falta)}</strong> para o pedido mínimo
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div className="text-muted-foreground">
                {count} {count === 1 ? "item" : "itens"}
              </div>
              <div className="text-lg font-bold text-primary">{formatBRL(subtotal)}</div>
            </div>
            <Button
              className="h-12 rounded-2xl px-6"
              disabled={!podeContinuar}
              onClick={onContinuar}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              {identificado ? "Revisar" : "Continuar"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================================================
 * Step 3 — Revisão e pagamento
 * ============================================================ */

interface RevisaoPayload {
  cliente: { nome: string; telefone: string };
  modo: "delivery" | "retirada";
  endereco?: EnderecoCliente;
  itens: { produto_id: string; quantidade: number; observacao?: string }[];
  observacao?: string;
  cupomCodigo?: string;
  pagamento:
    | { tipo: "pix" }
    | { tipo: "dinheiro"; troco_para?: number | null }
    | { tipo: "cartao_entrega" };
}

function StepRevisao({
  slug,
  restauranteNome,
  logo,
  state,
  setState,
  taxa,
  minimo,
  previsao,
  retiradaAtiva,
  aceitaPix,
  aceitaDinheiro,
  aceitaCartao,
  aberto,
  mensagemFechado,
  onVoltar,
  onTrocarIdentificacao,
  enviar,
}: {
  slug: string;
  restauranteNome: string;
  logo: string | null;
  state: DeliveryState;
  setState: (s: DeliveryState | ((p: DeliveryState) => DeliveryState)) => void;
  taxa: number;
  minimo: number;
  previsao: number;
  retiradaAtiva: boolean;
  aceitaPix: boolean;
  aceitaDinheiro: boolean;
  aceitaCartao: boolean;
  aberto: boolean;
  mensagemFechado: string | null;
  onVoltar: () => void;
  onTrocarIdentificacao: () => void;
  enviar: (p: RevisaoPayload) => Promise<void>;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [obs, setObs] = useState("");
  const [cupom, setCupom] = useState("");
  const [troco, setTroco] = useState("");
  const [enviando, setEnviando] = useState(false);

  const metodosDisp = useMemo(() => {
    const lista: Array<"pix" | "dinheiro" | "cartao_entrega"> = [];
    if (aceitaPix) lista.push("pix");
    if (aceitaDinheiro) lista.push("dinheiro");
    if (aceitaCartao) lista.push("cartao_entrega");
    return lista;
  }, [aceitaPix, aceitaDinheiro, aceitaCartao]);

  const [metodo, setMetodo] = useState<"pix" | "dinheiro" | "cartao_entrega">(
    metodosDisp[0] ?? "pix",
  );

  useEffect(() => {
    setCart(getDeliveryCart(slug));
    const h = () => setCart(getDeliveryCart(slug));
    window.addEventListener("delivery-cart-change", h);
    return () => window.removeEventListener("delivery-cart-change", h);
  }, [slug]);

  const atualizar = (next: CartItem[]) => {
    setCart(next);
    setDeliveryCart(slug, next);
  };
  const setQtd = (idx: number, q: number) => {
    if (q < 1) return atualizar(cart.filter((_, i) => i !== idx));
    atualizar(cart.map((it, i) => (i === idx ? { ...it, quantidade: q } : it)));
  };
  const setNome = (idx: number, nome: string) =>
    atualizar(cart.map((it, i) => (i === idx ? { ...it, cliente_nome: nome || undefined } : it)));
  const setObsItem = (idx: number, o: string) =>
    atualizar(cart.map((it, i) => (i === idx ? { ...it, observacao: o || undefined } : it)));

  const subtotal = cartTotal(cart);
  const taxaAplicada = state.modo === "delivery" ? taxa : 0;
  const total = subtotal + taxaAplicada;
  const falta = Math.max(0, minimo - subtotal);
  const enderecoOk =
    state.modo !== "delivery" ||
    (!!state.endereco &&
      state.endereco.rua.trim() &&
      state.endereco.numero.trim() &&
      state.endereco.bairro.trim() &&
      state.endereco.cidade.trim() &&
      state.endereco.uf.trim().length === 2);
  const podeEnviar =
    cart.length > 0 && falta === 0 && enderecoOk && metodosDisp.length > 0 && !enviando && aberto;

  const handleEnviar = async () => {
    if (!podeEnviar) return;
    setEnviando(true);
    const payload: RevisaoPayload = {
      cliente: { nome: state.nome.trim(), telefone: state.telefone },
      modo: state.modo,
      endereco: state.modo === "delivery" ? state.endereco ?? undefined : undefined,
      itens: cart.map((it) => ({
        produto_id: it.produto_id,
        quantidade: it.quantidade,
        observacao: it.observacao,
      })),
      observacao: obs.trim() || undefined,
      cupomCodigo: cupom.trim() || undefined,
      pagamento:
        metodo === "pix"
          ? { tipo: "pix" }
          : metodo === "dinheiro"
            ? {
                tipo: "dinheiro",
                troco_para: troco ? Number(troco.replace(",", ".")) : null,
              }
            : { tipo: "cartao_entrega" },
    };
    try {
      await enviar(payload);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <DeliveryHeader
        nome={restauranteNome}
        logoUrl={logo}
        onBack={onVoltar}
        subtitulo="Revisar pedido"
      />
      {!aberto && <ClosedBanner mensagem={mensagemFechado} />}
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        {cart.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            Seu carrinho está vazio.
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Itens
              </h2>
              {cart.map((it, idx) => (
                <CarrinhoItemRow
                  key={idx}
                  item={it}
                  idx={idx}
                  onSetQtd={setQtd}
                  onSetNome={setNome}
                  onSetObs={setObsItem}
                />
              ))}
            </section>

            {state.modo === "delivery" && (
              <section className="space-y-3 rounded-2xl border bg-card p-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4 text-primary" />
                  Endereço de entrega
                </h2>
                {state.enderecosSalvos.length > 0 && (
                  <Select
                    onValueChange={(v) => {
                      const i = Number(v);
                      if (!Number.isNaN(i) && state.enderecosSalvos[i]) {
                        setState((p) => ({ ...p, endereco: state.enderecosSalvos[i] }));
                      } else if (v === "novo") {
                        setState((p) => ({ ...p, endereco: { ...EMPTY_ENDERECO } }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar endereço salvo" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.enderecosSalvos.map((e, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {resumoEndereco(e)}
                        </SelectItem>
                      ))}
                      <SelectItem value="novo">+ Novo endereço</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <EnderecoForm
                  value={state.endereco ?? EMPTY_ENDERECO}
                  onChange={(e) => setState((p) => ({ ...p, endereco: e }))}
                />
              </section>
            )}

            <section className="space-y-3 rounded-2xl border bg-card p-4">
              <h2 className="text-sm font-semibold">Pagamento</h2>
              {metodosDisp.length === 0 ? (
                <p className="text-sm text-destructive">
                  Restaurante sem método de pagamento configurado.
                </p>
              ) : (
                <RadioGroup
                  value={metodo}
                  onValueChange={(v) =>
                    setMetodo(v as "pix" | "dinheiro" | "cartao_entrega")
                  }
                  className="space-y-2"
                >
                  {metodosDisp.includes("pix") && (
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3">
                      <RadioGroupItem value="pix" />
                      <span className="text-sm font-medium">PIX</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Após confirmar, exibimos o QR
                      </span>
                    </label>
                  )}
                  {metodosDisp.includes("dinheiro") && (
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3">
                      <RadioGroupItem value="dinheiro" />
                      <span className="text-sm font-medium">Dinheiro na entrega</span>
                    </label>
                  )}
                  {metodosDisp.includes("cartao_entrega") && (
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3">
                      <RadioGroupItem value="cartao_entrega" />
                      <span className="text-sm font-medium">Cartão na entrega</span>
                    </label>
                  )}
                </RadioGroup>
              )}
              {metodo === "dinheiro" && (
                <div>
                  <Label htmlFor="troco">Precisa de troco para (opcional)</Label>
                  <Input
                    id="troco"
                    inputMode="decimal"
                    value={troco}
                    onChange={(e) => setTroco(e.target.value)}
                    placeholder="Ex.: 100,00"
                  />
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border bg-card p-4">
              <div>
                <Label htmlFor="cup">Cupom (opcional)</Label>
                <Input
                  id="cup"
                  value={cupom}
                  onChange={(e) => setCupom(e.target.value.toUpperCase())}
                  placeholder="DIGITE O CÓDIGO"
                  maxLength={40}
                />
              </div>
              <div>
                <Label htmlFor="obspedido">Observação do pedido (opcional)</Label>
                <Textarea
                  id="obspedido"
                  rows={2}
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  maxLength={300}
                />
              </div>
            </section>

            <section className="space-y-1 rounded-2xl border bg-card p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {state.modo === "delivery" ? "Taxa de entrega" : "Retirada"}
                </span>
                <span>{taxaAplicada > 0 ? formatBRL(taxaAplicada) : "Grátis"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-base">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold text-primary">{formatBRL(total)}</span>
              </div>
              <p className="pt-2 text-center text-xs text-muted-foreground">
                Tempo estimado: ~{previsao} min
              </p>
            </section>

            {falta > 0 && (
              <p className="text-center text-xs text-destructive">
                Faltam {formatBRL(falta)} para o pedido mínimo.
              </p>
            )}
          </>
        )}
      </main>

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <Button
              size="lg"
              className="h-12 w-full rounded-2xl"
              disabled={!podeEnviar}
              onClick={handleEnviar}
            >
              {enviando ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Enviar pedido · {formatBRL(total)}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}