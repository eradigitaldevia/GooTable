import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExcluirCadastro, useSalvarFornecedor } from "@/hooks/use-financeiro";
import type { Fornecedor } from "@/lib/financeiro.functions";

export function FornecedoresCard({ restauranteId, fornecedores }: { restauranteId: string; fornecedores: Fornecedor[] }) {
  const salvar = useSalvarFornecedor();
  const excluir = useExcluirCadastro();
  const [f, setF] = useState({ nome: "", cnpjCpf: "", telefone: "", email: "" });

  const add = () => {
    if (!f.nome.trim()) return toast.error("Informe o nome");
    salvar.mutate(
      {
        restauranteId, nome: f.nome.trim(), cnpjCpf: f.cnpjCpf.trim() || null,
        telefone: f.telefone.trim() || null, email: f.email.trim() || null,
      },
      {
        onSuccess: () => { setF({ nome: "", cnpjCpf: "", telefone: "", email: "" }); toast.success("Fornecedor cadastrado"); },
        onError: (e) => toast.error(e.message.includes("email") ? "E-mail inválido" : e.message),
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
              <Button
                size="icon" variant="ghost" aria-label="Excluir"
                onClick={() => excluir.mutate({ restauranteId, id: x.id, tipo: "fornecedor" }, { onError: (e) => toast.error(e.message) })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
