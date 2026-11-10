import { Button } from "@/components/ui/button";

interface LandingCtaSectionProps {
  vendasHref?: string;
  vendasProps: Record<string, string>;
}

export function LandingCtaSection({ vendasHref, vendasProps }: LandingCtaSectionProps) {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pronto para ver o GooTable na prática?</h2>
        <p className="mt-4 text-muted-foreground">
          Fale com nosso time e agende uma demonstração para o seu restaurante.
        </p>
        <a href={vendasHref} {...vendasProps} className="mt-8 inline-block">
          <Button size="lg" className="h-12 px-7 text-base shadow-[var(--shadow-elegant)]" disabled={!vendasHref}>
            Fale com vendas
          </Button>
        </a>
      </div>
    </section>
  );
}
