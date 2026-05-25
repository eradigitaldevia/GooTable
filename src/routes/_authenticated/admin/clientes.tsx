import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Users, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useListarClientes } from "@/hooks/use-admin-clientes";
import { useRealtimeClientes } from "@/hooks/use-realtime";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  component: ClientesAdmin,
});

const PAGE_SIZE = 20;

function fmtMoeda(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("pt-BR");
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

function ClientesAdmin() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(0);
  const { data, isLoading } = useListarClientes({
    restauranteId: restaurante?.id,
    busca,
    page,
    pageSize: PAGE_SIZE,
  });
  useRealtimeClientes(restaurante?.id);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Base de clientes identificados pelo QR.
          </p>
        </div>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => {
            setPage(0);
            setBusca(e.target.value);
          }}
          placeholder="Buscar por nome ou telefone"
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3 text-right">Total gasto</th>
                <th className="px-4 py-3 text-right">Cashback</th>
                <th className="px-4 py-3 text-right">Ticket médio</th>
                <th className="px-4 py-3 text-right">Pedidos</th>
                <th className="px-4 py-3">Última visita</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              ) : (data?.clientes.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
                      <Users className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Nenhum cliente encontrado.
                    </p>
                  </td>
                </tr>
              ) : (
                data!.clientes.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        to="/admin/clientes/$id"
                        params={{ id: c.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {fmtTelefone(c.telefone)}
                    </td>
                    <td className="px-4 py-3 text-right">{fmtMoeda(c.total_gasto)}</td>
                    <td className="px-4 py-3 text-right">{fmtMoeda(c.cashback_saldo)}</td>
                    <td className="px-4 py-3 text-right">{fmtMoeda(c.ticket_medio)}</td>
                    <td className="px-4 py-3 text-right">{c.pedidos_count}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {fmtData(c.ultima_visita)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Página {page + 1} de {totalPages} · {total} clientes
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
