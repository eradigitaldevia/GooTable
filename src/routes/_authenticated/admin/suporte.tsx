import { createFileRoute } from "@tanstack/react-router";
import { SuporteChat } from "@/components/suporte/suporte-chat";

export const Route = createFileRoute("/_authenticated/admin/suporte")({
  head: () => ({ meta: [{ title: "Suporte inteligente — Admin" }] }),
  component: SuportePage,
});

function SuportePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Suporte inteligente</h1>
        <p className="text-sm text-muted-foreground">
          Pergunte como usar qualquer recurso do GooTable.
        </p>
      </div>
      <SuporteChat />
    </div>
  );
}
