import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useAtribuicoesMesas,
  useAtribuirGarcomMesa,
  useGarcons,
  useLiberarGarcomMesa,
} from "@/hooks/use-garcons";

export function MesasGarcomPanel({ restauranteId }: { restauranteId: string }) {
  const { data: atribuicoes = [], isLoading } = useAtribuicoesMesas(restauranteId);
  const { data: garcons = [] } = useGarcons(restauranteId, false);
  const atribuir = useAtribuirGarcomMesa(restauranteId);
  const liberar = useLiberarGarcomMesa(restauranteId);

  const onChange = async (mesaId: string, garcomId: string) => {
    try {
      await atribuir.mutateAsync({ mesaId, garcomId });
      toast.success("Garçom atribuído");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atribuir");
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4">
        <h3 className="text-base font-semibold">Atribuição de mesas</h3>
        <p className="text-xs text-muted-foreground">
          Defina qual garçom é responsável por cada mesa.
        </p>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Mesa</th>
            <th className="px-4 py-3">Garçom responsável</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                Carregando…
              </td>
            </tr>
          )}
          {!isLoading && atribuicoes.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                Nenhuma mesa cadastrada.
              </td>
            </tr>
          )}
          {atribuicoes.map((a) => (
            <tr key={a.mesa_id}>
              <td className="px-4 py-3 font-medium">Mesa {a.mesa_numero}</td>
              <td className="px-4 py-3">
                <Select
                  value={a.garcom_id ?? ""}
                  onValueChange={(v) => onChange(a.mesa_id, v)}
                  disabled={atribuir.isPending}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="— Sem garçom —" />
                  </SelectTrigger>
                  <SelectContent>
                    {garcons.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3 text-right">
                {a.garcom_id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    disabled={liberar.isPending}
                    onClick={async () => {
                      try {
                        await liberar.mutateAsync({ mesaId: a.mesa_id });
                        toast.success("Atribuição liberada");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Erro");
                      }
                    }}
                  >
                    Liberar
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Card>
  );
}