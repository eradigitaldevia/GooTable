import { Link, useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { contratoStatus } from "@/lib/contrato-status";

export interface RestauranteRowData {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  contrato_vencimento_em?: string | null;
  contrato_notas?: string | null;
  contrato_bloqueio_automatico?: boolean | null;
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
  const contrato = contratoStatus(r.contrato_vencimento_em);
  const isVencido = contrato.estado === "vencido";

  return (
    <tr className={isVencido ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/30"}>
      <td className="px-4 py-3">
        <Link
          to="/superadmin/restaurantes/$id"
          params={{ id: r.id }}
          className="font-medium hover:underline"
        >
          {r.nome}
        </Link>
        <div className="text-xs text-muted-foreground">/{r.slug}</div>
        {contrato.estado !== "sem_data" && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge
              variant={isVencido ? "destructive" : "outline"}
              className={
                contrato.estado === "proximo"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : undefined
              }
            >
              {contrato.rotulo}
            </Badge>
            {r.contrato_bloqueio_automatico && (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                title="Suspende automaticamente ao vencer"
              >
                <Lock className="h-3 w-3" /> auto
              </span>
            )}
          </div>
        )}
        {r.contrato_notas && <div className="mt-1 text-xs text-muted-foreground">{r.contrato_notas}</div>}
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
