import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useAuth } from "@/hooks/use-auth";
import { useSetUsaCumim } from "@/hooks/use-cumins";
import { CuminsRoster } from "@/components/admin/cumins/cumins-roster";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/cumim")({
  component: AdminCumimPage,
});

function AdminCumimPage() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const restauranteId = restaurante?.id;
  const setUsa = useSetUsaCumim(restauranteId);
  const [localUsa, setLocalUsa] = useState<boolean | null>(null);
  const usaCumim = localUsa ?? restaurante?.usa_cumim ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cumim (Runner)</h1>
        <p className="text-sm text-muted-foreground">
          O cumim é o profissional que leva os pratos prontos da cozinha até a
          mesa. Ative a função para cadastrar cumins e liberar o painel
          dedicado.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="usa-cumim" className="text-base">
              Usar função de runner (cumim)
            </Label>
            <p className="text-xs text-muted-foreground">
              Quando ativado, cumins cadastrados podem fazer login e usar o
              painel <code>/cumim</code> para acompanhar e confirmar entregas.
              Garçons continuam podendo confirmar entregas pela aba “Prontos”.
            </p>
          </div>
          <Switch
            id="usa-cumim"
            checked={usaCumim}
            disabled={!restauranteId || setUsa.isPending}
            onCheckedChange={(v) => {
              setLocalUsa(v);
              setUsa.mutate(v, {
                onSuccess: () =>
                  toast.success(v ? "Função ativada" : "Função desativada"),
                onError: (e) => {
                  setLocalUsa(!v);
                  toast.error(e instanceof Error ? e.message : "Erro");
                },
              });
            }}
          />
        </div>
      </Card>

      {!usaCumim ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Função desativada</AlertTitle>
          <AlertDescription>
            Ative a função acima para cadastrar e acompanhar seus cumins.
          </AlertDescription>
        </Alert>
      ) : restauranteId ? (
        <CuminsRoster restauranteId={restauranteId} />
      ) : null}
    </div>
  );
}