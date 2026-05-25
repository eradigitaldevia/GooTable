import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useDetalheCliente, useAjustarCashback } from "@/hooks/use-admin-clientes";
import { useRealtimeClientes } from "@/hooks/use-realtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/clientes/$id")({
  component: ClienteDetalhe,
});

function fmtMoeda(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDataHora(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("pt-BR");
  } catch {
    return "—";
  }
}

function fmtTelefone(t: string) {
  const d = (t || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

const TIPO_LABEL: Record<string, string> = {
  credito: "Crédito",
  resgate: "Resgate",
  ajuste: "Ajuste manual",
  expiracao: "Expiração",
};

function ClienteDetalhe() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const { data, isLoading } = useDetalheCliente({
    restauranteId: restaurante?.id,
    clienteId: id,
  });
  const ajustar = useAjustarCashback(restaurante?.id);
  useRealtimeClientes(restaurante?.id);

  const [valor, setValor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [sinal, setSinal] = useState<"+" | "-">("+");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(valor.replace(",", "."));
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    const valorFinal = sinal === "+" ? num : -num;
    ajustar.mutate(
      { clienteId: id, valor: valorFinal, observacao },
      {
        onSuccess: () => {
          toast.success("Cashback ajustado");
          setValor("");
          setObservacao("");
        },
        onError: (err: any) => toast.error(err?.message ?? "Falha ao ajustar"),
      },
    );
  };

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }
  const c = data.cliente;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/clientes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Clientes
        </Link>
      </div>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">{c.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{fmtTelefone(c.telefone)}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total gasto" value={fmtMoeda(c.total_gasto)} />
        <Stat label="Cashback" value={fmtMoeda(c.cashback_saldo)} />
        <Stat label="Ticket médio" value={fmtMoeda(c.ticket_medio)} />
        <Stat label="Pedidos" value={String(c.pedidos_count)} />
      </div>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Ajuste manual de cashback</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Crédito (+) ou débito (−) no saldo do cliente.
        </p>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr_2fr_auto] sm:items-end">
          <div className="flex gap-1">
            <Button
              type="button"
              variant={sinal === "+" ? "default" : "outline"}
              size="icon"
              onClick={() => setSinal("+")}
              aria-label="Crédito"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={sinal === "-" ? "default" : "outline"}
              size="icon"
              onClick={() => setSinal("-")}
              aria-label="Débito"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label htmlFor="obs">Observação (opcional)</Label>
            <Textarea
              id="obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={1}
              placeholder="Motivo do ajuste"
            />
          </div>
          <Button type="submit" disabled={ajustar.isPending}>
            {ajustar.isPending ? "Aplicando…" : "Aplicar"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border bg-card">
        <header className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Pedidos recentes</h2>
        </header>
        {data.pedidos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Nenhum pedido.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Cashback gerado</th>
                  <th className="px-5 py-3 text-right">Cashback resgatado</th>
                </tr>
              </thead>
              <tbody>
                {data.pedidos.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-5 py-3 text-muted-foreground">{fmtDataHora(p.criado_em)}</td>
                    <td className="px-5 py-3">{p.status}</td>
                    <td className="px-5 py-3 text-right">{fmtMoeda(p.total)}</td>
                    <td className="px-5 py-3 text-right">{fmtMoeda(p.cashback_gerado)}</td>
                    <td className="px-5 py-3 text-right">{fmtMoeda(p.cashback_resgatado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-card">
        <header className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Extrato de cashback</h2>
        </header>
        {data.movimentos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Nenhum movimento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                  <th className="px-5 py-3">Observação</th>
                </tr>
              </thead>
              <tbody>
                {data.movimentos.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-5 py-3 text-muted-foreground">{fmtDataHora(m.criado_em)}</td>
                    <td className="px-5 py-3">{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
                    <td
                      className={
                        "px-5 py-3 text-right font-medium " +
                        (m.valor >= 0 ? "text-emerald-600" : "text-destructive")
                      }
                    >
                      {m.valor >= 0 ? "+" : "−"}
                      {fmtMoeda(Math.abs(m.valor))}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{m.observacao ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
