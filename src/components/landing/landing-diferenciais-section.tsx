import { BadgePercent, ToggleRight, Database } from "lucide-react";

const DIFERENCIAIS = [
  { icon: BadgePercent, title: "Sem comissão por venda", desc: "Mensalidade previsível para o restaurante." },
  { icon: ToggleRight, title: "Módulos opcionais", desc: "Opere apenas com o cardápio ou ative estoque e financeiro quando quiser." },
  { icon: Database, title: "Controle total", desc: "A base de clientes e o histórico de vendas pertencem ao restaurante." },
];

export function LandingDiferenciaisSection() {
  return (
    <section className="border-y border-border/60 bg-card/40 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">Por que o GooMesa?</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {DIFERENCIAIS.map((d) => (
            <div key={d.title} className="rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
                <d.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{d.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
