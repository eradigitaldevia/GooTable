import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useAplicarInventario, useInsumos } from "@/hooks/use-estoque";
import { formatQtd, parseNum } from "./estoque-format";

export function AbaInventario({ restauranteId }: { restauranteId: string }) {
  const { data: insumos = [], isLoading } = useInsumos(restauranteId);
  const aplicar = useAplicarInventario();
  const [contagens, setContagens] = useState<Record<string, string>>({});
  const [obs, setObs] = useState("");
  const [confirmar, setConfirmar] = useState(false);

  const ativos = insumos.filter((i) => i.ativo);
  const itens = ativos
    .filter((i) => (contagens[i.id] ?? "").trim() !== "")
    .map((i) => ({ insumo: i, contagem: parseNum(contagens[i.id]) }));
  const invalidos = itens.some((x) => x.contagem === null || x.contagem < 0);
  const diferencas = itens.filter((x) => x.contagem !== null && x.contagem !== x.insumo.saldo).length;

  const executar = () => {
    aplicar.mutate(
      {
        restauranteId,
        itens: itens.map((x) => ({ insumo_id: x.insumo.id, contagem: x.contagem as number })),
        observacao: obs.trim() || null,
      },
      {
        onSuccess: (r) => {
          toast.success(r.ajustes > 0 ? `${r.ajustes} ajuste(s) aplicado(s)` : "Estoque já estava correto");
          setContagens({});
          setObs("");
        },
        onError: (e) => toast.error(e.message),
        onSettled: () => setConfirmar(false),
      },
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Informe a quantidade contada fisicamente. Deixe em branco os itens não contados. O sistema gera os ajustes das diferenças.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Insumo</th>
              <th className="p-3 text-right">Saldo no sistema</th>
              <th className="p-3 text-right">Contagem</th>
              <th className="p-3 text-right">Diferença</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td className="p-3 text-muted-foreground" colSpan={4}>Carregando…</td></tr>}
            {ativos.map((i) => {
              const c = parseNum(contagens[i.id] ?? "");
              const dif = c === null ? null : c - i.saldo;
              return (
                <tr key={i.id}>
                  <td className="p-3 font-medium">{i.nome}</td>
                  <td className="p-3 text-right">{formatQtd(i.saldo, i.unidade)}</td>
                  <td className="p-3 text-right">
                    <Input
                      className="ml-auto w-28 text-right"
                      inputMode="decimal"
                      value={contagens[i.id] ?? ""}
                      onChange={(e) => setContagens({ ...contagens, [i.id]: e.target.value })}
                      aria-label={`Contagem de ${i.nome}`}
                    />
                  </td>
                  <td className={`p-3 text-right ${dif && dif < 0 ? "text-destructive" : dif ? "text-primary" : "text-muted-foreground"}`}>
                    {dif === null ? "—" : `${dif > 0 ? "+" : ""}${formatQtd(dif, i.unidade)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-sm" placeholder="Observação (ex.: inventário mensal)" maxLength={300} value={obs} onChange={(e) => setObs(e.target.value)} />
        <Button className="ml-auto" disabled={itens.length === 0 || invalidos || aplicar.isPending} onClick={() => setConfirmar(true)}>
          Aplicar inventário
        </Button>
      </div>
      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar inventário?</AlertDialogTitle>
            <AlertDialogDescription>
              {diferencas} insumo(s) com diferença terão o saldo ajustado para a quantidade contada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executar}>Aplicar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
