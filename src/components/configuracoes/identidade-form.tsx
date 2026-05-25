import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useUploadLogo } from "@/hooks/use-configuracoes";

export function IdentidadeForm({
  restauranteId,
  nome,
  corPrimaria,
  logoUrl,
  onChange,
}: {
  restauranteId: string;
  nome: string;
  corPrimaria: string;
  logoUrl: string | null;
  onChange: (patch: { nome?: string; cor_primaria?: string; logo_url?: string | null }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadMut = useUploadLogo();
  const uploading = uploadMut.isPending;

  async function handleUpload(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo maior que 2MB");
      return;
    }
    try {
      const { url } = await uploadMut.mutateAsync({ file, restauranteId });
      onChange({ logo_url: url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar logo");
    }
  }

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <h2 className="text-lg font-semibold">Identidade</h2>

      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-7 w-7 text-muted-foreground" />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            {logoUrl ? "Trocar logo" : "Enviar logo"}
          </Button>
          {logoUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ logo_url: null })}>
              Remover
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Nome do restaurante</Label>
        <Input value={nome} onChange={(e) => onChange({ nome: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label>Cor primária</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={corPrimaria}
            onChange={(e) => onChange({ cor_primaria: e.target.value })}
            className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-transparent"
          />
          <Input
            value={corPrimaria}
            onChange={(e) => onChange({ cor_primaria: e.target.value })}
            className="max-w-[180px]"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Será usada como destaque no cardápio do cliente.
        </p>
      </div>
    </section>
  );
}
