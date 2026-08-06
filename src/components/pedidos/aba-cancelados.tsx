import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePedidosCancelados } from "@/hooks/use-pedidos";
import { TabelaPedidos } from "@/components/pedidos/tabela-pedidos";
import { DetalhePedidoLazy } from "@/components/pedidos/detalhe-pedido-lazy";
import { useGarcomLookup } from "@/hooks/use-garcom-lookup";

function toISODate(d: Date) { return d.toISOString().slice(0, 10); }

function diasAtras(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

export function AbaCancelados({
  restauranteId,
  deliverySlug,
}: { restauranteId: string; deliverySlug: string | null }) {
  const sete = useMemo(() => diasAtras(7), []);
  const hoje = useMemo(() => new Date(), []);
  const [dataInicio, setDataInicio] = useState<Date>(sete);
  const [dataFim, setDataFim] = useState<Date>(hoje);
  const [periodo, setPeriodo] = useState<"7" | "30" | "60" | "custom">("7");
  const [aberto, setAberto] = useState<any | null>(null);

  function aplicarPeriodo(v: "7" | "30" | "60" | "custom") {
    setPeriodo(v);
    if (v === "custom") return;
    setDataInicio(diasAtras(Number(v)));
    setDataFim(new Date());
  }

  const { data, isLoading } = usePedidosCancelados({
    restauranteId,
    dataInicio: toISODate(dataInicio),
    dataFim: toISODate(dataFim),
  });
  const { nomeDoPedido } = useGarcomLookup(restauranteId);

  const mesasMap = useMemo(() => {
    const m = new Map<string, { id: string; numero: string }>();
    for (const x of data?.mesas ?? []) m.set(x.id, x);
    return m;
  }, [data?.mesas]);

  const infoMap = useMemo(() => {
    const m = new Map<string, { motivo: string | null; cancelado_em: string | null; actor_email: string | null }>();
    for (const c of data?.cancelInfo ?? []) m.set(c.pedido_id, c);
    return m;
  }, [data?.cancelInfo]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:max-w-2xl">
        <div className="space-y-1">
          <Label>Período</Label>
          <Select value={periodo} onValueChange={(v) => aplicarPeriodo(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DateField label="De" value={dataInicio} onChange={(d) => { setDataInicio(d); setPeriodo("custom"); }} />
        <DateField label="Até" value={dataFim} onChange={(d) => { setDataFim(d); setPeriodo("custom"); }} />
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <TabelaPedidos
          pedidos={(data?.pedidos ?? []) as any}
          mesas={mesasMap}
          onAbrir={(p) => setAberto(p)}
          garcomLookup={(p) => nomeDoPedido(p as any)}
          colunasExtras={[
            {
              header: "Motivo",
              cell: (p) => <span className="text-sm">{infoMap.get(p.id)?.motivo ?? "—"}</span>,
            },
            {
              header: "Cancelado por",
              cell: (p) => <span className="text-sm text-muted-foreground">{infoMap.get(p.id)?.actor_email ?? "—"}</span>,
            },
            {
              header: "Cancelado em",
              cell: (p) => {
                const ts = infoMap.get(p.id)?.cancelado_em;
                return <span className="text-sm whitespace-nowrap">{ts ? new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"}</span>;
              },
            },
          ]}
          vazio="Nenhum pedido cancelado no período."
        />
      )}

      <DetalhePedidoLazy
        pedido={aberto}
        mesaNumero={aberto ? mesasMap.get(aberto.mesa_id)?.numero : undefined}
        garcomNome={aberto ? nomeDoPedido(aberto) : null}
        onClose={() => setAberto(null)}
        deliverySlug={deliverySlug}
      />
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: Date; onChange: (d: Date) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(value, "dd/MM/yyyy", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={(d) => d && onChange(d)} initialFocus className={cn("p-3 pointer-events-auto")} locale={ptBR} />
        </PopoverContent>
      </Popover>
    </div>
  );
}