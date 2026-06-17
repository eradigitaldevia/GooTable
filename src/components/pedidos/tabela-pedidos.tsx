import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/cart";

type StatusPedido = "recebido" | "em_preparo" | "pronto" | "entregue" | "cancelado";

export interface LinhaPedido {
  id: string;
  status: StatusPedido;
  total: number;
  criado_em: string;
  mesa_id: string;
  canal?: string | null;
  cliente_nome?: string | null;
  garcom_id?: string | null;
}

const STATUS_LABEL: Record<StatusPedido, string> = {
  recebido: "Recebido",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
const STATUS_VARIANT: Record<StatusPedido, "default" | "secondary" | "outline" | "destructive"> = {
  recebido: "secondary",
  em_preparo: "default",
  pronto: "default",
  entregue: "outline",
  cancelado: "destructive",
};

function fmtDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function idade(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const dias = Math.floor(ms / (24 * 3600_000));
  if (dias >= 1) return `${dias}d`;
  const horas = Math.floor(ms / 3600_000);
  if (horas >= 1) return `${horas}h`;
  const min = Math.max(1, Math.floor(ms / 60_000));
  return `${min}min`;
}

export interface ColunaExtra {
  header: string;
  cell: (p: LinhaPedido) => React.ReactNode;
  className?: string;
}

export function TabelaPedidos<T extends LinhaPedido>({
  pedidos,
  mesas,
  onAbrir,
  selecionados,
  onToggleSelecionado,
  onToggleTodos,
  mostrarIdade = false,
  mostrarItens,
  itensCount,
  garcomLookup,
  colunasExtras,
  acoesPorLinha,
  vazio = "Nenhum pedido.",
}: {
  pedidos: T[];
  mesas: Map<string, { id: string; numero: string }>;
  onAbrir?: (p: T) => void;
  selecionados?: Set<string>;
  onToggleSelecionado?: (id: string) => void;
  onToggleTodos?: (checked: boolean) => void;
  mostrarIdade?: boolean;
  mostrarItens?: boolean;
  itensCount?: Record<string, number>;
  garcomLookup?: (p: T) => string | null;
  colunasExtras?: ColunaExtra[];
  acoesPorLinha?: (p: T) => React.ReactNode;
  vazio?: string;
}) {
  const selecionavel = !!selecionados && !!onToggleSelecionado;
  const todosMarcados =
    selecionavel && pedidos.length > 0 && pedidos.every((p) => selecionados!.has(p.id));

  if (pedidos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {vazio}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            {selecionavel && (
              <TableHead className="w-10">
                <Checkbox
                  checked={todosMarcados}
                  onCheckedChange={(v) => onToggleTodos?.(!!v)}
                  aria-label="Selecionar todos"
                />
              </TableHead>
            )}
            {mostrarIdade && <TableHead>Idade</TableHead>}
            <TableHead>Data/hora</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Mesa / Cliente</TableHead>
            {mostrarItens && <TableHead className="text-right">Itens</TableHead>}
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            {garcomLookup && <TableHead>Garçom</TableHead>}
            {colunasExtras?.map((c) => (
              <TableHead key={c.header} className={c.className}>
                {c.header}
              </TableHead>
            ))}
            {acoesPorLinha && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedidos.map((p) => {
            const canal = (p.canal ?? "mesa") as string;
            const mesa = mesas.get(p.mesa_id)?.numero;
            const nomeCliente = p.cliente_nome ?? null;
            const label =
              canal === "mesa"
                ? mesa
                  ? `Mesa ${mesa}`
                  : "Mesa —"
                : nomeCliente ?? (canal === "delivery" ? "Delivery" : "Retirada");
            return (
              <TableRow
                key={p.id}
                className={onAbrir ? "cursor-pointer" : undefined}
                onClick={(e) => {
                  const tgt = e.target as HTMLElement;
                  if (tgt.closest("button, [role=checkbox], input")) return;
                  onAbrir?.(p);
                }}
              >
                {selecionavel && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selecionados!.has(p.id)}
                      onCheckedChange={() => onToggleSelecionado!(p.id)}
                      aria-label="Selecionar pedido"
                    />
                  </TableCell>
                )}
                {mostrarIdade && (
                  <TableCell className="font-medium text-amber-600 dark:text-amber-400">
                    {idade(p.criado_em)}
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap text-sm">{fmtDataHora(p.criado_em)}</TableCell>
                <TableCell className="capitalize text-sm">{canal}</TableCell>
                <TableCell className="text-sm">{label}</TableCell>
                {mostrarItens && (
                  <TableCell className="text-right tabular-nums">{itensCount?.[p.id] ?? 0}</TableCell>
                )}
                <TableCell className="text-right tabular-nums font-medium">{formatBRL(Number(p.total))}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                </TableCell>
                {garcomLookup && (
                  <TableCell className="text-sm text-muted-foreground">{garcomLookup(p) ?? "—"}</TableCell>
                )}
                {colunasExtras?.map((c) => (
                  <TableCell key={c.header} className={c.className}>
                    {c.cell(p)}
                  </TableCell>
                ))}
                {acoesPorLinha && (
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {acoesPorLinha(p)}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}