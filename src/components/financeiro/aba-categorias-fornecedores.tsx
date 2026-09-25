import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCadastrosFinanceiro, useExcluirCadastro, useSalvarCategoria } from "@/hooks/use-financeiro";
import { FornecedoresCard } from "./fornecedores-card";

export function AbaCategoriasFornecedores({ restauranteId }: { restauranteId: string }) {
  const { data } = useCadastrosFinanceiro(restauranteId);
  const salvar = useSalvarCategoria();
  const excluir = useExcluirCadastro();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"receita" | "despesa">("despesa");

  const add = () => {
    if (!nome.trim()) return;
    salvar.mutate(
      { restauranteId, tipo, nome: nome.trim() },
      { onSuccess: () => { setNome(""); toast.success("Categoria criada"); }, onError: (e) => toast.error(e.message) },
    );
  };
  const del = (id: string) =>
    excluir.mutate({ restauranteId, id, tipo: "categoria" }, { onError: (e) => toast.error(e.message) });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Categorias</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={tipo} onValueChange={(v) => setTipo(v as "receita" | "despesa")}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="despesa">Despesa</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Nome da categoria" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} />
            <Button onClick={add} disabled={salvar.isPending}>Adicionar</Button>
          </div>
          {(["despesa", "receita"] as const).map((t) => (
            <div key={t}>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                {t === "despesa" ? "Despesas" : "Receitas"}
              </div>
              <ul className="divide-y rounded-lg border">
                {data?.categorias.filter((c) => c.tipo === t).map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{c.nome}</span>
                    {!c.padrao && (
                      <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => del(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
      <FornecedoresCard restauranteId={restauranteId} fornecedores={data?.fornecedores ?? []} />
    </div>
  );
}
