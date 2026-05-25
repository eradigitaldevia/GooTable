import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { formatBRL } from "@/lib/cart";

interface Item {
  id: string;
  nome_produto: string;
  quantidade: number;
  preco_unit: number;
  observacao: string | null;
  cliente_nome: string | null;
}

export function ItensPedido({ itens, total }: { itens: Item[]; total: number }) {
  const [aba, setAba] = useState<"itens" | "dividir">("itens");

  const grupos = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of itens) {
      const k = it.cliente_nome?.trim() || "Sem nome";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return m;
  }, [itens]);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 inline-flex rounded-full bg-muted p-1">
        <button
          onClick={() => setAba("itens")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            aba === "itens" ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          Itens
        </button>
        <button
          onClick={() => setAba("dividir")}
          className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium transition ${
            aba === "dividir" ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Dividir
        </button>
      </div>

      {aba === "itens" ? (
        <ul className="space-y-2 text-sm">
          {itens.map((it) => (
            <li key={it.id} className="flex justify-between gap-2">
              <span>
                {it.quantidade}× {it.nome_produto}
                {it.cliente_nome && (
                  <span className="ml-1 text-xs text-muted-foreground">({it.cliente_nome})</span>
                )}
                {it.observacao && (
                  <span className="block text-xs text-muted-foreground">↳ {it.observacao}</span>
                )}
              </span>
              <span className="text-muted-foreground">
                {formatBRL(Number(it.preco_unit) * it.quantidade)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-3">
          {grupos.size === 1 && grupos.has("Sem nome") && (
            <p className="rounded-xl bg-warning/10 p-3 text-xs text-foreground">
              Adicione o nome em cada item para dividir a conta automaticamente.
            </p>
          )}
          {[...grupos.entries()].map(([nome, lista]) => {
            const sub = lista.reduce((s, it) => s + Number(it.preco_unit) * it.quantidade, 0);
            return (
              <div key={nome} className="rounded-xl bg-muted/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{nome}</span>
                  <span className="text-sm font-bold text-primary">{formatBRL(sub)}</span>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {lista.map((it) => (
                    <li key={it.id} className="flex justify-between">
                      <span>{it.quantidade}× {it.nome_produto}</span>
                      <span>{formatBRL(Number(it.preco_unit) * it.quantidade)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <span className="text-muted-foreground">Total</span>
        <span className="text-xl font-bold text-primary">{formatBRL(Number(total))}</span>
      </div>
    </div>
  );
}
