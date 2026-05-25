import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Categoria { id: string; nome: string; ordem: number; }

interface FormState {
  nome: string;
  descricao: string;
  preco: string;
  categoria_id: string;
}

export function ProdutoFormFields({
  form,
  onChange,
  categorias,
}: {
  form: FormState;
  onChange: (next: FormState) => void;
  categorias: Categoria[];
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input value={form.nome} onChange={(e) => onChange({ ...form, nome: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Preço (R$)</Label>
          <Input
            inputMode="decimal"
            placeholder="0,00"
            value={form.preco}
            onChange={(e) => onChange({ ...form, preco: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            value={form.categoria_id || "__none"}
            onValueChange={(v) => onChange({ ...form, categoria_id: v === "__none" ? "" : v })}
          >
            <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Sem categoria</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          rows={3}
          value={form.descricao}
          onChange={(e) => onChange({ ...form, descricao: e.target.value })}
          placeholder="Ingredientes, porção, etc."
        />
      </div>
    </>
  );
}
