import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useAtualizarConfiguracoes, useValidarPix } from "@/hooks/use-configuracoes";
import { useGarcons, useAtribuicoesMesasMulti } from "@/hooks/use-garcons";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { IdentidadeForm } from "@/components/configuracoes/identidade-form";
import { PixForm } from "@/components/configuracoes/pix-form";
import { ComissaoModoForm } from "@/components/configuracoes/comissao-modo-form";
import { TaxaServicoForm } from "@/components/configuracoes/taxa-servico-form";
import { CouvertForm } from "@/components/configuracoes/couvert-form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { UnsavedChangesDialog } from "@/components/configuracoes/unsaved-changes-dialog";

type TabId =
  | "identidade"
  | "pagamentos"
  | "taxas"
  | "comissoes"
  | "caixa"
  | "cardapio";

const searchSchema = z.object({
  tab: z
    .enum(["identidade", "pagamentos", "taxas", "comissoes", "caixa", "cardapio"])
    .default("identidade"),
});

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  validateSearch: searchSchema,
  component: Configuracoes,
});

function Configuracoes() {
  const { user } = useAuth();
  const { data: restaurante, isLoading } = useMeuRestaurante(user?.id);
  const atualizar = useAtualizarConfiguracoes(user?.id);
  const validarPix = useValidarPix();
  const { data: garconsAtivos = [] } = useGarcons(restaurante?.id, false);
  const { data: atribuicoesMesas = [] } = useAtribuicoesMesasMulti(
    restaurante?.id,
  );
  const [comissaoFormValido, setComissaoFormValido] = useState(true);
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [abaSalvando, setAbaSalvando] = useState<TabId | null>(null);

  const [form, setForm] = useState({
    nome: "",
    cor_primaria: "#c2410c",
    cor_secundaria: "#1f2937",
    cor_acento: "#f59e0b",
    tema_cardapio: "claro" as "claro" | "escuro",
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
    upsell_habilitado: true,
    taxa_servico_habilitada: false,
    taxa_servico_percentual: "" as string,
    taxa_servico_descricao: "",
    couvert_mesa_habilitado: false,
    couvert_mesa_valor: "" as string,
    couvert_mesa_descricao: "",
    couvert_artistico_habilitado: false,
    couvert_artistico_valor: "" as string,
    couvert_artistico_descricao: "",
    taxa_servico_repasse_habilitado: false,
    taxa_servico_repasse_percentual: "" as string,
    couvert_artistico_repasse_habilitado: false,
    couvert_artistico_repasse_percentual: "" as string,
  });

  const prevSnapshotRef = useRef<typeof form | null>(null);

  useEffect(() => {
    if (!restaurante) return;
    const next: typeof form = {
      nome: restaurante.nome,
      cor_primaria: restaurante.cor_primaria || "#c2410c",
      cor_secundaria: restaurante.cor_secundaria || "#1f2937",
      cor_acento: restaurante.cor_acento || "#f59e0b",
      tema_cardapio:
        restaurante.tema_cardapio === "escuro" ? "escuro" : "claro",
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
      upsell_habilitado: restaurante.upsell_habilitado ?? true,
      taxa_servico_habilitada: restaurante.taxa_servico_habilitada ?? false,
      taxa_servico_percentual:
        restaurante.taxa_servico_percentual != null
          ? String(restaurante.taxa_servico_percentual)
          : "",
      taxa_servico_descricao: restaurante.taxa_servico_descricao ?? "",
      couvert_mesa_habilitado: restaurante.couvert_mesa_habilitado ?? false,
      couvert_mesa_valor:
        restaurante.couvert_mesa_valor != null
          ? String(restaurante.couvert_mesa_valor)
          : "",
      couvert_mesa_descricao: restaurante.couvert_mesa_descricao ?? "",
      couvert_artistico_habilitado:
        restaurante.couvert_artistico_habilitado ?? false,
      couvert_artistico_valor:
        restaurante.couvert_artistico_valor != null
          ? String(restaurante.couvert_artistico_valor)
          : "",
      couvert_artistico_descricao:
        restaurante.couvert_artistico_descricao ?? "",
      taxa_servico_repasse_habilitado:
        restaurante.taxa_servico_repasse_habilitado ?? false,
      taxa_servico_repasse_percentual:
        restaurante.taxa_servico_repasse_percentual != null
          ? String(restaurante.taxa_servico_repasse_percentual)
          : "",
      couvert_artistico_repasse_habilitado:
        restaurante.couvert_artistico_repasse_habilitado ?? false,
      couvert_artistico_repasse_percentual:
        restaurante.couvert_artistico_repasse_percentual != null
          ? String(restaurante.couvert_artistico_repasse_percentual)
          : "",
    };
    const prev = prevSnapshotRef.current;
    if (prev == null) {
      setForm(next);
    } else {
      setForm((curr) => {
        const merged = { ...curr };
        (Object.keys(next) as (keyof typeof form)[]).forEach((k) => {
          // Só sobrescreve campos que NÃO estavam sujos (curr[k] === prev[k]).
          // Campos editados pelo usuário e ainda não salvos são preservados.
          if (curr[k] === prev[k]) {
            (merged[k] as typeof next[typeof k]) = next[k];
          }
        });
        return merged;
      });
    }
    prevSnapshotRef.current = next;
  }, [restaurante]);

  function patch(p: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  const snapshot = useMemo(() => {
    if (!restaurante) return null;
    return {
      nome: restaurante.nome,
      cor_primaria: restaurante.cor_primaria || "#c2410c",
      cor_secundaria: restaurante.cor_secundaria || "#1f2937",
      cor_acento: restaurante.cor_acento || "#f59e0b",
      tema_cardapio:
        restaurante.tema_cardapio === "escuro" ? "escuro" : "claro",
      logo_url: restaurante.logo_url,
      pix_habilitado: restaurante.pix_habilitado,
      pix_chave: restaurante.pix_chave ?? "",
      pix_nome_titular: restaurante.pix_nome_titular ?? "",
      comissao_modo: restaurante.comissao_modo ?? "pedido",
      permitir_atendimento_cruzado: restaurante.permitir_atendimento_cruzado ?? true,
      caixa_alerta_horas: restaurante.caixa_alerta_horas ?? 12,
      caixa_teto_dinheiro:
        restaurante.caixa_teto_dinheiro != null
          ? String(restaurante.caixa_teto_dinheiro)
          : "",
      caixa_conferencia_cega: restaurante.caixa_conferencia_cega ?? false,
      caixa_obrigatorio_para_pagamento:
        restaurante.caixa_obrigatorio_para_pagamento ?? false,
      comissao_rateio_troca_turno: restaurante.comissao_rateio_troca_turno ?? false,
      comissao_pedido_cliente: restaurante.comissao_pedido_cliente ?? true,
      comissao_pedido_cliente_percentual:
        restaurante.comissao_pedido_cliente_percentual != null
          ? String(restaurante.comissao_pedido_cliente_percentual)
          : "",
      upsell_habilitado: restaurante.upsell_habilitado ?? true,
      taxa_servico_habilitada: restaurante.taxa_servico_habilitada ?? false,
      taxa_servico_percentual:
        restaurante.taxa_servico_percentual != null
          ? String(restaurante.taxa_servico_percentual)
          : "",
      taxa_servico_descricao: restaurante.taxa_servico_descricao ?? "",
      couvert_mesa_habilitado: restaurante.couvert_mesa_habilitado ?? false,
      couvert_mesa_valor:
        restaurante.couvert_mesa_valor != null
          ? String(restaurante.couvert_mesa_valor)
          : "",
      couvert_mesa_descricao: restaurante.couvert_mesa_descricao ?? "",
      couvert_artistico_habilitado: restaurante.couvert_artistico_habilitado ?? false,
      couvert_artistico_valor:
        restaurante.couvert_artistico_valor != null
          ? String(restaurante.couvert_artistico_valor)
          : "",
      couvert_artistico_descricao: restaurante.couvert_artistico_descricao ?? "",
      taxa_servico_repasse_habilitado:
        restaurante.taxa_servico_repasse_habilitado ?? false,
      taxa_servico_repasse_percentual:
        restaurante.taxa_servico_repasse_percentual != null
          ? String(restaurante.taxa_servico_repasse_percentual)
          : "",
      couvert_artistico_repasse_habilitado:
        restaurante.couvert_artistico_repasse_habilitado ?? false,
      couvert_artistico_repasse_percentual:
        restaurante.couvert_artistico_repasse_percentual != null
          ? String(restaurante.couvert_artistico_repasse_percentual)
          : "",
    } as typeof form;
  }, [restaurante]);

  const CAMPOS_POR_ABA: Record<TabId, (keyof typeof form)[]> = {
    identidade: [
      "nome",
      "cor_primaria",
      "cor_secundaria",
      "cor_acento",
      "tema_cardapio",
      "logo_url",
    ],
    pagamentos: ["pix_habilitado", "pix_chave", "pix_nome_titular"],
    taxas: [
      "taxa_servico_habilitada",
      "taxa_servico_percentual",
      "taxa_servico_descricao",
      "taxa_servico_repasse_habilitado",
      "taxa_servico_repasse_percentual",
      "couvert_mesa_habilitado",
      "couvert_mesa_valor",
      "couvert_mesa_descricao",
      "couvert_artistico_habilitado",
      "couvert_artistico_valor",
      "couvert_artistico_descricao",
      "couvert_artistico_repasse_habilitado",
      "couvert_artistico_repasse_percentual",
    ],
    comissoes: [
      "comissao_modo",
      "comissao_rateio_troca_turno",
      "comissao_pedido_cliente",
      "comissao_pedido_cliente_percentual",
      "permitir_atendimento_cruzado",
    ],
    caixa: [
      "caixa_alerta_horas",
      "caixa_teto_dinheiro",
      "caixa_conferencia_cega",
      "caixa_obrigatorio_para_pagamento",
    ],
    cardapio: ["upsell_habilitado"],
  };

  const abasSujas = useMemo(() => {
    const r: Record<TabId, boolean> = {
      identidade: false,
      pagamentos: false,
      taxas: false,
      comissoes: false,
      caixa: false,
      cardapio: false,
    };
    if (!snapshot) return r;
    (Object.keys(CAMPOS_POR_ABA) as TabId[]).forEach((aba) => {
      r[aba] = CAMPOS_POR_ABA[aba].some((k) => form[k] !== snapshot[k]);
    });
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, snapshot]);

  const isDirty = Object.values(abasSujas).some(Boolean);
  const guard = useUnsavedChangesGuard({ isDirty });

  const semGarcons = garconsAtivos.length === 0;
  const todosGarconsZerados =
    garconsAtivos.length > 0 &&
    garconsAtivos.every((g) => Number(g.percentual_comissao ?? 0) === 0) &&
    form.comissao_pedido_cliente_percentual.trim() === "";
  const mesasSemGarcom = atribuicoesMesas.filter(
    (a) => a.garcons.length === 0,
  ).length;

  async function salvar(aba: TabId, overrides?: Partial<typeof form>) {
    if (!restaurante) return;
    const f = overrides ? { ...form, ...overrides } : form;

    // Validações por aba
    if (aba === "identidade") {
      if (f.nome.trim().length < 2) {
        toast.error("Nome muito curto");
        return;
      }
    }
    if (aba === "pagamentos") {
      try {
        await validarPix.mutateAsync({
          pix_habilitado: f.pix_habilitado,
          pix_chave: f.pix_chave.trim() || null,
          pix_nome_titular: f.pix_nome_titular.trim() || null,
        });
      } catch (e: any) {
        toast.error(e?.message ?? "PIX inválido");
        return;
      }
    }

    function parseNumOrNull(raw: string, max: number, label: string): number | null | "ERR" {
      const t = raw.trim();
      if (t === "") return null;
      const n = Number(t.replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > max) {
        toast.error(`${label} inválido (0–${max})`);
        return "ERR";
      }
      return n;
    }

    let payload: Parameters<typeof atualizar.mutateAsync>[0] | null = null;

    if (aba === "identidade") {
      payload = {
        aba: "identidade",
        restauranteId: restaurante.id,
        nome: f.nome.trim(),
        cor_primaria: f.cor_primaria,
        cor_secundaria: f.cor_secundaria,
        cor_acento: f.cor_acento,
        tema_cardapio: f.tema_cardapio,
        logo_url: f.logo_url,
      };
    } else if (aba === "pagamentos") {
      payload = {
        aba: "pagamentos",
        restauranteId: restaurante.id,
        pix_habilitado: f.pix_habilitado,
        pix_chave: f.pix_chave.trim() || null,
        pix_nome_titular: f.pix_nome_titular.trim() || null,
      };
    } else if (aba === "taxas") {
      const r1 = parseNumOrNull(f.taxa_servico_percentual, 30, "Taxa de serviço (%)");
      if (r1 === "ERR") return;
      const r2 = parseNumOrNull(f.couvert_mesa_valor, 1000, "Couvert de mesa (R$)");
      if (r2 === "ERR") return;
      const r3 = parseNumOrNull(f.couvert_artistico_valor, 1000, "Couvert artístico (R$)");
      if (r3 === "ERR") return;
      const r4 = parseNumOrNull(f.taxa_servico_repasse_percentual, 100, "Repasse aos garçons (%)");
      if (r4 === "ERR") return;
      const r5 = parseNumOrNull(f.couvert_artistico_repasse_percentual, 100, "Repasse aos artistas (%)");
      if (r5 === "ERR") return;

      if (f.taxa_servico_habilitada && (r1 == null || r1 <= 0)) {
        toast.error("Informe o percentual da taxa de serviço.");
        return;
      }
      if (f.couvert_mesa_habilitado && (r2 == null || r2 <= 0)) {
        toast.error("Informe o valor do couvert de mesa.");
        return;
      }
      if (f.couvert_artistico_habilitado && (r3 == null || r3 <= 0)) {
        toast.error("Informe o valor por pessoa do couvert artístico.");
        return;
      }
      if (
        f.taxa_servico_habilitada &&
        f.taxa_servico_repasse_habilitado &&
        (r4 == null || r4 <= 0)
      ) {
        toast.error("Informe o percentual de repasse aos garçons.");
        return;
      }
      if (
        f.couvert_artistico_habilitado &&
        f.couvert_artistico_repasse_habilitado &&
        (r5 == null || r5 <= 0)
      ) {
        toast.error("Informe o percentual de repasse aos artistas.");
        return;
      }

      payload = {
        aba: "taxas",
        restauranteId: restaurante.id,
        taxa_servico_habilitada: f.taxa_servico_habilitada,
        taxa_servico_percentual: r1,
        taxa_servico_descricao: f.taxa_servico_descricao.trim() || null,
        taxa_servico_repasse_habilitado:
          f.taxa_servico_habilitada && f.taxa_servico_repasse_habilitado,
        taxa_servico_repasse_percentual: f.taxa_servico_habilitada ? r4 : null,
        couvert_mesa_habilitado: f.couvert_mesa_habilitado,
        couvert_mesa_valor: r2,
        couvert_mesa_descricao: f.couvert_mesa_descricao.trim() || null,
        couvert_artistico_habilitado: f.couvert_artistico_habilitado,
        couvert_artistico_valor: r3,
        couvert_artistico_descricao: f.couvert_artistico_descricao.trim() || null,
        couvert_artistico_repasse_habilitado:
          f.couvert_artistico_habilitado && f.couvert_artistico_repasse_habilitado,
        couvert_artistico_repasse_percentual: f.couvert_artistico_habilitado ? r5 : null,
      };
    } else if (aba === "comissoes") {
      if (!comissaoFormValido) {
        toast.error("Verifique os campos de comissões.");
        return;
      }
      let percClienteNum: number | null = null;
      const percCliente = f.comissao_pedido_cliente_percentual.trim();
      if (percCliente !== "") {
        const n = Number(percCliente.replace(",", "."));
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          toast.error("Percentual de pedido do cliente deve estar entre 0 e 100");
          return;
        }
        percClienteNum = n;
      }
      payload = {
        aba: "comissoes",
        restauranteId: restaurante.id,
        comissao_modo: f.comissao_modo,
        comissao_rateio_troca_turno: f.comissao_rateio_troca_turno,
        comissao_pedido_cliente: f.comissao_pedido_cliente,
        comissao_pedido_cliente_percentual: percClienteNum,
        permitir_atendimento_cruzado: f.permitir_atendimento_cruzado,
      };
    } else if (aba === "caixa") {
      payload = {
        aba: "caixa",
        restauranteId: restaurante.id,
        caixa_alerta_horas: Math.min(
          72,
          Math.max(1, Math.round(Number(f.caixa_alerta_horas) || 12)),
        ),
        caixa_teto_dinheiro:
          f.caixa_teto_dinheiro.trim() === ""
            ? null
            : Math.max(0, Number(f.caixa_teto_dinheiro.replace(",", "."))),
        caixa_conferencia_cega: f.caixa_conferencia_cega,
        caixa_obrigatorio_para_pagamento: f.caixa_obrigatorio_para_pagamento,
      };
    } else if (aba === "cardapio") {
      payload = {
        aba: "cardapio",
        restauranteId: restaurante.id,
        upsell_habilitado: f.upsell_habilitado,
      };
    }

    if (!payload) return;

    setAbaSalvando(aba);
    try {
      await atualizar.mutateAsync(payload);
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setAbaSalvando(null);
    }
  }

  if (isLoading || !restaurante) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const SaveBtn = ({ aba }: { aba: TabId }) => (
    <div className="flex justify-end">
      <Button
        onClick={() => salvar(aba)}
        disabled={
          abaSalvando === aba ||
          (aba === "comissoes" && !comissaoFormValido)
        }
        className="h-11 px-6"
      >
        {abaSalvando === aba && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar alterações
      </Button>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <UnsavedChangesDialog
        open={guard.status === "blocked"}
        onCancel={() => guard.reset?.()}
        onDiscard={() => {
          if (snapshot) {
            setForm(snapshot);
            prevSnapshotRef.current = snapshot;
          }
          guard.proceed?.();
        }}
      />
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize as informações do seu restaurante.
        </p>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => navigate({ search: { tab: v as TabId } })}
      >
        <TabsList className="flex w-full flex-wrap justify-start gap-1">
          {(
            [
              ["identidade", "Identidade"],
              ["pagamentos", "Pagamentos"],
              ["taxas", "Taxas e couverts"],
              ["comissoes", "Comissões"],
              ["caixa", "Caixa"],
              ["cardapio", "Cardápio"],
            ] as [TabId, string][]
          ).map(([id, label]) => (
            <TabsTrigger key={id} value={id}>
              {label}
              {abasSujas[id] && (
                <span
                  className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary"
                  aria-label="alterações não salvas"
                />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="identidade" className="space-y-6">
          <IdentidadeForm
            restauranteId={restaurante.id}
            nome={form.nome}
            corPrimaria={form.cor_primaria}
            corSecundaria={form.cor_secundaria}
            corAcento={form.cor_acento}
            tema={form.tema_cardapio}
            logoUrl={form.logo_url}
            onChange={patch}
          />
          <SaveBtn aba="identidade" />
        </TabsContent>

        <TabsContent value="pagamentos" className="space-y-6">
          <PixForm
            habilitado={form.pix_habilitado}
            chave={form.pix_chave}
            titular={form.pix_nome_titular}
            onChange={patch}
          />
          <SaveBtn aba="pagamentos" />
        </TabsContent>

        <TabsContent value="taxas" className="space-y-6">
          <TaxaServicoForm
            habilitada={form.taxa_servico_habilitada}
            percentual={form.taxa_servico_percentual}
            descricao={form.taxa_servico_descricao}
            repasseHabilitado={form.taxa_servico_repasse_habilitado}
            repassePercentual={form.taxa_servico_repasse_percentual}
            onChange={patch}
          />
          <CouvertForm
            mesaHabilitado={form.couvert_mesa_habilitado}
            mesaValor={form.couvert_mesa_valor}
            mesaDescricao={form.couvert_mesa_descricao}
            artisticoHabilitado={form.couvert_artistico_habilitado}
            artisticoValor={form.couvert_artistico_valor}
            artisticoDescricao={form.couvert_artistico_descricao}
            repasseHabilitado={form.couvert_artistico_repasse_habilitado}
            repassePercentual={form.couvert_artistico_repasse_percentual}
            onChange={patch}
          />
          <SaveBtn aba="taxas" />
        </TabsContent>

        <TabsContent value="comissoes" className="space-y-6">
          <ComissaoModoForm
            modo={form.comissao_modo}
            rateioTrocaTurno={form.comissao_rateio_troca_turno}
            pagarPedidoCliente={form.comissao_pedido_cliente}
            percentualPedidoCliente={form.comissao_pedido_cliente_percentual}
            onChange={patch}
            semGarcons={semGarcons}
            todosGarconsZerados={todosGarconsZerados}
            mesasSemGarcom={mesasSemGarcom}
            onValidityChange={setComissaoFormValido}
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
          <SaveBtn aba="comissoes" />
        </TabsContent>

        <TabsContent value="caixa" className="space-y-6">
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
          <SaveBtn aba="caixa" />
        </TabsContent>

        <TabsContent value="cardapio" className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold">
                  Sugerir acompanhamentos no carrinho
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mostra ao cliente, no carrinho, até 3 sugestões de itens para
                  complementar o pedido. Desligue se preferir não exibir as
                  recomendações. Alterações são salvas automaticamente.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Os itens sugeridos são os produtos marcados com{" "}
                  <strong className="font-medium text-foreground">
                    "Sugerir no carrinho (upsell)"
                  </strong>{" "}
                  no cadastro do produto (aba{" "}
                  <strong className="font-medium text-foreground">Cardápio</strong>{" "}
                  → editar produto). Sem itens marcados, o bloco de sugestões
                  não será exibido no carrinho.
                </p>
              </div>
              <Switch
                checked={form.upsell_habilitado}
                disabled={abaSalvando === "cardapio"}
                onCheckedChange={(v) => {
                  patch({ upsell_habilitado: v });
                  salvar("cardapio", { upsell_habilitado: v });
                }}
                aria-label="Sugerir acompanhamentos no carrinho"
              />
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
