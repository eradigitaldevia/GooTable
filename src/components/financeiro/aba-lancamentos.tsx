import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCadastrosFinanceiro, useLancamentos, type Periodo } from "@/hooks/use-financeiro";
import type { Lancamento } from "@/lib/financeiro.functions";
import { formatBRL } from "@/lib/cart";
import { TabelaLancamentos } from "./tabela-lancamentos";

type Status = "todos" | "pendente" | "pago" | "cancelado" | "vencido";
const TODOS = "__todos";

export function AbaLancamentos({
  restauranteId,
  periodo,
  tipo,
  onEditar,
}: {
  restauranteId: string;
  periodo: Periodo;
  tipo: "pagar" | "receber";
  onEditar: (l: Lancamento) => void;
}) {
  const [status, setStatus] = useState<Status>("todos");
  const [categoriaId, setCategoriaId] = useState<string>(TODOS);
  const [fornecedorId, setFornecedorId] = useState<string>(TODOS);
  const { data: cad } = useCadastrosFinanceiro(restauranteId);
  const { data, isLoading } = useLancamentos(restauranteId, periodo, tipo, {
    status,
    categoriaId: categoriaId === TODOS ? undefined : categoriaId,
    fornecedorId: fornecedorId === TODOS ? undefined : fornecedorId,
  });
  const tipoCat = tipo === "pagar" ? "despesa" : "receita";
  const total = (data ?? []).filter((l) => l.status !== "cancelado").reduce((s, l) => s + l.valor, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="pago">{tipo === "pagar" ? "Pago" : "Recebido"}</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoriaId} onValueChange={setCategoriaId}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas categorias</SelectItem>
            {cad?.categorias.filter((c) => c.tipo === tipoCat).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tipo === "pagar" && (
          <Select value={fornecedorId} onValueChange={setFornecedorId}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos fornecedores</SelectItem>
              {cad?.fornecedores.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{formatBRL(total)}</span>
        </div>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <TabelaLancamentos restauranteId={restauranteId} itens={data ?? []} onEditar={onEditar} />
      )}
    </div>
  );
}
