import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useArtistas,
  useCriarArtista,
  useAtualizarArtista,
  useRemoverArtista,
} from "@/hooks/use-couvert-artistico";
import type { Artista } from "@/lib/artistas.functions";

interface FormState {
  nome: string;
  documento: string;
  chave_pix: string;
  tipo_chave_pix: string;
  observacao: string;
  ativo: boolean;
}

const empty: FormState = {
  nome: "",
  documento: "",
  chave_pix: "",
  tipo_chave_pix: "",
  observacao: "",
  ativo: true,
};

export function ArtistasTab({ restauranteId }: { restauranteId: string }) {
  const { data: artistas = [], isLoading } = useArtistas(restauranteId);
  const criar = useCriarArtista(restauranteId);
  const atualizar = useAtualizarArtista(restauranteId);
  const remover = useRemoverArtista(restauranteId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Artista | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(a: Artista) {
    setEditing(a);
    setForm({
      nome: a.nome,
      documento: a.documento ?? "",
      chave_pix: a.chave_pix ?? "",
      tipo_chave_pix: a.tipo_chave_pix ?? "",
      observacao: a.observacao ?? "",
      ativo: a.ativo,
    });
    setOpen(true);
  }

  async function save() {
    if (form.nome.trim().length < 2) {
      toast.error("Nome muito curto");
      return;
    }
    const payload = {
      restauranteId,
      nome: form.nome.trim(),
      documento: form.documento.trim() || null,
      chave_pix: form.chave_pix.trim() || null,
      tipo_chave_pix: form.tipo_chave_pix || null,
      observacao: form.observacao.trim() || null,
      ativo: form.ativo,
    };
    try {
      if (editing) {
        await atualizar.mutateAsync({ ...payload, id: editing.id });
        toast.success("Artista atualizado");
      } else {
        await criar.mutateAsync(payload);
        toast.success("Artista cadastrado");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  async function handleRemover(a: Artista) {
    if (!confirm(`Excluir o artista "${a.nome}"?`)) return;
    try {
      await remover.mutateAsync({ restauranteId, id: a.id });
      toast.success("Artista excluído");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {artistas.length} artista(s) cadastrado(s).
        </p>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Novo artista
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Nome</th>
              <th className="px-4 py-2 text-left">Documento</th>
              <th className="px-4 py-2 text-left">PIX</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
            ) : artistas.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">
                Nenhum artista cadastrado.
              </td></tr>
            ) : artistas.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{a.nome}</td>
                <td className="px-4 py-2 text-muted-foreground">{a.documento ?? "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {a.chave_pix ? `${a.tipo_chave_pix ? a.tipo_chave_pix + ": " : ""}${a.chave_pix}` : "—"}
                </td>
                <td className="px-4 py-2">
                  {a.ativo ? (
                    <Badge variant="secondary">Ativo</Badge>
                  ) : (
                    <Badge variant="outline">Inativo</Badge>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleRemover(a)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar artista" : "Novo artista"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} maxLength={120} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Documento (CPF/CNPJ)</Label>
                <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} maxLength={40} />
              </div>
              <div className="space-y-1">
                <Label>Tipo de chave PIX</Label>
                <Select
                  value={form.tipo_chave_pix || "nenhum"}
                  onValueChange={(v) => setForm({ ...form, tipo_chave_pix: v === "nenhum" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">—</SelectItem>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="aleatoria">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Chave PIX</Label>
              <Input value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} maxLength={140} />
            </div>
            <div className="space-y-1">
              <Label>Observação</Label>
              <Textarea rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} maxLength={500} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-2">
              <Label className="text-sm">Ativo</Label>
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={criar.isPending || atualizar.isPending}>
              {(criar.isPending || atualizar.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}