import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2, Split, Printer } from "lucide-react";
import { toast } from "sonner";
import { useGerarDivisaoConta } from "@/hooks/use-comandas-acoes";
import { formatBRL } from "@/lib/cart";
import { useImprimir } from "@/hooks/use-imprimir";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useAuth } from "@/hooks/use-auth";
import { ComprovanteConta } from "@/components/impressao/comprovante-conta";
import type {
  DivisaoContaResultado,
  ModoDivisao,
} from "@/lib/cliente-mesa.functions";
import type { ResumoMesaComanda, ResumoMesaPedido } from "@/lib/pedidos.functions";

type Modo = "igual" | "por_participante" | "por_item";

export function DividirTotalDialog({
  open,
  onOpenChange,
  restauranteId,
  sessaoId,
  comandas,
  pedidos,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  restauranteId: string;
  sessaoId: string;
  comandas: ResumoMesaComanda[];
  pedidos: ResumoMesaPedido[];
}) {
  const [sel, setSel] = useState<Set<string>>(
    () => new Set(comandas.map((c) => c.id)),
  );
  const [modo, setModo] = useState<Modo>("igual");
  const [n, setN] = useState<number>(() =>
    Math.max(
      1,
      comandas.reduce((a, c) => a + c.participantes.length, 0) ||
        comandas.length,
    ),
  );
  const participantes = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of comandas) {
      for (const p of c.participantes) {
        if (p.cliente_id) map.set(p.cliente_id, p.nome || "Cliente");
      }
      if (c.titular_cliente_id && c.titular_nome) {
        map.set(c.titular_cliente_id, c.titular_nome);
      }
    }
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [comandas]);
  const [selPart, setSelPart] = useState<Set<string>>(
    () => new Set(participantes.map((p) => p.id)),
  );

  // Itens dos pedidos das comandas selecionadas
  const itens = useMemo(() => {
    return pedidos
      .filter((p) => p.comanda_id && sel.has(p.comanda_id))
      .flatMap((p) =>
        p.itens.map((it) => ({
          id: it.id,
          nome: it.nome_produto,
          quantidade: it.quantidade,
          preco_unit: it.preco_unit,
          subtotal: it.preco_unit * it.quantidade,
          cliente_nome: it.cliente_nome,
        })),
      );
  }, [pedidos, sel]);
  const [atribItem, setAtribItem] = useState<Record<string, string>>({});

  const [resultado, setResultado] = useState<DivisaoContaResultado | null>(null);
  const gerar = useGerarDivisaoConta(restauranteId);
  const imprimir = useImprimir();
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const [imprimirPendente, setImprimirPendente] = useState(false);

  const toggleComanda = (id: string) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResultado(null);
  };

  const togglePart = (id: string) => {
    setSelPart((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResultado(null);
  };

  const submit = async () => {
    if (sel.size === 0) {
      toast.error("Selecione ao menos uma comanda");
      return;
    }
    let m: ModoDivisao;
    if (modo === "igual") {
      if (n < 1) return toast.error("Informe o número de pessoas");
      m = { tipo: "igual", n };
    } else if (modo === "por_participante") {
      if (selPart.size < 1) return toast.error("Selecione participantes");
      m = { tipo: "por_participante", clienteIds: Array.from(selPart) };
    } else {
      const atrib = Object.entries(atribItem)
        .filter(([, cid]) => cid && cid !== "_sem")
        .map(([itemId, cid]) => ({ itemId, clienteId: cid }));
      if (atrib.length === 0)
        return toast.error("Atribua ao menos um item a um cliente");
      m = { tipo: "por_item", atribuicoes: atrib };
    }
    try {
      const res = await gerar.mutateAsync({
        sessaoId,
        comandaIds: Array.from(sel),
        modo: m,
      });
      setResultado(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao calcular divisão");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-4 w-4" /> Dividir total
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Comandas envolvidas
            </p>
            <ul className="space-y-1">
              {comandas.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id={`d-${c.id}`}
                    checked={sel.has(c.id)}
                    onCheckedChange={() => toggleComanda(c.id)}
                  />
                  <Label htmlFor={`d-${c.id}`} className="flex-1">
                    {c.titular_nome ?? "Compartilhada"} — {formatBRL(c.total)}
                  </Label>
                </li>
              ))}
            </ul>
          </div>

          <Tabs value={modo} onValueChange={(v) => { setModo(v as Modo); setResultado(null); }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="igual">Igual</TabsTrigger>
              <TabsTrigger value="por_participante">Por pessoa</TabsTrigger>
              <TabsTrigger value="por_item">Por item</TabsTrigger>
            </TabsList>

            <TabsContent value="igual" className="mt-3 space-y-2">
              <Label htmlFor="div-n" className="text-sm">
                Dividir em quantas partes iguais?
              </Label>
              <Input
                id="div-n"
                type="number"
                min={1}
                max={30}
                value={n}
                onChange={(e) => { setN(Number(e.target.value) || 1); setResultado(null); }}
              />
            </TabsContent>

            <TabsContent value="por_participante" className="mt-3 space-y-2">
              {participantes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum participante identificado nesta mesa.
                </p>
              ) : (
                <ul className="space-y-1">
                  {participantes.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={`pp-${p.id}`}
                        checked={selPart.has(p.id)}
                        onCheckedChange={() => togglePart(p.id)}
                      />
                      <Label htmlFor={`pp-${p.id}`}>{p.nome}</Label>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="por_item" className="mt-3">
              {itens.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum item nas comandas selecionadas.
                </p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-auto">
                  {itens.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {it.quantidade}× {it.nome}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatBRL(it.subtotal)}
                        </div>
                      </div>
                      <Select
                        value={atribItem[it.id] ?? "_sem"}
                        onValueChange={(v) => {
                          setAtribItem((p) => ({ ...p, [it.id]: v }));
                          setResultado(null);
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Atribuir a..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_sem">— Sem atribuição —</SelectItem>
                          {participantes.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {resultado && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Plano de divisão · Total {formatBRL(resultado.total)}
              </p>
              <ul className="space-y-1 text-sm">
                {resultado.fatias.map((f, i) => (
                  <li
                    key={`${f.label}-${i}`}
                    className="flex items-center justify-between"
                  >
                    <span>{f.label}</span>
                    <strong>{formatBRL(f.valor)}</strong>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Use estes valores como referência ao registrar pagamentos parciais
                nas comandas envolvidas.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={submit} disabled={gerar.isPending}>
            {gerar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Calcular divisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}