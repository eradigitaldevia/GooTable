import { useEffect, useState } from "react";
import slugify from "slugify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAtualizarRestauranteAdmin, useAtualizarContratoRestaurante } from "@/hooks/use-superadmin";

export function EditarRestauranteDialog({
  open,
  onClose,
  restaurante,
}: {
  open: boolean;
  onClose: () => void;
  restaurante: {
    id: string;
    nome: string;
    slug: string;
    contrato_vencimento_em?: string | null;
    contrato_notas?: string | null;
  } | null;
}) {
  const atualizar = useAtualizarRestauranteAdmin();
  const atualizarContrato = useAtualizarContratoRestaurante();
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (open && restaurante) {
      setNome(restaurante.nome);
      setSlug(restaurante.slug);
      setVencimento(restaurante.contrato_vencimento_em ?? "");
      setNotas(restaurante.contrato_notas ?? "");
    }
  }, [open, restaurante]);

  const salvando = atualizar.isPending || atualizarContrato.isPending;

  const submit = async () => {
    if (!restaurante) return;
    const slugNormalizado = slugify(slug, { lower: true, strict: true });
    try {
      await atualizar.mutateAsync({ id: restaurante.id, nome: nome.trim(), slug: slugNormalizado });
      await atualizarContrato.mutateAsync({
        id: restaurante.id,
        vencimento: vencimento || null,
        notas: notas || null,
      });
      toast.success("Restaurante atualizado");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar restaurante</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" /> /m/&lt;qr-token&gt; (gerado por mesa)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vencimento do contrato</Label>
              <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </div>
            <div>
              <Label>Notas comerciais</Label>
              <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Plano, observações…" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={salvando || nome.trim().length < 2 || slug.trim().length < 2}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
