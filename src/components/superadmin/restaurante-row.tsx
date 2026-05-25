import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface RestauranteRowData {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  criado_em: string;
  pedidosMes: number;
  faturamentoMes: number;
  mesas: number;
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function RestauranteRow({
  r,
  onSuspender,
  onExcluir,
}: {
  r: RestauranteRowData;
  onSuspender: (r: RestauranteRowData) => void;
  onExcluir: (r: RestauranteRowData) => void;
}) {
  const navigate = useNavigate();
  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3">
        <Link
          to="/superadmin/restaurantes/$id"
          params={{ id: r.id }}
          className="font-medium hover:underline"
        >
          {r.nome}
        </Link>
        <div className="text-xs text-muted-foreground">/{r.slug}</div>
      </td>
      <td className="px-4 py-3">
        {r.ativo ? <Badge variant="default">Ativo</Badge> : <Badge variant="destructive">Suspenso</Badge>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{r.mesas}</td>
      <td className="px-4 py-3 text-right tabular-nums">{r.pedidosMes}</td>
      <td className="px-4 py-3 text-right tabular-nums">{fmt(r.faturamentoMes)}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate({ to: "/superadmin/restaurantes/$id", params: { id: r.id } })}
          >
            Ver
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onSuspender(r)}>
            {r.ativo ? "Suspender" : "Reativar"}
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onExcluir(r)}>
            Excluir
          </Button>
        </div>
      </td>
    </tr>
  );
}
