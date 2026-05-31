import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/cart";
import { useHistoricoTurnos } from "@/hooks/use-caixa";
import type { TurnoCaixa } from "@/lib/caixa.functions";

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function RelatorioPanel({ restauranteId }: { restauranteId: string }) {
  const { data: hist } = useHistoricoTurnos(restauranteId);
  const fechados = useMemo(
    () => (hist ?? []).filter((t) => t.status === "fechado"),
    [hist],
  );
  const [opFiltro, setOpFiltro] = useState<string>("todos");
  const [selId, setSelId] = useState<string | undefined>(undefined);

  const operadores = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of fechados) {
      if (t.operador_user_id) map.set(t.operador_user_id, t.operador_nome);
    }
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [fechados]);

  const fechadosFiltrados = useMemo(
    () =>
      opFiltro === "todos"
        ? fechados
        : fechados.filter((t) => t.operador_user_id === opFiltro),
    [fechados, opFiltro],
  );

  const turno: TurnoCaixa | undefined =
    fechadosFiltrados.find((t) => t.id === selId) ?? fechadosFiltrados[0];

  if (fechados.length === 0) {
    return (
      <Card className="p-5 text-sm text-muted-foreground">
        Nenhum turno fechado ainda. Feche um caixa para gerar o primeiro relatório.
      </Card>
    );
  }

  const vendas = Number(turno.snapshot_total_vendas ?? 0);
  const qtd = Number(turno.snapshot_qtd_pedidos ?? 0);
  const ticket = qtd > 0 ? vendas / qtd : 0;
  const dif = Number(turno.diferenca ?? 0);

  const linhas: Array<{ label: string; valor: number }> = [
    { label: "Dinheiro", valor: Number(turno.snapshot_total_dinheiro ?? 0) },
    { label: "Cartão", valor: Number(turno.snapshot_total_cartao ?? 0) },
    { label: "PIX", valor: Number(turno.snapshot_total_pix ?? 0) },
    { label: "Fiado", valor: Number(turno.snapshot_total_fiado ?? 0) },
    { label: "Outro", valor: Number(turno.snapshot_total_outro ?? 0) },
  ];
  const max = Math.max(1, ...linhas.map((l) => l.valor));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={opFiltro} onValueChange={(v) => { setOpFiltro(v); setSelId(undefined); }}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Filtrar operador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos operadores</SelectItem>
            {operadores.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {turno && (
          <Select value={turno.id} onValueChange={setSelId}>
            <SelectTrigger className="sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fechadosFiltrados.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {fmtDateTime(t.aberto_em)} — {t.operador_nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!turno ? (
        <Card className="p-5 text-sm text-muted-foreground">
          Nenhum turno fechado para o operador selecionado.
        </Card>
      ) : (
        <TurnoDetalhes turno={turno} />
      )}
    </div>
  );
}

function TurnoDetalhes({ turno }: { turno: TurnoCaixa }) {
  const vendas = Number(turno.snapshot_total_vendas ?? 0);
  const qtd = Number(turno.snapshot_qtd_pedidos ?? 0);
  const ticket = qtd > 0 ? vendas / qtd : 0;
  const dif = Number(turno.diferenca ?? 0);

  const linhas: Array<{ label: string; valor: number }> = [
    { label: "Dinheiro", valor: Number(turno.snapshot_total_dinheiro ?? 0) },
    { label: "Cartão", valor: Number(turno.snapshot_total_cartao ?? 0) },
    { label: "PIX", valor: Number(turno.snapshot_total_pix ?? 0) },
    { label: "Fiado", valor: Number(turno.snapshot_total_fiado ?? 0) },
    { label: "Outro", valor: Number(turno.snapshot_total_outro ?? 0) },
  ];
  const max = Math.max(1, ...linhas.map((l) => l.valor));

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
          {fmtDateTime(turno.aberto_em)} → {fmtDateTime(turno.fechado_em)} · Operador:{" "}
          <strong className="text-foreground">{turno.operador_nome}</strong>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total vendido" value={formatBRL(vendas)} sub={`${qtd} comandas`} tone="pos" />
        <Metric label="Ticket médio" value={formatBRL(ticket)} sub="por comanda" />
        <Metric
          label="Sangrias"
          value={formatBRL(Number(turno.snapshot_total_sangrias ?? 0))}
          sub={`Suprimentos: ${formatBRL(Number(turno.snapshot_total_suprimentos ?? 0))}`}
          tone="neg"
        />
        <Metric
          label="Diferença"
          value={`${dif > 0 ? "+ " : dif < 0 ? "− " : ""}${formatBRL(Math.abs(dif))}`}
          sub={dif > 0 ? "Sobra" : dif < 0 ? "Falta" : "Bate exato"}
          tone={dif > 0 ? "pos" : dif < 0 ? "neg" : undefined}
        />
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold">Vendas por pagamento</h3>
        <div className="mt-3 space-y-2">
          {linhas.map((l) => (
            <div key={l.label}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{l.label}</span>
                <span className="font-medium">
                  {formatBRL(l.valor)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({vendas > 0 ? Math.round((l.valor / vendas) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((l.valor / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold">Fechamento</h3>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Row label="Fundo inicial" value={formatBRL(Number(turno.fundo_inicial))} />
          <Row label="Fundo para próximo turno" value={formatBRL(Number(turno.fundo_final ?? 0))} />
          <Row
            label="Contagem física"
            value={formatBRL(Number(turno.contagem_fisica ?? 0))}
          />
          <Row label="Diferença" value={formatBRL(dif)} />
        </div>
        {turno.obs_fechamento && (
          <div className="mt-3 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Observação: </strong>
            {turno.obs_fechamento}
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg";
}) {
  return (
    <Card className="p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold ${
          tone === "pos" ? "text-emerald-600" : tone === "neg" ? "text-destructive" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}