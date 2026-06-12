import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Image as ImageIcon, Eye } from "lucide-react";
import { toast } from "sonner";
import { useUploadLogo } from "@/hooks/use-configuracoes";
import { PaletasTabs } from "./identidade/paletas-tabs";
import { TemaCardapioSecao } from "./identidade/tema-cardapio-secao";
import { PreviewDrawer } from "./identidade/preview-drawer";

type IdentidadePatch = {
  nome?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  cor_acento?: string;
  tema_cardapio?: "claro" | "escuro";
  logo_url?: string | null;
};

export function IdentidadeForm({
  restauranteId,
  nome,
  corPrimaria,
  corSecundaria,
  corAcento,
  tema,
  logoUrl,
  onChange,
}: {
  restauranteId: string;
  nome: string;
  corPrimaria: string;
  corSecundaria: string;
  corAcento: string;
  tema: "claro" | "escuro";
  logoUrl: string | null;
  onChange: (patch: IdentidadePatch) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadMut = useUploadLogo();
  const uploading = uploadMut.isPending;
  const [previewOpen, setPreviewOpen] = useState(false);

  const ACCEPTED_TYPES = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"];

  async function handleUpload(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Formato não suportado. Por favor, envie PNG, SVG, JPG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A logo deve ter no máximo 2 MB. Comprima a imagem ou envie outro arquivo.");
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
    <section className="space-y-8 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div>
        <h2 className="text-lg font-semibold">Identidade</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Personalize a logo, o nome e as cores que o cliente vê no cardápio.
        </p>
      </div>

      <div className="space-y-3">
        <Label>Logo</Label>
        <div className="flex items-start gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo do restaurante" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-7 w-7 text-muted-foreground" />
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {logoUrl ? "Trocar logo" : "Enviar logo"}
              </Button>
              {logoUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ logo_url: null })}>
                  Remover
                </Button>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Recomendamos imagem <strong className="font-medium text-foreground">quadrada (proporção 1:1)</strong> para melhor encaixe no topo do cardápio.
              <br />
              PNG ou SVG transparente · 512×512 px recomendado · até 2 MB
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Nome do restaurante</Label>
        <Input value={nome} onChange={(e) => onChange({ nome: e.target.value })} />
      </div>

      <div className="space-y-3 border-t border-border pt-6">
        <PaletasTabs
          corPrimaria={corPrimaria}
          corSecundaria={corSecundaria}
          corAcento={corAcento}
          tema={tema}
          onChange={onChange}
        />
      </div>

      <div className="border-t border-border pt-6">
        <TemaCardapioSecao
          primaria={corPrimaria}
          secundaria={corSecundaria}
          acento={corAcento}
          tema={tema}
          nome={nome}
          onChange={onChange}
        />
      </div>

      <div className="flex justify-end border-t border-border pt-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreviewOpen(true)}
          className="gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" /> Ver prévia ao vivo
        </Button>
      </div>

      <PreviewDrawer
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        restauranteId={restauranteId}
        nome={nome}
        logoUrl={logoUrl}
        cor_primaria={corPrimaria}
        cor_secundaria={corSecundaria}
        cor_acento={corAcento}
        tema_cardapio={tema}
      />
    </section>
  );
}
