import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { QrCode, ChefHat, Zap, Smartphone, BarChart3, Wallet } from "lucide-react";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { usePlataformaConfig } from "@/hooks/use-plataforma-config";
import { montarLinkVendas } from "@/lib/vendas-link";

const CookieBanner = lazy(() =>
  import("@/components/legal/cookie-banner").then((m) => ({ default: m.CookieBanner })),
);
const CookiePreferenciasDialog = lazy(() =>
  import("@/components/legal/cookie-preferencias-dialog").then((m) => ({
    default: m.CookiePreferenciasDialog,
  })),
);

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const cookies = useCookieConsent("landing");
  const { data: config } = usePlataformaConfig();
  const vendas = montarLinkVendas(config?.vendas_whatsapp, config?.vendas_mensagem);
  const vendasProps = vendas.isWhatsapp ? { target: "_blank", rel: "noreferrer" } : {};

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <QrCode className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Mesa</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <a href="mailto:comercial@mesasistema.com.br">
              <Button size="sm">Fale com vendas</Button>
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-32 h-[480px] opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, oklch(0.72 0.18 50 / 0.25), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Pedido sem fila, sem app, sem espera
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
              Seu cardápio na mesa,{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                em um QR Code
              </span>
              .
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              O cliente escaneia, escolhe e pede pelo celular. O pedido cai em tempo real no
              painel da cozinha. Você só precisa servir.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="mailto:comercial@mesasistema.com.br">
                <Button size="lg" className="h-12 px-7 text-base shadow-[var(--shadow-elegant)]">
                  Fale com vendas
                </Button>
              </a>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-12 px-7 text-base">
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: QrCode, title: "QR Code por mesa", desc: "Token único e seguro impresso para cada mesa." },
              { icon: Smartphone, title: "Mobile-first", desc: "Cardápio bonito e rápido — funciona em qualquer celular." },
              { icon: ChefHat, title: "Painel realtime", desc: "Pedidos aparecem na cozinha instantaneamente." },
              { icon: BarChart3, title: "Dashboard", desc: "Faturamento, mesas ocupadas e pedidos do dia." },
              { icon: Wallet, title: "PIX opcional", desc: "Habilite pagamento via PIX direto no carrinho." },
              { icon: Zap, title: "Dividir conta", desc: "Cada cliente diz o nome dele em cada item." },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} Mesa. Feito para restaurantes que querem servir mais rápido.
          </span>
          <nav className="flex flex-wrap gap-4">
            <Link to="/termos" className="hover:text-foreground">
              Termos de Uso
            </Link>
            <Link to="/privacidade" className="hover:text-foreground">
              Política de Privacidade
            </Link>
            <Link to="/direitos" className="hover:text-foreground">
              Direitos do titular
            </Link>
            <button
              type="button"
              onClick={cookies.abrirPreferencias}
              className="text-left hover:text-foreground"
            >
              Preferências de cookies
            </button>
          </nav>
        </div>
      </footer>

      <ClientOnly>
        <Suspense fallback={null}>
          {cookies.mostrarBanner && (
            <CookieBanner
              onAceitarTodos={cookies.aceitarTodos}
              onRejeitar={cookies.rejeitarNaoEssenciais}
              onPersonalizar={cookies.abrirPreferencias}
            />
          )}
          <CookiePreferenciasDialog
            open={cookies.dialogAberto}
            onOpenChange={(o) => (o ? cookies.abrirPreferencias() : cookies.fecharPreferencias())}
            preferencias={cookies.preferencias}
            onSalvar={cookies.salvarPreferencias}
          />
        </Suspense>
      </ClientOnly>
    </div>

  );
}
