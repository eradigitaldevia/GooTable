import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SalaHeader } from "@/components/sala/sala-header";
import { PratosProntosList } from "@/components/sala/pratos-prontos-list";
import { MinhasMesasGrid } from "@/components/sala/minhas-mesas-grid";
import { ChamadosList } from "@/components/sala/chamados-list";
import {
  useSalaAdmin,
  useRealtimeSala,
  SALA_ADMIN_KEY,
} from "@/hooks/use-sala";

export const Route = createFileRoute(
  "/_authenticated/admin/garcons_/$garcomId/sala",
)({
  component: VisualizarSalaPage,
});

function VisualizarSalaPage() {
  const { garcomId } = Route.useParams();
  const { data, isLoading } = useSalaAdmin(garcomId);
  const [tab, setTab] = useState<"prontos" | "mesas" | "chamados">("prontos");

  const restauranteId = data?.garcom.restaurante_id;
  const mesas = data?.mesas ?? [];
  const mesaIds = useMemo(() => mesas.map((m) => m.id), [mesas]);

  useRealtimeSala(restauranteId, mesaIds, SALA_ADMIN_KEY(garcomId));

  const prontosPorMesa = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of data?.pedidos_prontos ?? []) {
      m.set(p.mesa_id, (m.get(p.mesa_id) ?? 0) + 1);
    }
    return m;
  }, [data?.pedidos_prontos]);

  const chamadosPorMesa = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of data?.chamados_pendentes ?? []) {
      m.set(c.mesa_id, (m.get(c.mesa_id) ?? 0) + 1);
    }
    return m;
  }, [data?.chamados_pendentes]);

  const totalChamados = data?.chamados_pendentes.length ?? 0;
  const totalProntos = data?.pedidos_prontos.length ?? 0;
  const nome = data?.garcom.nome ?? "";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <Eye className="h-4 w-4" />
            <span>
              Visualizando como <strong>{nome || "garçom"}</strong> — modo
              somente leitura
            </span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/garcons">
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Link>
          </Button>
        </div>
      </div>
      <SalaHeader
        nome={nome}
        mesas={mesas}
        chamadosPendentes={totalChamados}
        onIrChamados={() => setTab("chamados")}
        readOnly
      />
      <main className="mx-auto max-w-3xl px-4 py-4">
        {isLoading && !data ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Carregando…
          </p>
        ) : !data ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Garçom não encontrado ou sem acesso.
          </p>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prontos">
                Prontos{totalProntos > 0 && ` (${totalProntos})`}
              </TabsTrigger>
              <TabsTrigger value="mesas">
                Mesas{mesas.length > 0 && ` (${mesas.length})`}
              </TabsTrigger>
              <TabsTrigger value="chamados">
                Chamados{totalChamados > 0 && ` (${totalChamados})`}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="prontos" className="mt-4">
              <PratosProntosList pedidos={data.pedidos_prontos} />
            </TabsContent>
            <TabsContent value="mesas" className="mt-4">
              <MinhasMesasGrid
                mesas={mesas}
                prontosPorMesa={prontosPorMesa}
                chamadosPorMesa={chamadosPorMesa}
              />
            </TabsContent>
            <TabsContent value="chamados" className="mt-4">
              <ChamadosList chamados={data.chamados_pendentes} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}