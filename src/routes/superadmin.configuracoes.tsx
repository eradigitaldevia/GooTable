import { createFileRoute } from "@tanstack/react-router";
import { VendasConfigCard } from "@/components/superadmin/vendas-config-card";
import { SociaisConfigCard } from "@/components/superadmin/sociais-config-card";

export const Route = createFileRoute("/superadmin/configuracoes")({
  component: ConfiguracoesPlataformaPage,
});

function ConfiguracoesPlataformaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Ajustes gerais da plataforma</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <VendasConfigCard />
        <SociaisConfigCard />
      </div>
    </div>
  );
}

