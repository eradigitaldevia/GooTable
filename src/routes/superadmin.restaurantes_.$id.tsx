import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import {
  useAtualizarRestauranteAdmin,
  useRestauranteAdmin,
  useSetRestauranteAtivo,
} from "@/hooks/use-superadmin";
import { DadosPanel, type DadosForm } from "@/components/superadmin/dados-panel";
import { MembrosPanel } from "@/components/superadmin/membros-panel";
import { AtividadePanel } from "@/components/superadmin/atividade-panel";

export const Route = createFileRoute("/superadmin/restaurantes_/$id")({
  component: RestauranteDetalhe,
});

function RestauranteDetalhe() {
  const { id } = Route.useParams();
  const { data } = useRestauranteAdmin(id);
  const rest = data?.restaurante;

  const atualizar = useAtualizarRestauranteAdmin();
  const setAtivo = useSetRestauranteAtivo();

  const [form, setForm] = useState<DadosForm | null>(null);

  useEffect(() => {
    if (!rest) return;
    setForm({
      nome: rest.nome,
      slug: rest.slug,
      cor_primaria: rest.cor_primaria ?? "",
      pix_habilitado: rest.pix_habilitado,
      pix_chave: rest.pix_chave ?? "",
      pix_nome_titular: rest.pix_nome_titular ?? "",
    });
  }, [rest]);

  if (!rest || !form) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const salvarDados = async () => {
    try {
      await atualizar.mutateAsync({
        id,
        nome: form.nome,
        slug: form.slug,
        cor_primaria: form.cor_primaria,
        pix_habilitado: form.pix_habilitado,
        pix_chave: form.pix_chave,
        pix_nome_titular: form.pix_nome_titular,
      });
      toast.success("Salvo");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleAtivo = async () => {
    if (!confirm(`${rest.ativo ? "Suspender" : "Reativar"} "${rest.nome}"?`)) return;
    try {
      await setAtivo.mutateAsync({ id, ativo: !rest.ativo });
      toast.success(rest.ativo ? "Suspenso" : "Reativado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link to="/superadmin/restaurantes" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{rest.nome}</h1>
            {rest.ativo ? <Badge>Ativo</Badge> : <Badge variant="destructive">Suspenso</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">/{rest.slug}</p>
        </div>
        <Button variant={rest.ativo ? "outline" : "default"} onClick={toggleAtivo}>
          {rest.ativo ? "Suspender" : "Reativar"}
        </Button>
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="membros">Membros</TabsTrigger>
          <TabsTrigger value="atividade">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <DadosPanel
            form={form}
            saving={atualizar.isPending}
            onChange={(p) => setForm({ ...form, ...p })}
            onSave={salvarDados}
          />
        </TabsContent>

        <TabsContent value="membros">
          <MembrosPanel restauranteId={id} />
        </TabsContent>

        <TabsContent value="atividade">
          <AtividadePanel restauranteId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
