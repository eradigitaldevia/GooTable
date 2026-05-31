import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { HeaderClienteSkeleton } from "@/components/cliente/skeletons/header-cliente-skeleton";
import { ProdutosListaSkeleton } from "@/components/cliente/skeletons/produtos-lista-skeleton";
import { addToCart, cartCount, getCart } from "@/lib/cart";
import { toast } from "sonner";
import { ClienteHeader } from "@/components/cliente/cliente-header";
import { CarrinhoFlutuante } from "@/components/cliente/carrinho-flutuante";
import { ProdutoDialog } from "@/components/cliente/produto-dialog";
import { ProdutosListaCategorizada } from "@/components/cliente/produtos-lista-categorizada";
import { ChamarGarcomFab } from "@/components/cliente/chamar-garcom-fab";
import { useCardapioPublico } from "@/hooks/use-cardapio-publico";
import type { ProdutoPublico } from "@/lib/cardapio-publico.functions";
import { useClienteMesa } from "@/hooks/use-cliente-mesa";
import {
  IdentificacaoModal,
  type IdentificacaoValores,
} from "@/components/cliente/identificacao-modal";
import { LookupTelefoneStep } from "@/components/cliente/lookup-telefone-step";
import {
  EscolherComandaModal,
  type ComandaResumo,
  type EscolhaComanda,
} from "@/components/cliente/escolher-comanda-modal";
import { entrarNaMesaFn, identificarClienteFn } from "@/lib/clientes.functions";
import { buscarClientePorTelefoneFn } from "@/lib/cliente-mesa.functions";

export const Route = createFileRoute("/m/$qrToken")({
  component: ClienteMenu,
});

interface PendenteEscolha {
  clienteId: string;
  nome: string;
  telefone: string;
  sessaoId: string;
  comandas: ComandaResumo[];
}

