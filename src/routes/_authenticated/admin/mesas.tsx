import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useMesas, useRealtimeMesas } from "@/hooks/use-mesas";
import { Button } from "@/components/ui/button";
import { Printer, QrCode as QrIcon } from "lucide-react";
import { NovaMesaDialog } from "@/components/mesas/nova-mesa-dialog";
import { MesaCard } from "@/components/mesas/mesa-card";
import { listarMesasFn } from "@/lib/mesas.functions";
import { queryKeys } from "@/lib/query-keys";
import { PageHeaderSkeleton } from "@/components/admin/skeletons/page-header-skeleton";
import { CardsGridSkeleton } from "@/components/admin/skeletons/cards-grid-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useGarcomLookup } from "@/hooks/use-garcom-lookup";

export const Route = createFileRoute("/_authenticated/admin/mesas")({
  loader: ({ context }) => {
    const { queryClient, restauranteId } = context as {
      queryClient: import("@tanstack/react-query").QueryClient;
      restauranteId?: string;
    };
    if (restauranteId) {
      queryClient.ensureQueryData({
        queryKey: queryKeys.mesas(restauranteId),
        queryFn: () => listarMesasFn({ data: { restauranteId } }),
      });
    }
  },
  component: Mesas,
});

function Mesas() {
  const { user } = useAuth();
  const { data: restaurante, isLoading: loadingRest } = useMeuRestaurante(user?.id);
  const { data: mesas = [], isLoading: loadingMesas } = useMesas(restaurante?.id);
  const [origin, setOrigin] = useState("");
  const { nomeDaMesa } = useGarcomLookup(restaurante?.id);
  useRealtimeMesas(restaurante?.id);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const loading = loadingRest || loadingMesas;

  if (loading || !restaurante) {
    return (
      <div className="space-y-8">
        <PageHeaderSkeleton withActions />
        <CardsGridSkeleton count={6} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mesas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada mesa tem um QR Code único — imprima e cole na mesa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} disabled={mesas.length === 0}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir todas
          </Button>
          <NovaMesaDialog restauranteId={restaurante.id} />
        </div>
      </header>

      {mesas.length === 0 ? (
        <EmptyState variant="dashed" icon={QrIcon} description="Cadastre sua primeira mesa." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
          {mesas.map((m) => (
            <MesaCard
              key={m.id}
              mesa={m}
              origin={origin}
              restauranteId={restaurante.id}
              garcomNome={nomeDaMesa(m.id)}
              baseUrl={(restaurante as { url_publica_cardapio?: string | null }).url_publica_cardapio ?? null}
            />
          ))}
        </div>
      )}

      <style>{`
        @media print {
          aside, header, .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
