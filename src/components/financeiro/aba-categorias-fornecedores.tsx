import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCadastrosFinanceiro, useExcluirCadastro, useSalvarCategoria } from "@/hooks/use-financeiro";
import type { CategoriaFinanceira } from "@/lib/financeiro.functions";
import { FornecedoresCard } from "./fornecedores-card";

export function AbaCategoriasFornecedores({ restauranteId }: { restauranteId: string }) {
  const { data } = useCadastrosFinanceiro(restauranteId);
  const salvar = useSalvarCategoria();
  const excluir = useExcluirCadastro();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"receita" | "despesa">("despesa");
  const [editCat, setEditCat] = useState<CategoriaFinanceira | null>(null);
  const [editNome, setEditNome] = useState("");
  const [excluirCat, setExcluirCat] = useState<CategoriaFinanceira | null>(null);

  useEffect(() => {
    if (editCat) setEditNome(editCat.nome);
  }, [editCat]);

  const add = () => {
    if (!nome.trim()) return;
    salvar.mutate(
      { restauranteId, tipo, nome: nome.trim() },
      { onSuccess: () => { setNome(""); toast.success("Categoria criada"); }, onError: (e) => toast.error(e.message) },
    );
  };

  const salvarEdicao = () => {
    if (!editCat || !editNome.trim()) return;
    salvar.mutate(
      { restauranteId, id: editCat.id, tipo: editCat.tipo, nome: editNome.trim() },
      {
        onSuccess: () => { setEditCat(null); toast.success("Categoria atualizada"); },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const excluirDefinitivo = () => {
    if (!excluirCat) return;
    excluir.mutate(
      { restauranteId, id: excluirCat.id, tipo: "categoria" },
      {
        onSuccess: () => { setExcluirCat(null); toast.success("Categoria excluída"); },
        onError: (e) => toast.error(e.message),
      },
    );
  };

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
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEditCat(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => setExcluirCat(c)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editCat} onOpenChange={(o) => !o && setEditCat(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
          </DialogHeader>
          <Input
            value={editNome}
            onChange={(e) => setEditNome(e.target.value)}
            maxLength={80}
            placeholder="Nome da categoria"
            onKeyDown={(e) => e.key === "Enter" && salvarEdicao()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCat(null)}>Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={salvar.isPending || !editNome.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluirCat} onOpenChange={(o) => !o && setExcluirCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir a categoria "{excluirCat?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirDefinitivo} disabled={excluir.isPending}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FornecedoresCard restauranteId={restauranteId} fornecedores={data?.fornecedores ?? []} />
    </div>
  );
}
