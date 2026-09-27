import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useExcluirCadastro, useSalvarFornecedor } from "@/hooks/use-financeiro";
import type { Fornecedor } from "@/lib/financeiro.functions";

const VAZIO = { nome: "", cnpjCpf: "", telefone: "", email: "" };

export function FornecedoresCard({ restauranteId, fornecedores }: { restauranteId: string; fornecedores: Fornecedor[] }) {
  const salvar = useSalvarFornecedor();
  const excluir = useExcluirCadastro();
  const [f, setF] = useState(VAZIO);
  const [editForn, setEditForn] = useState<Fornecedor | null>(null);
  const [edit, setEdit] = useState(VAZIO);
  const [excluirForn, setExcluirForn] = useState<Fornecedor | null>(null);

  useEffect(() => {
    if (editForn) {
      setEdit({
        nome: editForn.nome, cnpjCpf: editForn.cnpj_cpf ?? "",
        telefone: editForn.telefone ?? "", email: editForn.email ?? "",
      });
    }
  }, [editForn]);

  const add = () => {
    if (!f.nome.trim()) return toast.error("Informe o nome");
    salvar.mutate(
      {
        restauranteId, nome: f.nome.trim(), cnpjCpf: f.cnpjCpf.trim() || null,
        telefone: f.telefone.trim() || null, email: f.email.trim() || null,
      },
      {
        onSuccess: () => { setF(VAZIO); toast.success("Fornecedor cadastrado"); },
        onError: (e) => toast.error(e.message.includes("email") ? "E-mail inválido" : e.message),
      },
    );
  };

  const salvarEdicao = () => {
    if (!editForn || !edit.nome.trim()) return;
    salvar.mutate(
      {
        restauranteId, id: editForn.id, nome: edit.nome.trim(),
        cnpjCpf: edit.cnpjCpf.trim() || null,
        telefone: edit.telefone.trim() || null, email: edit.email.trim() || null,
      },
      {
        onSuccess: () => { setEditForn(null); toast.success("Fornecedor atualizado"); },
        onError: (e) => toast.error(e.message.includes("email") ? "E-mail inválido" : e.message),
      },
    );
  };

  const excluirDefinitivo = () => {
    if (!excluirForn) return;
    excluir.mutate(
      { restauranteId, id: excluirForn.id, tipo: "fornecedor" },
      {
        onSuccess: () => { setExcluirForn(null); toast.success("Fornecedor excluído"); },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Fornecedores</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} maxLength={120} />
          <Input placeholder="CNPJ/CPF" value={f.cnpjCpf} onChange={(e) => setF({ ...f, cnpjCpf: e.target.value })} maxLength={20} />
          <Input placeholder="Telefone" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} maxLength={20} />
          <Input placeholder="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={255} />
        </div>
        <Button onClick={add} disabled={salvar.isPending}>Adicionar fornecedor</Button>
        <ul className="divide-y rounded-lg border">
          {fornecedores.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum fornecedor.</li>}
          {fornecedores.map((x) => (
            <li key={x.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <div className="font-medium">{x.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {[x.cnpj_cpf, x.telefone, x.email].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEditForn(x)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => setExcluirForn(x)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog open={!!editForn} onOpenChange={(o) => !o && setEditForn(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar fornecedor</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Nome" value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} maxLength={120} />
            <Input placeholder="CNPJ/CPF" value={edit.cnpjCpf} onChange={(e) => setEdit({ ...edit, cnpjCpf: e.target.value })} maxLength={20} />
            <Input placeholder="Telefone" value={edit.telefone} onChange={(e) => setEdit({ ...edit, telefone: e.target.value })} maxLength={20} />
            <Input placeholder="E-mail" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} maxLength={255} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditForn(null)}>Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={salvar.isPending || !edit.nome.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluirForn} onOpenChange={(o) => !o && setExcluirForn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir o fornecedor "{excluirForn?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirDefinitivo} disabled={excluir.isPending}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
