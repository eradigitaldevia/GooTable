import { Card } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function FaturamentoChart({
  data,
  fmt,
}: {
  data: { data: string; total: number }[];
  fmt: (n: number) => string;
}) {
  return (
    <Card className="p-4 sm:p-6">
      <h2 className="mb-4 text-sm font-semibold">Faturamento — últimos 30 dias</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="data" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v: number) => fmt(v)}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            />
            <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#g1)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
