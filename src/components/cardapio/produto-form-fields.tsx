import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Categoria { id: string; nome: string; ordem: number; destino?: "cozinha" | "bar"; }

interface FormState {
  nome: string;
  descricao: string;
  preco: string;
  categoria_id: string;
  percentual_comissao: string;
  comissao_aplicavel: boolean;
  destino_override: "" | "cozinha" | "bar";
  destaque_upsell: boolean;
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
        <Label>Destino do preparo</Label>
        <Select
          value={form.destino_override || "__cat"}
          onValueChange={(v) =>
            onChange({ ...form, destino_override: v === "__cat" ? "" : (v as "cozinha" | "bar") })
          }
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__cat">Padrão da categoria</SelectItem>
            <SelectItem value="cozinha">Cozinha</SelectItem>
            <SelectItem value="bar">Bar</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Define para qual display o item vai. Sobrescreve a categoria quando preenchido.
        </p>
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>% comissão (opcional)</Label>
          <Input
            inputMode="decimal"
            placeholder="Usa % do garçom"
            value={form.percentual_comissao}
            onChange={(e) =>
              onChange({ ...form, percentual_comissao: e.target.value })
            }
          />
          <p className="text-xs text-muted-foreground">
            Substitui o % do garçom apenas no modo “comissão por item”. E, se vazio usa o % do garçom.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Aplicável a comissão</Label>
          <div className="flex h-10 items-center gap-2 rounded-md border px-3">
            <Switch
              checked={form.comissao_aplicavel}
              onCheckedChange={(v) =>
                onChange({ ...form, comissao_aplicavel: v })
              }
            />
            <span className="text-sm text-muted-foreground">
              {form.comissao_aplicavel ? "Sim" : "Não"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Desligue para itens isentos de comissão.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Sugerir no carrinho (upsell)</Label>
        <div className="flex h-10 items-center gap-2 rounded-md border px-3">
          <Switch
            checked={form.destaque_upsell}
            onCheckedChange={(v) => onChange({ ...form, destaque_upsell: v })}
          />
          <span className="text-sm text-muted-foreground">
            {form.destaque_upsell ? "Em destaque" : "Não sugerido"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Quando ligado, este item aparece com prioridade nas sugestões do carrinho dos clientes.
        </p>
      </div>
    </>
  );
}
