import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useAtualizarGarcom,
  useCriarGarcom,
  useGarcons,
} from "@/hooks/use-garcons";
import type { Garcom } from "@/lib/garcons.functions";

function GarcomForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial?: Garcom;
  onSubmit: (data: {
    nome: string;
    telefone: string;
    percentualComissao: number;
    ativo: boolean;
  }) => void;
  submitting?: boolean;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [telefone, setTelefone] = useState(initial?.telefone ?? "");
  const [percentual, setPercentual] = useState(
    String(initial?.percentual_comissao ?? 8),
  );
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const p = Number(percentual.replace(",", "."));
        if (!nome.trim()) {
          toast.error("Informe o nome");
          return;
        }
        if (Number.isNaN(p) || p < 0 || p > 100) {
          toast.error("Percentual inválido (0 a 100)");
          return;
        }
        onSubmit({ nome, telefone, percentualComissao: p, ativo });
      }}
    >
      <div>
        <Label htmlFor="g-nome">Nome</Label>
        <Input id="g-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="g-tel">Telefone</Label>
        <Input
          id="g-tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(11) 99999-9999"
        />
      </div>
      <div>
        <Label htmlFor="g-pct">% Comissão</Label>
        <Input
          id="g-pct"
          inputMode="decimal"
          value={percentual}
          onChange={(e) => setPercentual(e.target.value)}
        />
      </div>
      {initial && (
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <div className="text-sm font-medium">Ativo</div>
            <div className="text-xs text-muted-foreground">
              Garçons inativos não podem ser atribuídos a mesas.
            </div>
          </div>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </div>
      )}
      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function GarconsRoster({ restauranteId }: { restauranteId: string }) {
  const { data: garcons = [], isLoading } = useGarcons(restauranteId, true);
  const criar = useCriarGarcom(restauranteId);
  const atualizar = useAtualizarGarcom(restauranteId);
  const [openNovo, setOpenNovo] = useState(false);
  const [edit, setEdit] = useState<Garcom | null>(null);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h3 className="text-base font-semibold">Garçons cadastrados</h3>
          <p className="text-xs text-muted-foreground">
            Defina nome, contato e percentual de comissão por garçom.
          </p>
        </div>
        <Dialog open={openNovo} onOpenChange={setOpenNovo}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Novo garçom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo garçom</DialogTitle>
            </DialogHeader>
            <GarcomForm
              submitting={criar.isPending}
              onSubmit={async (d) => {
                try {
                  await criar.mutateAsync({
                    nome: d.nome,
                    telefone: d.telefone,
                    percentualComissao: d.percentualComissao,
                  });
                  toast.success("Garçom adicionado");
                  setOpenNovo(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao salvar");
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">Telefone</th>
            <th className="px-4 py-3">%</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                Carregando…
              </td>
            </tr>
          )}
          {!isLoading && garcons.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                Nenhum garçom cadastrado.
              </td>
            </tr>
          )}
          {garcons.map((g) => (
            <tr key={g.id}>
              <td className="px-4 py-3 font-medium">{g.nome}</td>
              <td className="px-4 py-3 text-muted-foreground">{g.telefone ?? "—"}</td>
              <td className="px-4 py-3 tabular-nums">{Number(g.percentual_comissao).toFixed(2)}%</td>
              <td className="px-4 py-3">
                {g.ativo ? (
                  <Badge variant="secondary">Ativo</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inativo
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Button size="sm" variant="ghost" onClick={() => setEdit(g)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar garçom</DialogTitle>
          </DialogHeader>
          {edit && (
            <GarcomForm
              initial={edit}
              submitting={atualizar.isPending}
              onSubmit={async (d) => {
                try {
                  await atualizar.mutateAsync({
                    id: edit.id,
                    nome: d.nome,
                    telefone: d.telefone,
                    percentualComissao: d.percentualComissao,
                    ativo: d.ativo,
                  });
                  toast.success("Garçom atualizado");
                  setEdit(null);
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