import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import {
  useDeliveryBairros,
  useExcluirDeliveryBairro,
  useSalvarConfigBairros,
} from "@/hooks/use-delivery-bairros";
import type { DeliveryBairro } from "@/lib/delivery-bairros.functions";
import type { BairroForaLista } from "@/lib/taxa-bairro";
import { BairroDialog } from "./delivery-bairro-dialog";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const erro = (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao salvar");

export function DeliveryBairrosCard({ restauranteId }: { restauranteId: string }) {
  const { data, isLoading } = useDeliveryBairros(restauranteId);
  const salvarCfg = useSalvarConfigBairros(restauranteId);
  const excluir = useExcluirDeliveryBairro(restauranteId);
  const [editando, setEditando] = useState<DeliveryBairro | "novo" | null>(null);
  const [removendo, setRemovendo] = useState<DeliveryBairro | null>(null);

  if (isLoading || !data) return null;

  const salvar = (patch: { porBairro?: boolean; foraLista?: BairroForaLista }) =>
    salvarCfg.mutate(
      { porBairro: data.porBairro, foraLista: data.foraLista, ...patch },
      { onSuccess: () => toast.success("Configuração salva"), onError: erro },
    );

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Taxa por bairro</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A taxa de entrega é cobrada conforme o bairro do cliente. As alterações desta seção
            são salvas na hora.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Bairro fora da lista</Label>
        <RadioGroup
          value={data.foraLista}
          onValueChange={(v) => salvar({ foraLista: v as BairroForaLista })}
          className="gap-2"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="bloquear" /> Bloquear pedido ("Não entregamos neste bairro")
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="taxa_padrao" /> Cobrar a taxa padrão
          </label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Bairros atendidos ({data.bairros.length})</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditando("novo")}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar bairro
          </Button>
        </div>
        {data.bairros.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum bairro cadastrado.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {data.bairros.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1 truncate font-medium">{b.nome}</span>
                {!b.ativo && <span className="text-xs text-muted-foreground">Inativo</span>}
                <span className="tabular-nums">{brl(b.taxa)}</span>
                <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEditando(b)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => setRemovendo(b)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editando && (
        <BairroDialog
          restauranteId={restauranteId}
          bairro={editando === "novo" ? null : editando}
          onClose={() => setEditando(null)}
        />
      )}

      <AlertDialog open={!!removendo} onOpenChange={(o) => !o && setRemovendo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bairro?</AlertDialogTitle>
            <AlertDialogDescription>
              "{removendo?.nome}" deixará de aparecer para os clientes no delivery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                removendo &&
                excluir.mutate(removendo.id, {
                  onSuccess: () => toast.success("Bairro excluído"),
                  onError: erro,
                })
              }
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
