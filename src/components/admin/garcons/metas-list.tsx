import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useAtualizarMeta,
  useCriarMeta,
  useExcluirMeta,
  useGarcomMetas,
} from "@/hooks/use-garcom-bonus";
import type { GarcomMeta } from "@/lib/garcom-bonus.functions";
import { MetaForm } from "./meta-form";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function MetasList({ restauranteId }: { restauranteId: string }) {
  const { data: metas = [], isLoading } = useGarcomMetas(restauranteId);
  const criar = useCriarMeta(restauranteId);
  const atualizar = useAtualizarMeta(restauranteId);
  const excluir = useExcluirMeta(restauranteId);
  const [novaOpen, setNovaOpen] = useState(false);
  const [editar, setEditar] = useState<GarcomMeta | null>(null);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="text-sm font-medium">Metas cadastradas</div>
        <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Nova meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova meta</DialogTitle>
            </DialogHeader>
            <MetaForm
              restauranteId={restauranteId}
              submitting={criar.isPending}
              onSubmit={async (data) => {
                try {
                  await criar.mutateAsync(data);
                  toast.success("Meta criada");
                  setNovaOpen(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao criar");
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Garçom</th>
            <th className="px-4 py-3">Meta</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Período</th>
            <th className="px-4 py-3 text-right">Alvo</th>
            <th className="px-4 py-3 text-right">Bônus</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                Carregando…
              </td>
            </tr>
          )}
          {!isLoading && metas.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                Nenhuma meta cadastrada.
              </td>
            </tr>
          )}
          {metas.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-3 font-medium">{m.garcom_nome}</td>
              <td className="px-4 py-3">{m.nome}</td>
              <td className="px-4 py-3 capitalize text-muted-foreground">{m.tipo}</td>
              <td className="px-4 py-3 capitalize text-muted-foreground">{m.periodo}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {m.tipo === "faturamento"
                  ? brl(m.alvo)
                  : m.tipo === "pedidos"
                  ? m.alvo
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {m.bonus_valor > 0 ? brl(m.bonus_valor) : ""}
                {m.bonus_valor > 0 && m.bonus_percentual > 0 ? " + " : ""}
                {m.bonus_percentual > 0 ? `${m.bonus_percentual}%` : ""}
                {m.bonus_valor === 0 && m.bonus_percentual === 0 ? "—" : ""}
              </td>
              <td className="px-4 py-3">
                {m.ativo ? (
                  <Badge variant="outline">Ativa</Badge>
                ) : (
                  <Badge variant="secondary">Inativa</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditar(m)}
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!confirm(`Excluir meta "${m.nome}"?`)) return;
                    try {
                      await excluir.mutateAsync(m.id);
                      toast.success("Meta excluída");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
                    }
                  }}
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!editar} onOpenChange={(o) => !o && setEditar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar meta</DialogTitle>
          </DialogHeader>
          {editar && (
            <MetaForm
              restauranteId={restauranteId}
              initial={editar}
              submitting={atualizar.isPending}
              onSubmit={async (data) => {
                try {
                  await atualizar.mutateAsync({ ...data, id: editar.id });
                  toast.success("Meta atualizada");
                  setEditar(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao salvar");
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}