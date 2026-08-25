import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Receipt, Search, Tv, X, LayoutGrid, Printer } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useComandasPagamentoPendente } from "@/hooks/use-pagamentos";
import { useTurnoAtivo } from "@/hooks/use-caixa";
import { useVerificarPlatformAdmin } from "@/hooks/use-superadmin";
import { ConfirmarPagamentoDialog } from "@/components/admin/confirmar-pagamento-dialog";
import { formatBRL } from "@/lib/cart";
import { useTick } from "@/hooks/use-tick";
import { ComprovanteConta } from "@/components/impressao/comprovante-conta";
import { useImprimir } from "@/hooks/use-imprimir";
import { resumoComandaImpressaoFn } from "@/lib/pedidos.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/caixa/pagamentos")({
  component: CaixaPagamentosPage,
});

function formatAbertaHa(abertaEm: string, now: number): string {
  const ms = Math.max(0, now - new Date(abertaEm).getTime());
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem > 0 ? `${h}h${String(rem).padStart(2, "0")}` : `${h}h`;
}

function CaixaPagamentosPage() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const { data: comandas, isLoading, isFetching } = useComandasPagamentoPendente(
    restaurante?.id,
  );
  const { data: turno } = useTurnoAtivo(restaurante?.id);
  const { data: paData } = useVerificarPlatformAdmin();
  const isPlatformAdmin = !!paData?.isPlatformAdmin;
  const souDono = !!(turno && user?.id && turno.operador_user_id === user.id);
  const podeConfirmar = souDono && !isPlatformAdmin;
  useTick(30_000);
  const now = Date.now();

  const [selecionada, setSelecionada] = useState<
    { comandaId: string; restante: number } | null
  >(null);
  const [imprimirComandaId, setImprimirComandaId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [garcomFiltro, setGarcomFiltro] = useState<string>("todos");
  const [modoTv, setModoTv] = useState(false);

  const resumoFn = useServerFn(resumoComandaImpressaoFn);
  const [segundaVia, setSegundaVia] = useState(false);
  const imprimir = useImprimir(
    restaurante
      ? {
          nome: restaurante.nome,
          cnpj: (restaurante as any).cnpj ?? null,
          telefone: (restaurante as any).telefone ?? null,
          endereco: (restaurante as any).endereco ?? null,
        }
      : null,
  );
  const { data: dadosImpressao, isFetching: carregandoImpressao } = useQuery({
    queryKey: ["resumo-comanda-impressao", imprimirComandaId, restaurante?.id],
    queryFn: () =>
      resumoFn({
        data: {
          restauranteId: restaurante!.id,
          comandaId: imprimirComandaId!,
        },
      }),
    enabled: !!imprimirComandaId && !!restaurante?.id,
  });

  function dispararImpressao(comandaId: string) {
    if (imprimirComandaId === comandaId && dadosImpressao) {
      imprimir();
      return;
    }
    setImprimirComandaId(comandaId);
    // Aguarda a próxima query e imprime quando os dados chegarem.
    const start = Date.now();
    const tick = () => {
      if (Date.now() - start > 10000) {
        toast.error("Não foi possível carregar a conta para impressão.");
        return;
      }
      const node = document.querySelector(
        `[data-print-comanda-id="${comandaId}"]`,
      );
      if (node) {
        imprimir();
      } else {
        setTimeout(tick, 100);
      }
    };
    setTimeout(tick, 100);
  }

  const todas = comandas ?? [];
  const garcons = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of todas) {
      if (c.garcom_id) map.set(c.garcom_id, c.garcom_nome ?? "—");
    }
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [todas]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return todas.filter((c) => {
      if (garcomFiltro !== "todos") {
        if (garcomFiltro === "sem" && c.garcom_id) return false;
        if (garcomFiltro !== "sem" && c.garcom_id !== garcomFiltro) return false;
      }
      if (!q) return true;
      const mesa = (c.mesa_numero ?? "").toLowerCase();
      const titular = (c.titular_nome ?? "").toLowerCase();
      const garcom = (c.garcom_nome ?? "").toLowerCase();
      return mesa.includes(q) || titular.includes(q) || garcom.includes(q);
    });
  }, [todas, busca, garcomFiltro]);

  if (!restaurante) return null;

  const motivoBloqueio = isPlatformAdmin
    ? "Super-admin opera apenas em modo leitura."
    : !turno
      ? "Abra um turno de caixa para confirmar pagamentos."
      : !souDono
        ? `Apenas o operador do turno (${turno.operador_nome}) pode confirmar.`
        : null;

  if (modoTv) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="text-3xl font-semibold">Pagamentos pendentes</h1>
            <p className="text-sm text-muted-foreground">
              {lista.length} comanda{lista.length === 1 ? "" : "s"} aguardando
            </p>
          </div>
          <Button variant="outline" onClick={() => setModoTv(false)}>
            <X className="mr-2 h-4 w-4" /> Sair do Modo TV
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {lista.length === 0 ? (
            <div className="flex h-full items-center justify-center text-2xl text-muted-foreground">
              Nenhuma comanda pendente
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lista.map((c) => (
                <Card key={c.comanda_id} className="p-5">
                  <div className="text-xs uppercase text-muted-foreground">
                    Mesa
                  </div>
                  <div className="text-4xl font-bold">{c.mesa_numero ?? "—"}</div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    {c.titular_nome ?? "—"}
                  </div>
                  {c.garcom_nome && (
                    <div className="text-xs text-muted-foreground">
                      Garçom: {c.garcom_nome}
                    </div>
                  )}
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">
                        Restante
                      </div>
                      <div className="text-2xl font-semibold text-destructive">
                        {formatBRL(c.restante)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      Aberta há
                      <div className="text-sm font-medium text-foreground">
                        {formatAbertaHa(c.aberta_em, now)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pagamentos pendentes</h1>
          <p className="text-sm text-muted-foreground">
            Comandas abertas com saldo a receber. Clique em uma para registrar o pagamento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Button variant="outline" size="sm" onClick={() => setModoTv(true)}>
            <Tv className="mr-2 h-4 w-4" /> Modo TV
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por mesa, titular ou garçom"
            className="pl-9"
          />
        </div>
        <Select value={garcomFiltro} onValueChange={setGarcomFiltro}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os garçons</SelectItem>
            <SelectItem value="sem">Sem garçom</SelectItem>
            {garcons.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando comandas…</div>
      ) : lista.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <Receipt className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm font-medium">
            {todas.length === 0
              ? "Nenhuma comanda com pagamento pendente"
              : "Nenhuma comanda corresponde aos filtros"}
          </div>
          <div className="text-xs text-muted-foreground">
            {todas.length === 0
              ? "Quando houver comandas abertas com saldo a receber, elas aparecerão aqui."
              : "Tente ajustar a busca ou o filtro de garçom."}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Mesa</th>
                  <th className="px-4 py-3">Titular</th>
                  <th className="px-4 py-3">Garçom</th>
                  <th className="px-4 py-3">Aberta há</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Pago</th>
                  <th className="px-4 py-3 text-right">Restante</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((c) => (
                  <tr key={c.comanda_id}>
                    <td className="px-4 py-3 font-medium">
                      Mesa {c.mesa_numero ?? "—"}
                      {c.pagamentos_pendentes > 0 && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          {c.pagamentos_pendentes} pendente
                          {c.pagamentos_pendentes > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.titular_nome ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.garcom_nome ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatAbertaHa(c.aberta_em, now)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatBRL(c.total)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatBRL(c.total_pago)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-destructive">
                      {formatBRL(c.restante)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {podeConfirmar ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            setSelecionada({
                              comandaId: c.comanda_id,
                              restante: c.restante,
                            })
                          }
                        >
                          Registrar pagamento
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block">
                                <Button size="sm" disabled>
                                  Registrar pagamento
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{motivoBloqueio}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {c.mesa_id && (
                        <Button asChild size="sm" variant="ghost" className="ml-2">
                          <Link
                            to="/sala/mesa/$mesaId"
                            params={{ mesaId: c.mesa_id }}
                          >
                            <LayoutGrid className="mr-1 h-3.5 w-3.5" />
                            Juntar/Dividir
                          </Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2"
                        title="Imprimir conta"
                        disabled={
                          carregandoImpressao &&
                          imprimirComandaId === c.comanda_id
                        }
                        onClick={() => dispararImpressao(c.comanda_id)}
                      >
                        {carregandoImpressao &&
                        imprimirComandaId === c.comanda_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Printer className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selecionada && (
        <ConfirmarPagamentoDialog
          open={!!selecionada}
          onOpenChange={(v) => !v && setSelecionada(null)}
          restauranteId={restaurante.id}
          comandaId={selecionada.comandaId}
          saldoSugerido={selecionada.restante}
        />
      )}

      {dadosImpressao && (
        <div data-print-comanda-id={dadosImpressao.comanda.id}>
          <ComprovanteConta
            restaurante={dadosImpressao.restaurante}
            contexto={{
              tipo: "comanda",
              mesaNumero: dadosImpressao.mesa_numero,
              comandaTitular: dadosImpressao.comanda.titular_nome,
              garcomNome: dadosImpressao.garcom_nome,
            }}
            itens={dadosImpressao.itens}
            couverts={dadosImpressao.couverts}
            totais={dadosImpressao.totais}
            pagamentos={dadosImpressao.pagamentos}
            variante={
              dadosImpressao.totais.saldo <= 0 ? "pago" : "rascunho"
            }
          />
        </div>
      )}
    </div>
  );
}