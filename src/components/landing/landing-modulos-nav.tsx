import { UtensilsCrossed, Bike, ChefHat, Package, LineChart } from "lucide-react";

const MODULOS = [
  { href: "#salao", icon: UtensilsCrossed, label: "Salão & Mesas" },
  { href: "#delivery", icon: Bike, label: "Delivery Próprio" },
  { href: "#kds", icon: ChefHat, label: "KDS & Produção" },
  { href: "#estoque", icon: Package, label: "Estoque & Fichas Técnicas" },
  { href: "#financeiro", icon: LineChart, label: "Financeiro & DRE" },
];

export function LandingModulosNav() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-8">
      <nav className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {MODULOS.map((m) => (
          <a
            key={m.href}
            href={m.href}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm font-semibold shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-elegant)]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <m.icon className="h-4 w-4" />
            </div>
            {m.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
