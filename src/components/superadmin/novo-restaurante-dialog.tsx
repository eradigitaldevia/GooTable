import { useEffect, useState } from "react";
import slugify from "slugify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useCriarRestauranteAdmin } from "@/hooks/use-superadmin";

export function NovoRestauranteDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const criar = useCriarRestauranteAdmin();
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [donoEmail, setDonoEmail] = useState("");

  useEffect(() => {
    if (!open) {
      setNome("");
      setSlug("");
      setDonoEmail("");
    }
  }, [open]);

  useEffect(() => {
    if (nome) setSlug(slugify(nome, { lower: true, strict: true }));
  }, [nome]);

  const submit = async () => {
    try {
      await criar.mutateAsync({ nome, slug, donoEmail });
      toast.success("Restaurante criado");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo restaurante</DialogTitle>
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
          <div>
            <Label>Email do dono</Label>
            <Input
              type="email"
              value={donoEmail}
              onChange={(e) => setDonoEmail(e.target.value)}
              placeholder="dono@exemplo.com"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              O usuário precisa já ter conta cadastrada na plataforma.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={criar.isPending || !nome || !slug || !donoEmail}>
            {criar.isPending ? "Criando…" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
