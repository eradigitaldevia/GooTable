import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  useExcluirRestaurante,
  useListarRestaurantesAdmin,
  useSetRestauranteAtivo,
} from "@/hooks/use-superadmin";
import { FiltrosRestaurantes, type FiltroStatus } from "@/components/superadmin/filtros-restaurantes";
import { RestauranteRow, type RestauranteRowData } from "@/components/superadmin/restaurante-row";
import { NovoRestauranteDialog } from "@/components/superadmin/novo-restaurante-dialog";
import { EditarContratoDialog } from "@/components/superadmin/editar-contrato-dialog";
import { contratoStatus } from "@/lib/contrato-status";

export const Route = createFileRoute("/superadmin/restaurantes")({
  component: RestaurantesList,
});

function RestaurantesList() {
  const { data, isLoading } = useListarRestaurantesAdmin();
  const setAtivo = useSetRestauranteAtivo();
  const excluir = useExcluirRestaurante();

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [novoOpen, setNovoOpen] = useState(false);
  const [contratoRestaurante, setContratoRestaurante] = useState<RestauranteRowData | null>(null);

  const rows: RestauranteRowData[] = data?.rows ?? [];

  const filtradas = useMemo(
    () =>
      rows.filter((r) => {
        if (filtro === "ativos" && !r.ativo) return false;
        if (filtro === "suspensos" && r.ativo) return false;
        if (filtro === "a_vencer") {
          const st = contratoStatus(r.contrato_vencimento_em);
          if (st.estado !== "proximo") return false;
        }
        if (filtro === "vencidos" && contratoStatus(r.contrato_vencimento_em).estado !== "vencido") return false;
        if (busca && !`${r.nome} ${r.slug}`.toLowerCase().includes(busca.toLowerCase())) return false;
        return true;
      }),
    [rows, busca, filtro]
  );

  const onSuspender = (r: RestauranteRowData) => setSuspenderAlvo(r);
  const onExcluir = (r: RestauranteRowData) => setExcluirAlvo(r);

  const confirmarSuspender = async () => {
    if (!suspenderAlvo) return;
    const r = suspenderAlvo;
    try {
      await setAtivo.mutateAsync({ id: r.id, ativo: !r.ativo });
      toast.success(r.ativo ? "Restaurante suspenso" : "Restaurante reativado");
      setSuspenderAlvo(null);
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  };

  const confirmarExcluir = async () => {
    if (!excluirAlvo) return;
    try {
      await excluir.mutateAsync({ id: excluirAlvo.id });
      toast.success("Restaurante excluído");
      setExcluirAlvo(null);
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  };

  const onEditarContrato = (r: RestauranteRowData) => {
    setContratoRestaurante(r);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Restaurantes</h1>
          <p className="text-sm text-muted-foreground">{rows.length} no total</p>
        </div>
        <Button onClick={() => setNovoOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Novo restaurante
        </Button>
      </div>

      <FiltrosRestaurantes
        busca={busca}
        filtro={filtro}
        onBuscaChange={setBusca}
        onFiltroChange={setFiltro}
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Mesas</th>
                <th className="px-4 py-3 text-right">Pedidos/mês</th>
                <th className="px-4 py-3 text-right">Faturamento/mês</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              )}
              {!isLoading && filtradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhum restaurante.
                  </td>
                </tr>
              )}
              {filtradas.map((r) => (
                <RestauranteRow
                  key={r.id}
                  r={r}
                  onSuspender={onSuspender}
                  onExcluir={onExcluir}
                  onEditarContrato={onEditarContrato}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <NovoRestauranteDialog open={novoOpen} onClose={() => setNovoOpen(false)} />
      <EditarContratoDialog
        open={!!contratoRestaurante}
        onClose={() => setContratoRestaurante(null)}
        restaurante={contratoRestaurante}
      />
    </div>
  );
}
