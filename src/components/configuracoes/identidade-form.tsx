import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useUploadLogo } from "@/hooks/use-configuracoes";
import { PaletaPicker } from "./identidade/paleta-picker";
import { CoresForm } from "./identidade/cores-form";
import { PreviewAmostra } from "./identidade/preview-amostra";
import { PALETAS_PRESETS } from "./identidade/paleta-presets";

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

  const paletaAtivaId =
    PALETAS_PRESETS.find(
      (p) =>
        p.cor_primaria.toLowerCase() === corPrimaria.toLowerCase() &&
        p.cor_secundaria.toLowerCase() === corSecundaria.toLowerCase() &&
        p.cor_acento.toLowerCase() === corAcento.toLowerCase() &&
        p.tema === tema,
    )?.id ?? null;

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
    <section className="space-y-8 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div>
        <h2 className="text-lg font-semibold">Identidade</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Personalize a logo, o nome e as cores que o cliente vê no cardápio.
        </p>
      </div>

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

      <div className="space-y-3 border-t border-border pt-6">
        <div>
          <h3 className="text-sm font-semibold">Paletas prontas</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Clique em uma paleta para aplicar, ou ajuste as cores manualmente abaixo.
          </p>
        </div>
        <PaletaPicker
          selecionadaId={paletaAtivaId}
          onSelect={(p) =>
            onChange({
              cor_primaria: p.cor_primaria,
              cor_secundaria: p.cor_secundaria,
              cor_acento: p.cor_acento,
              tema_cardapio: p.tema,
            })
          }
        />
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <CoresForm
          primaria={corPrimaria}
          secundaria={corSecundaria}
          acento={corAcento}
          tema={tema}
          onChange={onChange}
        />
      </div>

      <div className="space-y-3 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Amostra</h3>
            <p className="text-xs text-muted-foreground">
              Combinação de cores aplicada a alguns elementos do cardápio.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open("/admin/cardapio-preview", "_blank")}
            className="gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Abrir prévia completa
          </Button>
        </div>
        <PreviewAmostra
          nome={nome}
          primaria={corPrimaria}
          secundaria={corSecundaria}
          acento={corAcento}
          tema={tema}
        />
        <p className="text-[11px] text-muted-foreground">
          A prévia completa usa as cores já salvas — salve as alterações antes de
          abrir.
        </p>
      </div>
    </section>
  );
}
