import { useState } from "react";
import { toast } from "sonner";
import { Check, MoreHorizontal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAlterarStatusLancamento } from "@/hooks/use-financeiro";
import type { Lancamento } from "@/lib/financeiro.functions";
import { formatBRL } from "@/lib/cart";
import { dataLocal } from "@/lib/data-fuso";
import { BaixarLancamentoDialog } from "./baixar-lancamento-dialog";

const fmt = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");

function StatusBadge({ l, hoje }: { l: Lancamento; hoje: string }) {
  if (l.status === "pago") return <Badge>{l.tipo === "pagar" ? "Pago" : "Recebido"}</Badge>;
  if (l.status === "cancelado") return <Badge variant="outline">Cancelado</Badge>;
  if (l.data_vencimento < hoje) return <Badge variant="destructive">Vencido</Badge>;
  return <Badge variant="secondary">Pendente</Badge>;
}

export function TabelaLancamentos({
  restauranteId, itens, onEditar,
}: { restauranteId: string; itens: Lancamento[]; onEditar: (l: Lancamento) => void }) {
  const [baixar, setBaixar] = useState<Lancamento | null>(null);
  const alterar = useAlterarStatusLancamento();
  const hoje = dataLocal();
  const acao = (l: Lancamento, a: "estornar" | "cancelar" | "excluir") =>
    alterar.mutate(
      { restauranteId, id: l.id, acao: a },
      { onSuccess: () => toast.success("Lançamento atualizado"), onError: (e) => toast.error(e.message) },
    );

  if (itens.length === 0) {
    return <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Nenhum lançamento no período.</div>;
  }
  return (
    <>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{fmt(l.data_vencimento)}</TableCell>
                <TableCell>
                  <div className="font-medium">{l.descricao}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.fornecedor_nome ?? ""}{l.origem !== "manual" ? " · importado" : ""}
                    {l.data_pagamento ? ` · pago em ${fmt(l.data_pagamento)}` : ""}
                  </div>
                </TableCell>
                <TableCell>{l.categoria_nome ?? "—"}</TableCell>
                <TableCell><StatusBadge l={l} hoje={hoje} /></TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(l.valor)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {l.status === "pendente" && (
                      <Button size="icon" variant="ghost" aria-label="Dar baixa" onClick={() => setBaixar(l)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="Ações"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {l.origem === "manual" && <DropdownMenuItem onClick={() => onEditar(l)}>Editar</DropdownMenuItem>}
                        {l.status === "pago" && <DropdownMenuItem onClick={() => acao(l, "estornar")}>Estornar baixa</DropdownMenuItem>}
                        {l.status !== "cancelado" && <DropdownMenuItem onClick={() => acao(l, "cancelar")}>Cancelar</DropdownMenuItem>}
                        {l.origem === "manual" && (
                          <DropdownMenuItem className="text-destructive" onClick={() => acao(l, "excluir")}>Excluir</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <BaixarLancamentoDialog restauranteId={restauranteId} lancamento={baixar} onClose={() => setBaixar(null)} />
    </>
  );
}
