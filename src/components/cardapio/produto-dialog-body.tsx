import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ImagemUploader } from "./imagem-uploader";
import { ProdutoFormFields } from "./produto-form-fields";
import { useAtualizarProduto, useCriarProduto } from "@/hooks/use-cardapio";

interface Categoria { id: string; nome: string; ordem: number; destino?: "cozinha" | "bar"; }
interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  disponivel: boolean;
  categoria_id: string | null;
  ordem: number;
  percentual_comissao?: number | null;
  comissao_aplicavel?: boolean;
  destino_override?: "cozinha" | "bar" | null;
  destaque_upsell?: boolean;
}

const produtoSchema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório").max(100),
  descricao: z.string().max(500).optional(),
  preco: z.number().min(0, "Preço inválido"),
  categoria_id: z.string().uuid().nullable(),
  percentual_comissao: z.number().min(0).max(100).nullable(),
  comissao_aplicavel: z.boolean(),
  destino_override: z.enum(["cozinha", "bar"]).nullable(),
  destaque_upsell: z.boolean(),
});

export default function ProdutoDialogBody({
  restauranteId,
  categorias,
  produto,
  onSaved,
  onClose,
}: {
  restauranteId: string;
  categorias: Categoria[];
  produto?: Produto;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nome: produto?.nome ?? "",
    descricao: produto?.descricao ?? "",
    preco: produto?.preco ? String(produto.preco) : "",
    categoria_id: produto?.categoria_id ?? "",
    percentual_comissao:
      produto?.percentual_comissao != null ? String(produto.percentual_comissao) : "",
    comissao_aplicavel: produto?.comissao_aplicavel ?? true,
    destino_override: (produto?.destino_override ?? "") as "" | "cozinha" | "bar",
    destaque_upsell: produto?.destaque_upsell ?? false,
  });
  const [imagemUrl, setImagemUrl] = useState<string | null>(produto?.imagem_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const criar = useCriarProduto(restauranteId);
  const atualizar = useAtualizarProduto(restauranteId);

  async function handleUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem maior que 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${restauranteId}/${crypto.randomUUID()}.${ext}`;
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

  async function save() {
    const pctRaw = form.percentual_comissao.trim();
    const pctNum = pctRaw === "" ? null : Number(pctRaw.replace(",", "."));
    const parsed = produtoSchema.safeParse({
      nome: form.nome,
      descricao: form.descricao || undefined,
      preco: Number(form.preco.replace(",", ".")),
      categoria_id: form.categoria_id || null,
      percentual_comissao: pctNum,
      comissao_aplicavel: form.comissao_aplicavel,
      destino_override: form.destino_override || null,
      destaque_upsell: form.destaque_upsell,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const payload = {
      nome: parsed.data.nome,
      descricao: parsed.data.descricao ?? null,
      preco: parsed.data.preco,
      categoria_id: parsed.data.categoria_id,
      imagem_url: imagemUrl,
      percentual_comissao: parsed.data.percentual_comissao,
      comissao_aplicavel: parsed.data.comissao_aplicavel,
      destino_override: parsed.data.destino_override,
      destaque_upsell: parsed.data.destaque_upsell,
    };
    try {
      if (produto) {
        await atualizar.mutateAsync({ id: produto.id, payload });
      } else {
        await criar.mutateAsync(payload);
      }
      setSaving(false);
      toast.success(produto ? "Produto atualizado" : "Produto criado");
      onClose();
      onSaved();
    } catch (e) {
      setSaving(false);
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{produto ? "Editar produto" : "Novo produto"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <ImagemUploader
          imagemUrl={imagemUrl}
          uploading={uploading}
          onUpload={handleUpload}
          onRemove={() => setImagemUrl(null)}
        />

        <ProdutoFormFields form={form} onChange={setForm} categorias={categorias} />
      </div>

      <DialogFooter>
        <Button onClick={save} disabled={saving || uploading}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {produto ? "Salvar" : "Criar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
