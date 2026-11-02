import type { LucideIcon } from "lucide-react";

export interface LandingItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

interface LandingSectionProps {
  id: string;
  eyebrow: string;
  title: string;
  desc: string;
  itens: LandingItem[];
  alt?: boolean;
}

export function LandingSection({ id, eyebrow, title, desc, itens, alt }: LandingSectionProps) {
  return (
    <section id={id} className={`scroll-mt-20 py-20 ${alt ? "bg-card/40 border-y border-border/60" : ""}`}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
          <p className="mt-4 text-muted-foreground">{desc}</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {itens.map((f) => (
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
  );
}
