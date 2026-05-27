import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useAtualizarConfiguracoes, useValidarPix } from "@/hooks/use-configuracoes";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { IdentidadeForm } from "@/components/configuracoes/identidade-form";
import { PixForm } from "@/components/configuracoes/pix-form";
import { ComissaoModoForm } from "@/components/configuracoes/comissao-modo-form";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const { user } = useAuth();
  const { data: restaurante, isLoading } = useMeuRestaurante(user?.id);
  const atualizar = useAtualizarConfiguracoes(user?.id);
  const validarPix = useValidarPix();

  const [form, setForm] = useState({
    nome: "",
    cor_primaria: "#c2410c",
    logo_url: null as string | null,
    pix_habilitado: false,
    pix_chave: "",
    pix_nome_titular: "",
    comissao_modo: "pedido" as "pedido" | "item",
  });

  useEffect(() => {
    if (!restaurante) return;
    setForm({
      nome: restaurante.nome,
      cor_primaria: restaurante.cor_primaria || "#c2410c",
      logo_url: restaurante.logo_url,
      pix_habilitado: restaurante.pix_habilitado,
      pix_chave: restaurante.pix_chave ?? "",
      pix_nome_titular: restaurante.pix_nome_titular ?? "",
      comissao_modo: restaurante.comissao_modo ?? "pedido",
    });
  }, [restaurante]);

  function patch(p: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function save() {
    if (!restaurante) return;
    if (form.nome.trim().length < 2) {
      toast.error("Nome muito curto");
      return;
    }
    try {
      await validarPix.mutateAsync({
        pix_habilitado: form.pix_habilitado,
        pix_chave: form.pix_chave.trim() || null,
        pix_nome_titular: form.pix_nome_titular.trim() || null,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "PIX inválido");
      return;
    }
    try {
      await atualizar.mutateAsync({
        restauranteId: restaurante.id,
        nome: form.nome.trim(),
        cor_primaria: form.cor_primaria,
        logo_url: form.logo_url,
        pix_habilitado: form.pix_habilitado,
        pix_chave: form.pix_chave.trim() || null,
        pix_nome_titular: form.pix_nome_titular.trim() || null,
        comissao_modo: form.comissao_modo,
      });
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    }
  }

  if (isLoading || !restaurante) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize as informações do seu restaurante.
        </p>
      </header>

      <IdentidadeForm
        restauranteId={restaurante.id}
        nome={form.nome}
        corPrimaria={form.cor_primaria}
        logoUrl={form.logo_url}
        onChange={patch}
      />

      <PixForm
        habilitado={form.pix_habilitado}
        chave={form.pix_chave}
        titular={form.pix_nome_titular}
        onChange={patch}
      />

      <ComissaoModoForm modo={form.comissao_modo} onChange={patch} />

      <div className="flex justify-end">
        <Button onClick={save} disabled={atualizar.isPending} className="h-11 px-6">
          {atualizar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
