import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLogs } from "@/hooks/use-dashboard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/superadmin/logs")({
  component: LogsPage,
});

function LogsPage() {
  const { data: logs = [] } = useLogs();
  const [busca, setBusca] = useState("");

  const filtrados = logs.filter((l) =>
    busca ? `${l.acao} ${l.entidade} ${l.metadata_json ?? ""}`.toLowerCase().includes(busca.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Logs de auditoria</h1>
        <p className="text-sm text-muted-foreground">Últimas 200 ações administrativas</p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhum log.
                  </td>
                </tr>
              )}
              {filtrados.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {new Date(l.criado_em).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{l.acao}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {l.entidade}
                    <div className="text-muted-foreground">{l.entidade_id?.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {l.metadata_json ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
