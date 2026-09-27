import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useExcluirInsumo, useInsumos } from "@/hooks/use-estoque";
import type { Insumo } from "@/lib/estoque.functions";
import { formatBRL } from "@/lib/cart";
import { InsumoDialog } from "./insumo-dialog";
import { formatQtd } from "./estoque-format";

export function AbaInsumos({ restauranteId }: { restauranteId: string }) {
  const { data: insumos = [], isLoading } = useInsumos(restauranteId);
  const excluir = useExcluirInsumo();
  const [busca, setBusca] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; insumo: Insumo | null }>({ open: false, insumo: null });
  const [delItem, setDelItem] = useState<Insumo | null>(null);

  const lista = insumos.filter((i) => i.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  const confirmarExcluir = () => {
    if (!delItem) return;
    excluir.mutate(
      { restauranteId, id: delItem.id },
      {
        onSuccess: () => toast.success("Insumo excluído"),
        onError: (e) => toast.error(e.message),
        onSettled: () => setDelItem(null),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input className="max-w-xs" placeholder="Buscar insumo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Button onClick={() => setDialog({ open: true, insumo: null })}>
          <Plus className="mr-2 h-4 w-4" /> Novo insumo
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Insumo</th>
              <th className="p-3 text-right">Saldo</th>
              <th className="p-3 text-right">Mínimo</th>
              <th className="p-3 text-right">Custo médio</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td className="p-3 text-muted-foreground" colSpan={5}>Carregando…</td></tr>}
            {!isLoading && lista.length === 0 && (
              <tr><td className="p-3 text-muted-foreground" colSpan={5}>Nenhum insumo cadastrado.</td></tr>
            )}
            {lista.map((i) => (
              <tr key={i.id} className={i.ativo ? "" : "opacity-60"}>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{i.nome}</span>
                    {i.is_preparo && <Badge variant="secondary">Preparo</Badge>}
                    {i.bloquear_ao_zerar && <Badge variant="outline">Bloqueia</Badge>}
                    {!i.ativo && <Badge variant="outline">Inativo</Badge>}
                  </div>
                </td>
                <td className={`p-3 text-right ${i.saldo <= i.estoque_minimo ? "font-semibold text-destructive" : ""}`}>
                  {formatQtd(i.saldo, i.unidade)}
                </td>
                <td className="p-3 text-right text-muted-foreground">{formatQtd(i.estoque_minimo, i.unidade)}</td>
                <td className="p-3 text-right">{formatBRL(i.custo_medio)}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setDialog({ open: true, insumo: i })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => setDelItem(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InsumoDialog
        restauranteId={restauranteId}
        open={dialog.open}
        insumo={dialog.insumo}
        onClose={() => setDialog({ open: false, insumo: null })}
      />
      <AlertDialog open={!!delItem} onOpenChange={(o) => !o && setDelItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir insumo?</AlertDialogTitle>
            <AlertDialogDescription>
              "{delItem?.nome}" e todo o seu histórico de movimentações serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExcluir}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
