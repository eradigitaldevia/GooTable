import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Ticket } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useCupons, useExcluirCupom } from "@/hooks/use-cupons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CupomDialog } from "@/components/admin/cupom-dialog";
import type { Cupom } from "@/lib/cupons.functions";
import { formatBRL } from "@/lib/cart";
import { TableSkeleton } from "@/components/admin/skeletons/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/_authenticated/admin/cupons")({
  component: CuponsAdmin,
});

function formatValor(c: Cupom): string {
  return c.tipo === "percentual" ? `${c.valor}%` : formatBRL(c.valor);
}
function formatData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function CuponsAdmin() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const { data: cupons, isLoading } = useCupons(restaurante?.id);
  const excluir = useExcluirCupom(restaurante?.id);

  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Cupom | null>(null);

  const novo = () => {
    setEditando(null);
    setOpen(true);
  };
  const editar = (c: Cupom) => {
    setEditando(c);
    setOpen(true);
  };
  const remover = (c: Cupom) => {
    if (!confirm(`Excluir cupom ${c.codigo}?`)) return;
    excluir.mutate(c.id, {
      onSuccess: () => toast.success("Cupom excluído"),
      onError: (err: unknown) => toast.error((err as Error)?.message ?? "Falha"),
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cupons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie códigos promocionais para descontar no fechamento da comanda.
          </p>
        </div>
        <Button onClick={novo} disabled={!restaurante}>
          <Plus className="h-4 w-4" /> Novo cupom
        </Button>
      </header>

      {isLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : !cupons?.length ? (
        <EmptyState icon={Ticket} description="Nenhum cupom criado ainda." />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Desconto</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Uso</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cupons.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3 font-mono font-semibold">{c.codigo}</td>
                  <td className="px-4 py-3">{formatValor(c)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatData(c.validade_inicio)} → {formatData(c.validade_fim)}
                  </td>
                  <td className="px-4 py-3">
                    {c.uso_atual}
                    {c.uso_max != null ? ` / ${c.uso_max}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {c.ativo ? (
                      <Badge variant="default">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => editar(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remover(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CupomDialog
        open={open}
        onOpenChange={setOpen}
        restauranteId={restaurante?.id}
        cupom={editando}
      />
    </div>
  );
}
