import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface RestauranteRowData {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  contrato_vencimento_em?: string | null;
  contrato_notas?: string | null;
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
  onEditarContrato,
}: {
  r: RestauranteRowData;
  onSuspender: (r: RestauranteRowData) => void;
  onExcluir: (r: RestauranteRowData) => void;
  onEditarContrato: (r: RestauranteRowData) => void;
}) {
  const navigate = useNavigate();
  const vencimento = r.contrato_vencimento_em;
  const isVencido = vencimento ? new Date(vencimento) < new Date(new Date().toDateString()) : false;
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
        {vencimento && (
          <div className={`mt-1 text-xs ${isVencido ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            Vencimento: {new Date(vencimento).toLocaleDateString("pt-BR")}
            {isVencido && " (vencido)"}
          </div>
        )}
        {r.contrato_notas && <div className="text-xs text-muted-foreground">{r.contrato_notas}</div>}
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
          <Button size="sm" variant="ghost" onClick={() => onEditarContrato(r)}>
            Contrato
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
