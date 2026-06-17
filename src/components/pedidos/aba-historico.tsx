import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePedidosHistorico } from "@/hooks/use-pedidos";
import { TabelaPedidos } from "@/components/pedidos/tabela-pedidos";
import { DetalhePedidoLazy } from "@/components/pedidos/detalhe-pedido-lazy";
import { useGarcomLookup } from "@/hooks/use-garcom-lookup";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function AbaHistorico({
  restauranteId,
  deliverySlug,
}: {
  restauranteId: string;
  deliverySlug: string | null;
}) {
  const ontem = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }, []);
  const seteDiasAtras = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const [dataInicio, setDataInicio] = useState<Date>(seteDiasAtras);
  const [dataFim, setDataFim] = useState<Date>(ontem);
  const [canal, setCanal] = useState<"todos" | "mesa" | "delivery" | "retirada">("todos");
  const [status, setStatus] = useState<"todos" | "entregue" | "cancelado" | "abertos">("todos");
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [aberto, setAberto] = useState<any | null>(null);

  const { data, isLoading } = usePedidosHistorico({
    restauranteId,
    dataInicio: toISODate(dataInicio),
    dataFim: toISODate(dataFim),
    canal,
    status,
    busca,
    page,
    pageSize,
  });

  const { nomeDoPedido } = useGarcomLookup(restauranteId);

  const mesasMap = useMemo(() => {
    const m = new Map<string, { id: string; numero: string }>();
    for (const x of data?.mesas ?? []) m.set(x.id, x);
    return m;
  }, [data?.mesas]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <DateField label="De" value={dataInicio} onChange={(d) => { setDataInicio(d); setPage(1); }} />
        <DateField label="Até" value={dataFim} onChange={(d) => { setDataFim(d); setPage(1); }} />
        <div className="space-y-1">
          <Label>Canal</Label>
          <Select value={canal} onValueChange={(v) => { setCanal(v as any); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="mesa">Salão</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="retirada">Retirada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => { setStatus(v as any); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="entregue">Entregue</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="abertos">Em aberto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Buscar</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPage(1); }}
              placeholder="Cliente ou telefone"
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <>
          <TabelaPedidos
            pedidos={(data?.pedidos ?? []) as any}
            mesas={mesasMap}
            onAbrir={(p) => setAberto(p)}
            mostrarItens
            itensCount={data?.itensCount ?? {}}
            garcomLookup={(p) => nomeDoPedido(p as any)}
            vazio="Nenhum pedido no período selecionado."
          />

          {total > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {total} pedido(s) · página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
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
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => d && onChange(d)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}