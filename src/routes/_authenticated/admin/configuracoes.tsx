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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    permitir_atendimento_cruzado: true,
    caixa_alerta_horas: 12,
    caixa_teto_dinheiro: "" as string,
    caixa_conferencia_cega: false,
    caixa_obrigatorio_para_pagamento: false,
    comissao_rateio_troca_turno: false,
    comissao_pedido_cliente: true,
    comissao_pedido_cliente_percentual: "" as string,
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
      permitir_atendimento_cruzado:
        restaurante.permitir_atendimento_cruzado ?? true,
      caixa_alerta_horas: restaurante.caixa_alerta_horas ?? 12,
      caixa_teto_dinheiro:
        restaurante.caixa_teto_dinheiro != null
          ? String(restaurante.caixa_teto_dinheiro)
          : "",
      caixa_conferencia_cega: restaurante.caixa_conferencia_cega ?? false,
      caixa_obrigatorio_para_pagamento:
        restaurante.caixa_obrigatorio_para_pagamento ?? false,
      comissao_rateio_troca_turno:
        restaurante.comissao_rateio_troca_turno ?? false,
      comissao_pedido_cliente:
        restaurante.comissao_pedido_cliente ?? true,
      comissao_pedido_cliente_percentual:
        restaurante.comissao_pedido_cliente_percentual != null
          ? String(restaurante.comissao_pedido_cliente_percentual)
          : "",
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
    const percCliente = form.comissao_pedido_cliente_percentual.trim();
    let percClienteNum: number | null = null;
    if (percCliente !== "") {
      const n = Number(percCliente.replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        toast.error("Percentual de pedido do cliente deve estar entre 0 e 100");
        return;
      }
      percClienteNum = n;
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
        permitir_atendimento_cruzado: form.permitir_atendimento_cruzado,
        caixa_alerta_horas: Math.min(
          72,
          Math.max(1, Math.round(Number(form.caixa_alerta_horas) || 12)),
        ),
        caixa_teto_dinheiro:
          form.caixa_teto_dinheiro.trim() === ""
            ? null
            : Math.max(0, Number(form.caixa_teto_dinheiro.replace(",", "."))),
        caixa_conferencia_cega: form.caixa_conferencia_cega,
        caixa_obrigatorio_para_pagamento:
          form.caixa_obrigatorio_para_pagamento,
        comissao_rateio_troca_turno: form.comissao_rateio_troca_turno,
        comissao_pedido_cliente: form.comissao_pedido_cliente,
        comissao_pedido_cliente_percentual: percClienteNum,
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

      <ComissaoModoForm
        modo={form.comissao_modo}
        rateioTrocaTurno={form.comissao_rateio_troca_turno}
        pagarPedidoCliente={form.comissao_pedido_cliente}
        percentualPedidoCliente={form.comissao_pedido_cliente_percentual}
        onChange={patch}
      />

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">
              Atendimento cruzado entre garçons
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Permite que um garçom lance pedidos em mesas que não foram
              atribuídas a ele. A comissão sempre vai para quem lançou o
              pedido. Quando desligado, cada garçom só atende suas próprias
              mesas.
            </p>
          </div>
          <Switch
            checked={form.permitir_atendimento_cruzado}
            onCheckedChange={(v) =>
              patch({ permitir_atendimento_cruzado: v })
            }
            aria-label="Permitir atendimento cruzado"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-4">
        <header>
          <h2 className="text-base font-semibold">Caixa</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Regras de operação do caixa, alertas e controles de segurança.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Alerta de turno aberto há (horas)</Label>
            <Input
              type="number"
              min={1}
              max={72}
              value={form.caixa_alerta_horas}
              onChange={(e) =>
                patch({ caixa_alerta_horas: Number(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Avisa quando um turno fica aberto além desse tempo.
            </p>
          </div>

          <div className="space-y-1">
            <Label>Teto de dinheiro em caixa (R$)</Label>
            <Input
              inputMode="decimal"
              placeholder="Sem teto"
              value={form.caixa_teto_dinheiro}
              onChange={(e) => patch({ caixa_teto_dinheiro: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Avisa o operador quando o dinheiro acumulado ultrapassa esse
              valor. Deixe vazio para sem teto.
            </p>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Conferência cega no fechamento</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Esconde o saldo esperado durante o fechamento; o operador conta o
              dinheiro sem ver o sistema. A diferença aparece somente após o
              fechamento.
            </p>
          </div>
          <Switch
            checked={form.caixa_conferencia_cega}
            onCheckedChange={(v) => patch({ caixa_conferencia_cega: v })}
            aria-label="Conferência cega"
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">
              Exigir caixa aberto para confirmar pagamento
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Bloqueia a confirmação de pagamentos quando não há turno de caixa
              aberto.
            </p>
          </div>
          <Switch
            checked={form.caixa_obrigatorio_para_pagamento}
            onCheckedChange={(v) =>
              patch({ caixa_obrigatorio_para_pagamento: v })
            }
            aria-label="Caixa obrigatório para pagamento"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={atualizar.isPending} className="h-11 px-6">
          {atualizar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
