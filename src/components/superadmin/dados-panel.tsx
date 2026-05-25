import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DadosForm = {
  nome: string;
  slug: string;
  cor_primaria: string | null;
  pix_habilitado: boolean;
  pix_chave: string | null;
  pix_nome_titular: string | null;
};

export function DadosPanel({
  form,
  saving,
  onChange,
  onSave,
}: {
  form: DadosForm;
  saving: boolean;
  onChange: (patch: Partial<DadosForm>) => void;
  onSave: () => void;
}) {
  return (
    <Card className="space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Nome</Label>
          <Input value={form.nome} onChange={(e) => onChange({ nome: e.target.value })} />
        </div>
        <div>
          <Label>Slug</Label>
          <Input value={form.slug} onChange={(e) => onChange({ slug: e.target.value })} />
        </div>
        <div>
          <Label>Cor primária</Label>
          <Input value={form.cor_primaria ?? ""} onChange={(e) => onChange({ cor_primaria: e.target.value })} />
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.pix_habilitado}
            onChange={(e) => onChange({ pix_habilitado: e.target.checked })}
          />
          <Label>PIX habilitado</Label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Chave PIX</Label>
            <Input value={form.pix_chave ?? ""} onChange={(e) => onChange({ pix_chave: e.target.value })} />
          </div>
          <div>
            <Label>Titular</Label>
            <Input value={form.pix_nome_titular ?? ""} onChange={(e) => onChange({ pix_nome_titular: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </Card>
  );
}
