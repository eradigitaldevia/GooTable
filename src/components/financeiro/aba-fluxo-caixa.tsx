import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFluxoCaixa, type Periodo } from "@/hooks/use-financeiro";
import { formatBRL } from "@/lib/cart";

const config = {
  entradas_realizadas: { label: "Entradas", color: "var(--primary)" },
  saidas_realizadas: { label: "Saídas", color: "var(--destructive)" },
} satisfies ChartConfig;

const rotulo = (p: string, mes: boolean) => {
  const [y, m, d] = p.split("-");
  return mes ? `${m}/${y}` : `${d}/${m}`;
};

export function AbaFluxoCaixa({ restauranteId, periodo }: { restauranteId: string; periodo: Periodo }) {
  const [agr, setAgr] = useState<"dia" | "mes">("dia");
  const { data, isLoading } = useFluxoCaixa(restauranteId, periodo, agr);
  const linhas = (data ?? []).map((l) => ({ ...l, label: rotulo(l.periodo, agr === "mes") }));
  return (
    <div className="space-y-4">
      <ToggleGroup type="single" value={agr} onValueChange={(v) => v && setAgr(v as "dia" | "mes")}>
        <ToggleGroupItem value="dia">Diário</ToggleGroupItem>
        <ToggleGroupItem value="mes">Mensal</ToggleGroupItem>
      </ToggleGroup>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : linhas.length === 0 ? (
        <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Sem movimentações no período.</div>
      ) : (
        <>
          <ChartContainer config={config} className="h-64 w-full">
            <BarChart data={linhas}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={70} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="entradas_realizadas" fill="var(--color-entradas_realizadas)" radius={4} />
              <Bar dataKey="saidas_realizadas" fill="var(--color-saidas_realizadas)" radius={4} />
            </BarChart>
          </ChartContainer>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Entradas prev.</TableHead>
                  <TableHead className="text-right">Saídas prev.</TableHead>
                  <TableHead className="text-right">Saldo prev.</TableHead>
                  <TableHead className="text-right">Entradas real.</TableHead>
                  <TableHead className="text-right">Saídas real.</TableHead>
                  <TableHead className="text-right">Saldo real.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.periodo} className="tabular-nums">
                    <TableCell>{l.label}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(l.entradas_previstas))}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(l.saidas_previstas))}</TableCell>
                    <TableCell className="text-right font-medium">{formatBRL(Number(l.saldo_previsto))}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(l.entradas_realizadas))}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(l.saidas_realizadas))}</TableCell>
                    <TableCell className="text-right font-medium">{formatBRL(Number(l.saldo_realizado))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
