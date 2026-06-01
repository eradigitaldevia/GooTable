import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAtualizarCategoria, useExcluirCategoria } from "@/hooks/use-cardapio";

interface Categoria { id: string; nome: string; ordem: number; destino: "cozinha" | "bar"; }

export function CategoriaChip({
  cat,
  restauranteId,
  onChanged,
}: {
  cat: Categoria;
  restauranteId: string;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(cat.nome);
  const [destino, setDestino] = useState<"cozinha" | "bar">(cat.destino);
  const atualizar = useAtualizarCategoria(restauranteId);
  const excluir = useExcluirCategoria(restauranteId);

  async function save() {
    try {
      await atualizar.mutateAsync({ id: cat.id, nome: nome.trim(), destino });
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }
  async function remove() {
    if (!confirm("Excluir esta categoria? Os produtos vinculados ficarão sem categoria.")) return;
    try {
      await excluir.mutateAsync({ id: cat.id });
      toast.success("Categoria excluída");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <div className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-[var(--shadow-soft)]">
      {editing ? (
        <>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="h-7 w-32"
            autoFocus
          />
          <Select value={destino} onValueChange={(v) => setDestino(v as "cozinha" | "bar")}>
            <SelectTrigger className="h-7 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cozinha">Cozinha</SelectItem>
              <SelectItem value="bar">Bar</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={save}>Salvar</Button>
          <Button size="sm" variant="ghost" onClick={() => { setNome(cat.nome); setDestino(cat.destino); setEditing(false); }}>Cancelar</Button>
        </>
      ) : (
        <>
          <span className="text-sm font-medium">{cat.nome}</span>
          <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground" aria-label="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={remove} className="text-muted-foreground hover:text-destructive" aria-label="Excluir">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