function ClienteMenu() {
  const { qrToken } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useCardapioPublico(qrToken);
  const { identidade, hidratado, precisaRehidratarSessao, salvar, limpar } =
    useClienteMesa(qrToken);
  const identificar = useServerFn(identificarClienteFn);
  const entrarNaMesa = useServerFn(entrarNaMesaFn);
  const buscarPorTelefone = useServerFn(buscarClientePorTelefoneFn);
  const [enviando, setEnviando] = useState(false);
  const [pendente, setPendente] = useState<PendenteEscolha | null>(null);
  const [busca, setBusca] = useState("");
  const [catAtiva, setCatAtiva] = useState<string | "todas">("todas");
  const [selecionado, setSelecionado] = useState<ProdutoPublico | null>(null);
  const [count, setCount] = useState(0);
  const [modoLookup, setModoLookup] = useState(true);
  const welcomedRef = useRef(false);

  const showWelcome = (nome: string) => {
    if (welcomedRef.current) return;
    welcomedRef.current = true;
    const primeiroNome = nome.trim().split(/\s+/)[0] || nome;
    toast.success(`Bem-vindo(a) de volta, ${primeiroNome}! 👋`);
  };

  useEffect(() => {
    setCount(cartCount(getCart(qrToken)));
    const handler = () => setCount(cartCount(getCart(qrToken)));
    window.addEventListener("mesa-cart-change", handler);
    return () => window.removeEventListener("mesa-cart-change", handler);
  }, [qrToken]);

  // Reconhecimento do cliente que já estava identificado (mesmo device).
  useEffect(() => {
    if (!hidratado || !identidade) return;
    if (precisaRehidratarSessao) return;
    showWelcome(identidade.nome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidratado, identidade?.clienteId, precisaRehidratarSessao]);

  // Sessão/comanda obsoletas: reatribui automaticamente usando o telefone salvo.
  useEffect(() => {
    if (!precisaRehidratarSessao || !identidade) return;
    let cancelado = false;
    (async () => {
      try {
        const r = await buscarPorTelefone({
          data: { qrToken, telefone: identidade.telefone },
        });
        if (cancelado) return;
        if (r.encontrado) {
          salvar({
            clienteId: r.cliente.id,
            nome: r.cliente.nome,
            telefone: r.cliente.telefone,
            sessaoId: r.sessaoId,
            comandaId: r.comandaId,
          });
          showWelcome(r.cliente.nome);
        } else {
          limpar();
        }
      } catch (e) {
        if (cancelado) return;
        toast.error(
          e instanceof Error ? e.message : "Não foi possível restaurar sua sessão.",
        );
        limpar();
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precisaRehidratarSessao, identidade?.clienteId, qrToken]);

  const erro = data && "erro" in data ? data.erro : null;
  const restaurante = data && !("erro" in data) ? data.restaurante : null;
  const mesa = data && !("erro" in data) ? data.mesa : null;
  const categorias = data && !("erro" in data) ? data.categorias : [];
  const produtos = data && !("erro" in data) ? data.produtos : [];

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      if (catAtiva !== "todas" && p.categoria_id !== catAtiva) return false;
      if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [produtos, busca, catAtiva]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, ProdutoPublico[]>();
    for (const p of produtosFiltrados) {
      const cid = p.categoria_id ?? "sem";
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid)!.push(p);
    }
    return map;
  }, [produtosFiltrados]);

  const handleLookup = async (telefone: string) => {
    try {
      setEnviando(true);
      const r = await buscarPorTelefone({ data: { qrToken, telefone } });
      if (!r.encontrado) {
        toast.message("Telefone não cadastrado. Faça seu cadastro para continuar.");
        setModoLookup(false);
        return;
      }
      salvar({
        clienteId: r.cliente.id,
        nome: r.cliente.nome,
        telefone: r.cliente.telefone,
        sessaoId: r.sessaoId,
        comandaId: r.comandaId,
      });
      showWelcome(r.cliente.nome);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível continuar");
    } finally {
      setEnviando(false);
    }
  };

  const handleIdentificar = async (v: IdentificacaoValores) => {
    try {
      setEnviando(true);
      const res = await identificar({ data: { qrToken, nome: v.nome, telefone: v.telefone } });
      if (res.comandas_ativas.length > 0) {
        setPendente({
          clienteId: res.cliente.id,
          nome: res.cliente.nome,
          telefone: res.cliente.telefone,
          sessaoId: res.sessao_id,
          comandas: res.comandas_ativas,
        });
      } else {
        const entrada = await entrarNaMesa({
          data: {
            qrToken,
            clienteId: res.cliente.id,
            sessaoId: res.sessao_id,
            escolha: "auto",
          },
        });
        salvar({
          clienteId: res.cliente.id,
          nome: res.cliente.nome,
          telefone: res.cliente.telefone,
          sessaoId: res.sessao_id,
          comandaId: entrada.comanda_id,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível continuar");
    } finally {
      setEnviando(false);
    }
  };

  const handleEscolher = async (escolha: EscolhaComanda) => {
    if (!pendente) return;
    try {
      setEnviando(true);
      const entrada = await entrarNaMesa({
        data: {
          qrToken,
          clienteId: pendente.clienteId,
          sessaoId: pendente.sessaoId,
          escolha,
        },
      });
      salvar({
        clienteId: pendente.clienteId,
        nome: pendente.nome,
        telefone: pendente.telefone,
        sessaoId: pendente.sessaoId,
        comandaId: entrada.comanda_id,
      });
      setPendente(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível continuar");
    } finally {
      setEnviando(false);
    }
  };

  if (isLoading || !hidratado) {
    return (
      <div className="min-h-screen bg-background pb-28">
        <HeaderClienteSkeleton />
        <main className="mx-auto max-w-2xl px-4 py-4">
          <ProdutosListaSkeleton count={4} />
        </main>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Ops!</h1>
          <p className="mt-2 text-muted-foreground">{erro}</p>
        </div>
      </div>
    );
  }

  if (!identidade) {
    return (
      <>
        {pendente ? (
          <EscolherComandaModal
            comandasAtivas={pendente.comandas}
            onEscolher={handleEscolher}
            enviando={enviando}
          />
        ) : modoLookup ? (
          <LookupTelefoneStep
            enviando={enviando}
            onLookup={handleLookup}
            onNovoCadastro={() => setModoLookup(false)}
          />
        ) : (
          <IdentificacaoModal onSubmit={handleIdentificar} enviando={enviando} />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <ClienteHeader
        restaurante={restaurante}
        mesa={mesa}
        busca={busca}
        onBuscaChange={setBusca}
        categorias={categorias}
        catAtiva={catAtiva}
        onCatChange={setCatAtiva}
      />

      <main className="mx-auto max-w-2xl px-4 py-4">
        <ProdutosListaCategorizada
          produtosFiltrados={produtosFiltrados}
          porCategoria={porCategoria}
          categorias={categorias}
          onSelect={setSelecionado}
        />
      </main>

      <CarrinhoFlutuante
        count={count}
        onClick={() => navigate({ to: "/m/$qrToken/carrinho", params: { qrToken } })}
      />

      <ChamarGarcomFab
        qrToken={qrToken}
        comandaId={identidade.comandaId}
        sessaoId={identidade.sessaoId}
        clienteId={identidade.clienteId}
        bottomOffset={count > 0}
      />

      <ProdutoDialog
        produto={selecionado}
        onClose={() => setSelecionado(null)}
        onAdd={(item) => {
          setSelecionado(null);
          addToCart(qrToken, {
            ...item,
            cliente_id: item.cliente_id ?? identidade.clienteId,
            cliente_nome: item.cliente_nome ?? identidade.nome,
          });
          requestAnimationFrame(() => toast.success("Adicionado ao carrinho"));
        }}
      />
    </div>
  );
}
