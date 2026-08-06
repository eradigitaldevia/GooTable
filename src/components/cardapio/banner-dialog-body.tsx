import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagemUploader } from "@/components/cardapio/imagem-uploader";
import { toast } from "sonner";
import type { Banner, BannerDestinoTipo, BannerExibirEm } from "@/lib/banners.functions";
import type { Categoria, Produto } from "@/lib/cardapio.functions";

export type BannerFormValues = Omit<Banner, "id" | "restaurante_id">;

const paraInputDate = (v: string | null) => (v ? v.slice(0, 10) : "");
const paraISO = (v: string, fimDoDia: boolean) =>
  v ? new Date(`${v}T${fimDoDia ? "23:59:59" : "00:00:00"}`).toISOString() : null;

export function BannerDialogBody({
  restauranteId,
  banner,
  categorias,
  produtos,
  salvando,
  onSalvar,
}: {
  restauranteId: string;
  banner: Banner | null;
  categorias: Categoria[];
  produtos: Produto[];
  salvando: boolean;
  onSalvar: (values: BannerFormValues) => void;
}) {
  const [imagemUrl, setImagemUrl] = useState<string | null>(banner?.imagem_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [altText, setAltText] = useState(banner?.alt_text ?? "");
  const [ordem, setOrdem] = useState(String(banner?.ordem ?? 0));
  const [ativo, setAtivo] = useState(banner?.ativo ?? true);
  const [inicio, setInicio] = useState(paraInputDate(banner?.vigencia_inicio ?? null));
  const [fim, setFim] = useState(paraInputDate(banner?.vigencia_fim ?? null));
  const [exibirEm, setExibirEm] = useState<BannerExibirEm>(banner?.exibir_em ?? "ambos");
  const [destinoTipo, setDestinoTipo] = useState<BannerDestinoTipo>(banner?.destino_tipo ?? "nenhum");
  const [destinoValor, setDestinoValor] = useState(banner?.destino_valor ?? "");

  async function handleUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem maior que 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${restauranteId}/banners/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("produtos").upload(path, file, { upsert: false });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("produtos").getPublicUrl(path);
    setImagemUrl(pub.publicUrl);
    setUploading(false);
  }

  function submit() {
    if (!imagemUrl) {
      toast.error("Envie a imagem do banner");
      return;
    }
    if (destinoTipo !== "nenhum" && !destinoValor.trim()) {
      toast.error("Informe o destino do clique");
      return;
    }
    onSalvar({
      imagem_url: imagemUrl,
      alt_text: altText.trim(),
      ordem: Number(ordem) || 0,
      ativo,
      vigencia_inicio: paraISO(inicio, false),
      vigencia_fim: paraISO(fim, true),
      exibir_em: exibirEm,
      destino_tipo: destinoTipo,
      destino_valor: destinoTipo === "nenhum" ? null : destinoValor.trim(),
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Imagem (recomendado 1200x450px, até 5MB)</Label>
        <ImagemUploader
          imagemUrl={imagemUrl}
          uploading={uploading}
          onUpload={handleUpload}
          onRemove={() => setImagemUrl(null)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="banner-alt">Texto alternativo</Label>
        <Input
          id="banner-alt"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          placeholder="Ex.: Promoção de terça — chopp em dobro"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="banner-ordem">Ordem</Label>
          <Input
            id="banner-ordem"
            type="number"
            min={0}
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Exibir em</Label>
          <Select value={exibirEm} onValueChange={(v) => setExibirEm(v as BannerExibirEm)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ambos">Mesa e delivery</SelectItem>
              <SelectItem value="mesa">Somente mesa</SelectItem>
              <SelectItem value="delivery">Somente delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="banner-inicio">Início da vigência</Label>
          <Input
            id="banner-inicio"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="banner-fim">Fim da vigência</Label>
          <Input id="banner-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Ao clicar</Label>
        <Select
          value={destinoTipo}
          onValueChange={(v) => {
            setDestinoTipo(v as BannerDestinoTipo);
            setDestinoValor("");
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nenhum">Nenhuma ação</SelectItem>
            <SelectItem value="categoria">Abrir categoria</SelectItem>
            <SelectItem value="produto">Abrir produto</SelectItem>
            <SelectItem value="link">Abrir link externo</SelectItem>
          </SelectContent>
        </Select>

        {destinoTipo === "categoria" && (
          <Select value={destinoValor} onValueChange={setDestinoValor}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {destinoTipo === "produto" && (
          <Select value={destinoValor} onValueChange={setDestinoValor}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o produto" />
            </SelectTrigger>
            <SelectContent>
              {produtos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {destinoTipo === "link" && (
          <Input
            value={destinoValor}
            onChange={(e) => setDestinoValor(e.target.value)}
            placeholder="https://instagram.com/seurestaurante"
          />
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Banner ativo</p>
          <p className="text-xs text-muted-foreground">Máximo de 3 banners ativos por vez.</p>
        </div>
        <Switch checked={ativo} onCheckedChange={setAtivo} />
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={submit} disabled={salvando || uploading}>
          {salvando ? "Salvando..." : "Salvar banner"}
        </Button>
      </div>
    </div>
  );
}
