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
  const [donoSenha, setDonoSenha] = useState("");
  const [donoNome, setDonoNome] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [notas, setNotas] = useState("");
  const [criado, setCriado] = useState<{ slug: string; email: string } | null>(null);

  useEffect(() => {
    if (!open) {
      setNome("");
      setSlug("");
      setDonoEmail("");
      setDonoSenha("");
      setDonoNome("");
      setVencimento("");
      setNotas("");
      setCriado(null);
    }
  }, [open]);

  useEffect(() => {
    if (nome) setSlug(slugify(nome, { lower: true, strict: true }));
  }, [nome]);

  const submit = async () => {
    try {
      const res = await criar.mutateAsync({
        nome,
        slug,
        donoEmail,
        donoSenha: donoSenha || undefined!,
        donoNome,
        vencimento: vencimento || null,
        notas: notas || null,
      });
      toast.success("Restaurante criado");
      setCriado({ slug: res.restaurante?.slug as string, email: donoEmail });
      // keep dialog open briefly so the salesperson can note the password
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
        {criado ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Restaurante <strong>{criado.slug}</strong> criado com sucesso.
            </p>
            <div className="rounded-md bg-muted p-3 text-sm">
              <p>
                <strong>Login:</strong> {criado.email}
              </p>
              <p>
                <strong>Senha:</strong> {donoSenha}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Anote a senha — ela não será exibida novamente.
            </p>
          </div>
        ) : (
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
              <Label>Nome do dono</Label>
              <Input value={donoNome} onChange={(e) => setDonoNome(e.target.value)} placeholder="João Silva" />
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
                Se já existir, mantém o login. Se não, será criada uma conta nova.
              </p>
            </div>
            <div>
              <Label>Senha do dono</Label>
              <Input
                type="text"
                value={donoSenha}
                onChange={(e) => setDonoSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
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
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {criado ? "Fechar" : "Cancelar"}
          </Button>
          {!criado && (
            <Button
              onClick={submit}
              disabled={criar.isPending || !nome || !slug || !donoEmail || !donoSenha || !donoNome}
            >
              {criar.isPending ? "Criando…" : "Criar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
