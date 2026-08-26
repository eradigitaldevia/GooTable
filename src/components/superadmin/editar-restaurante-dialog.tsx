import { useEffect, useState } from "react";
import slugify from "slugify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  useAtualizarDonoRestaurante,
  useAtualizarRestauranteAdmin,
  useAtualizarContratoRestaurante,
  useDonoRestaurante,
} from "@/hooks/use-superadmin";

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
  const atualizarDono = useAtualizarDonoRestaurante();
  const donoQuery = useDonoRestaurante(restaurante?.id, open);

  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [notas, setNotas] = useState("");
  const [donoNome, setDonoNome] = useState("");
  const [donoEmail, setDonoEmail] = useState("");
  const [donoSenha, setDonoSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    if (open && restaurante) {
      setNome(restaurante.nome);
      setSlug(restaurante.slug);
      setVencimento(restaurante.contrato_vencimento_em ?? "");
      setNotas(restaurante.contrato_notas ?? "");
      setDonoSenha("");
      setMostrarSenha(false);
    }
  }, [open, restaurante]);

  useEffect(() => {
    if (open && donoQuery.data?.dono) {
      setDonoNome(donoQuery.data.dono.nome);
      setDonoEmail(donoQuery.data.dono.email);
    }
  }, [open, donoQuery.data]);

  const salvando = atualizar.isPending || atualizarContrato.isPending || atualizarDono.isPending;
  const dono = donoQuery.data?.dono ?? null;

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
      if (dono) {
        const donoMudou =
          donoNome.trim() !== dono.nome ||
          donoEmail.trim().toLowerCase() !== dono.email.toLowerCase() ||
          donoSenha.length > 0;
        if (donoMudou) {
          await atualizarDono.mutateAsync({
            restauranteId: restaurante.id,
            nome: donoNome.trim(),
            email: donoEmail.trim(),
            ...(donoSenha.length > 0 ? { senha: donoSenha } : {}),
          });
        }
      }
      toast.success("Restaurante atualizado");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  };

  const formValido =
    nome.trim().length >= 2 &&
    slug.trim().length >= 2 &&
    (!dono || (donoNome.trim().length >= 1 && donoEmail.trim().length >= 3)) &&
    (donoSenha.length === 0 || donoSenha.length >= 6);

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

          {dono && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-medium">Dono</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do dono</Label>
                  <Input value={donoNome} onChange={(e) => setDonoNome(e.target.value)} />
                </div>
                <div>
                  <Label>Email do dono</Label>
                  <Input type="email" value={donoEmail} onChange={(e) => setDonoEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Nova senha (opcional)</Label>
                <div className="relative">
                  <Input
                    type={mostrarSenha ? "text" : "password"}
                    value={donoSenha}
                    onChange={(e) => setDonoSenha(e.target.value)}
                    placeholder="Deixe em branco para manter a atual"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {donoSenha.length > 0 && donoSenha.length < 6 && (
                  <p className="mt-1 text-xs text-destructive">A senha deve ter no mínimo 6 caracteres.</p>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={salvando || donoQuery.isLoading || !formValido}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
