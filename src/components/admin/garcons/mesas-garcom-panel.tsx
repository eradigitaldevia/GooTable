import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X, Plus, Circle } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import {
  useAtribuicoesMesasMulti,
  useAtribuirGarcomMesa,
  useGarcons,
  useRemoverGarcomMesa,
} from "@/hooks/use-garcons";

export function MesasGarcomPanel({ restauranteId }: { restauranteId: string }) {
  const { data: atribuicoes = [], isLoading } =
    useAtribuicoesMesasMulti(restauranteId);
  const { data: garcons = [] } = useGarcons(restauranteId, false);
  const atribuir = useAtribuirGarcomMesa(restauranteId);
  const remover = useRemoverGarcomMesa(restauranteId);
  const [adicionandoMesa, setAdicionandoMesa] = useState<string | null>(null);

  const semGarcom = useMemo(
    () => atribuicoes.filter((a) => a.garcons.length === 0).length,
    [atribuicoes],
  );

  const onAdicionar = async (mesaId: string, garcomId: string) => {
    try {
      await atribuir.mutateAsync({ mesaId, garcomId });
      toast.success("Garçom adicionado");
      setAdicionandoMesa(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar");
    }
  };

  const onRemover = async (mesaId: string, garcomId: string) => {
    try {
      await remover.mutateAsync({ mesaId, garcomId });
      toast.success("Garçom removido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4">
        <h3 className="text-base font-semibold">Atribuição de mesas</h3>
        <p className="text-xs text-muted-foreground">
          Cada mesa pode ter um ou mais garçons. Pedidos do cliente (QR) e o
          rateio de comissão consideram apenas garçons com turno aberto.
        </p>
      </div>
      {semGarcom > 0 && (
        <div className="flex items-start gap-2 border-b border-border bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {semGarcom} mesa{semGarcom > 1 ? "s" : ""} sem garçom atribuído.
            Pedidos do cliente nessa{semGarcom > 1 ? "s mesas" : " mesa"} ficarão
            sem comissão.
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 w-24">Mesa</th>
            <th className="px-4 py-3">Garçons atribuídos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading && (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                Carregando…
              </td>
            </tr>
          )}
          {!isLoading && atribuicoes.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                Nenhuma mesa cadastrada.
              </td>
            </tr>
          )}
          {atribuicoes.map((a) => {
            const atribuidosIds = new Set(a.garcons.map((g) => g.garcom_id));
            const disponiveis = garcons.filter((g) => !atribuidosIds.has(g.id));
            const adicionando = adicionandoMesa === a.mesa_id;
            return (
              <tr key={a.mesa_id}>
                <td className="px-4 py-3 font-medium align-top">
                  Mesa {a.mesa_numero}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.garcons.length === 0 && !adicionando && (
                      <span className="text-xs text-muted-foreground">
                        Nenhum garçom atribuído
                      </span>
                    )}
                    {a.garcons.map((g) => (
                      <Badge
                        key={g.id}
                        variant="secondary"
                        className="gap-1.5 pr-1"
                      >
                        <Circle
                          className={`h-2 w-2 fill-current ${
                            g.turno_aberto
                              ? "text-emerald-500"
                              : "text-muted-foreground/40"
                          }`}
                        />
                        <span>{g.garcom_nome}</span>
                        <button
                          type="button"
                          aria-label={`Remover ${g.garcom_nome}`}
                          onClick={() => onRemover(a.mesa_id, g.garcom_id)}
                          disabled={remover.isPending}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-background"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {adicionando ? (
                      <Select
                        onValueChange={(v) => onAdicionar(a.mesa_id, v)}
                        disabled={atribuir.isPending}
                      >
                        <SelectTrigger className="h-8 w-[200px]">
                          <SelectValue placeholder="Selecione um garçom" />
                        </SelectTrigger>
                        <SelectContent>
                          {disponiveis.length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                              Todos já atribuídos
                            </div>
                          ) : (
                            disponiveis.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.nome}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs"
                        onClick={() => setAdicionandoMesa(a.mesa_id)}
                        disabled={disponiveis.length === 0}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar
                      </Button>
                    )}
                    {adicionando && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setAdicionandoMesa(null)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </Card>
  );
}