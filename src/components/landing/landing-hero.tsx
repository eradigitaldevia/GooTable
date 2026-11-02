import { Link } from "@tanstack/react-router";
import { QrCode, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingHeroProps {
  vendasHref?: string;
  vendasProps: Record<string, string>;
}

export function LandingHero({ vendasHref, vendasProps }: LandingHeroProps) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <QrCode className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">GooMesa</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <a href={vendasHref} {...vendasProps}>
              <Button size="sm" disabled={!vendasHref}>Fale com vendas</Button>
            </a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-32 h-[480px] opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, oklch(0.72 0.18 50 / 0.25), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" />
              A plataforma completa de operação e gestão gastronômica
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
              Do pedido na mesa ao controle financeiro:{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                a operação completa do seu restaurante
              </span>{" "}
              em um só lugar.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              O GooMesa unifica o atendimento no salão, o canal próprio de delivery, a produção na
              cozinha e no bar e a gestão de retaguarda — sem cobrar comissão sobre as suas vendas.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href={vendasHref} {...vendasProps}>
                <Button size="lg" className="h-12 px-7 text-base shadow-[var(--shadow-elegant)]" disabled={!vendasHref}>
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
        </div>
      </section>
    </>
  );
}
