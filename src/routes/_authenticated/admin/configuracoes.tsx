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
import { GeralForm } from "@/components/configuracoes/geral-form";
import {
  diasPadrao,
  normalizarHorario,
} from "@/components/configuracoes/horario-funcionamento-form";
import type { HorarioFuncionamento } from "@/lib/configuracoes.functions";
import { PixForm } from "@/components/configuracoes/pix-form";
import { ComissaoModoForm } from "@/components/configuracoes/comissao-modo-form";
import { TaxaServicoForm } from "@/components/configuracoes/taxa-servico-form";
import { CouvertMesaForm } from "@/components/configuracoes/couvert-form";
import { DeliveryForm } from "@/components/configuracoes/delivery-form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { UnsavedChangesDialog } from "@/components/configuracoes/unsaved-changes-dialog";

type TabId =
  | "geral"
  | "identidade"
  | "pagamentos"
  | "taxas"
  | "comissoes"
  | "caixa"
  | "cardapio"
  | "delivery";

const searchSchema = z.object({
  tab: z
    .enum(["geral", "identidade", "pagamentos", "taxas", "comissoes", "caixa", "cardapio", "delivery"])
    .default("geral"),
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
    cnpj: "",
    telefone: "",
    endereco: "",
    horario_funcionamento_habilitado: false,
    horario_funcionamento: diasPadrao() as HorarioFuncionamento,
    url_publica_cardapio: "" as string,
    sessao_ociosa_horas: 4,
    pix_habilitado: false,
    pix_chave: "",
    pix_nome_titular: "",
    comissao_modo: "pedido" as "pedido" | "item",
    comissao_ativa: true,
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
    taxa_servico_repasse_habilitado: false,
    taxa_servico_repasse_percentual: "" as string,
    delivery_ativo: false,
    delivery_retirada_ativa: true,
    delivery_slug: "" as string,
    delivery_taxa_entrega: "" as string,
    delivery_pedido_minimo: "" as string,
    delivery_tempo_estimado_min: "45" as string,
    delivery_raio_km: "" as string,
    delivery_aceita_dinheiro: true,
    delivery_aceita_cartao_entrega: true,
    delivery_aceita_pix: true,
  });

  const prevSnapshotRef = useRef<typeof form | null>(null);

  useEffect(() => {
    if (!restaurante) return;
    const horarioRaw = ((restaurante as any).horario_funcionamento ?? []) as HorarioFuncionamento;
    const horarioHabilitado = Array.isArray(horarioRaw) && horarioRaw.length > 0;
    const next: typeof form = {
      nome: restaurante.nome,
      cor_primaria: restaurante.cor_primaria || "#c2410c",
      cor_secundaria: restaurante.cor_secundaria || "#1f2937",
      cor_acento: restaurante.cor_acento || "#f59e0b",
      tema_cardapio:
        restaurante.tema_cardapio === "escuro" ? "escuro" : "claro",
      logo_url: restaurante.logo_url,
      cnpj: (restaurante as any).cnpj ?? "",
      telefone: (restaurante as any).telefone ?? "",
      endereco: (restaurante as any).endereco ?? "",
      horario_funcionamento_habilitado: horarioHabilitado,
      horario_funcionamento: horarioHabilitado
        ? normalizarHorario(horarioRaw)
        : diasPadrao(),
      url_publica_cardapio: (restaurante as any).url_publica_cardapio ?? "",
      sessao_ociosa_horas: (restaurante as any).sessao_ociosa_horas ?? 4,
      pix_habilitado: restaurante.pix_habilitado,
      pix_chave: restaurante.pix_chave ?? "",
      pix_nome_titular: restaurante.pix_nome_titular ?? "",
      comissao_modo: restaurante.comissao_modo ?? "pedido",
      comissao_ativa: (restaurante as any).comissao_ativa ?? true,
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
      taxa_servico_repasse_habilitado:
        restaurante.taxa_servico_repasse_habilitado ?? false,
      taxa_servico_repasse_percentual:
        restaurante.taxa_servico_repasse_percentual != null
          ? String(restaurante.taxa_servico_repasse_percentual)
          : "",
      delivery_ativo: (restaurante as any).delivery_ativo ?? false,
      delivery_retirada_ativa: (restaurante as any).delivery_retirada_ativa ?? true,
      delivery_slug: (restaurante as any).delivery_slug ?? "",
      delivery_taxa_entrega:
        (restaurante as any).delivery_taxa_entrega != null
          ? String((restaurante as any).delivery_taxa_entrega)
          : "",
      delivery_pedido_minimo:
        (restaurante as any).delivery_pedido_minimo != null
          ? String((restaurante as any).delivery_pedido_minimo)
          : "",
      delivery_tempo_estimado_min:
        (restaurante as any).delivery_tempo_estimado_min != null
          ? String((restaurante as any).delivery_tempo_estimado_min)
          : "45",
      delivery_raio_km:
        (restaurante as any).delivery_raio_km != null
          ? String((restaurante as any).delivery_raio_km)
          : "",
      delivery_aceita_dinheiro: (restaurante as any).delivery_aceita_dinheiro ?? true,
      delivery_aceita_cartao_entrega:
        (restaurante as any).delivery_aceita_cartao_entrega ?? true,
      delivery_aceita_pix: (restaurante as any).delivery_aceita_pix ?? true,
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
    const horarioRaw = ((restaurante as any).horario_funcionamento ?? []) as HorarioFuncionamento;
    const horarioHabilitado = Array.isArray(horarioRaw) && horarioRaw.length > 0;
    return {
      nome: restaurante.nome,
      cor_primaria: restaurante.cor_primaria || "#c2410c",
      cor_secundaria: restaurante.cor_secundaria || "#1f2937",
      cor_acento: restaurante.cor_acento || "#f59e0b",
      tema_cardapio:
        restaurante.tema_cardapio === "escuro" ? "escuro" : "claro",
      logo_url: restaurante.logo_url,
      cnpj: (restaurante as any).cnpj ?? "",
      telefone: (restaurante as any).telefone ?? "",
      endereco: (restaurante as any).endereco ?? "",
      horario_funcionamento_habilitado: horarioHabilitado,
      horario_funcionamento: horarioHabilitado
        ? normalizarHorario(horarioRaw)
        : diasPadrao(),
      url_publica_cardapio: (restaurante as any).url_publica_cardapio ?? "",
      sessao_ociosa_horas: (restaurante as any).sessao_ociosa_horas ?? 4,
      pix_habilitado: restaurante.pix_habilitado,
      pix_chave: restaurante.pix_chave ?? "",
      pix_nome_titular: restaurante.pix_nome_titular ?? "",
      comissao_modo: restaurante.comissao_modo ?? "pedido",
      comissao_ativa: (restaurante as any).comissao_ativa ?? true,
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
      taxa_servico_repasse_habilitado:
        restaurante.taxa_servico_repasse_habilitado ?? false,
      taxa_servico_repasse_percentual:
        restaurante.taxa_servico_repasse_percentual != null
          ? String(restaurante.taxa_servico_repasse_percentual)
          : "",
      delivery_ativo: (restaurante as any).delivery_ativo ?? false,
      delivery_retirada_ativa: (restaurante as any).delivery_retirada_ativa ?? true,
      delivery_slug: (restaurante as any).delivery_slug ?? "",
      delivery_taxa_entrega:
        (restaurante as any).delivery_taxa_entrega != null
          ? String((restaurante as any).delivery_taxa_entrega)
          : "",
      delivery_pedido_minimo:
        (restaurante as any).delivery_pedido_minimo != null
          ? String((restaurante as any).delivery_pedido_minimo)
          : "",
      delivery_tempo_estimado_min:
        (restaurante as any).delivery_tempo_estimado_min != null
          ? String((restaurante as any).delivery_tempo_estimado_min)
          : "45",
      delivery_raio_km:
        (restaurante as any).delivery_raio_km != null
          ? String((restaurante as any).delivery_raio_km)
          : "",
      delivery_aceita_dinheiro: (restaurante as any).delivery_aceita_dinheiro ?? true,
      delivery_aceita_cartao_entrega:
        (restaurante as any).delivery_aceita_cartao_entrega ?? true,
      delivery_aceita_pix: (restaurante as any).delivery_aceita_pix ?? true,
    } as typeof form;
  }, [restaurante]);

  const CAMPOS_POR_ABA: Record<TabId, (keyof typeof form)[]> = {
    geral: [
      "nome",
      "cnpj",
      "telefone",
      "endereco",
      "horario_funcionamento_habilitado",
      "horario_funcionamento",
      "url_publica_cardapio",
      "sessao_ociosa_horas",
    ],
    identidade: [
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
    ],
    comissoes: [
      "comissao_ativa",
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
    delivery: [
      "delivery_ativo",
      "delivery_retirada_ativa",
      "delivery_slug",
      "delivery_taxa_entrega",
      "delivery_pedido_minimo",
      "delivery_tempo_estimado_min",
      "delivery_raio_km",
      "delivery_aceita_dinheiro",
      "delivery_aceita_cartao_entrega",
      "delivery_aceita_pix",
    ],
  };

  const abasSujas = useMemo(() => {
    const r: Record<TabId, boolean> = {
      geral: false,
      identidade: false,
      pagamentos: false,
      taxas: false,
      comissoes: false,
      caixa: false,
      cardapio: false,
      delivery: false,
    };
    if (!snapshot) return r;
    (Object.keys(CAMPOS_POR_ABA) as TabId[]).forEach((aba) => {
      r[aba] = CAMPOS_POR_ABA[aba].some((k) => {
        const a = form[k];
        const b = snapshot[k];
        if (typeof a === "object" && a !== null) {
          return JSON.stringify(a) !== JSON.stringify(b);
        }
        return a !== b;
      });
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
    if (aba === "geral") {
      if (f.nome.trim().length < 2) {
        toast.error("Nome muito curto");
        return;
      }
      if (f.horario_funcionamento_habilitado) {
        for (const d of f.horario_funcionamento) {
          if (!d.aberto) continue;
          for (const t of d.turnos) {
            if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t.inicio) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(t.fim)) {
              toast.error("Horário inválido em algum dia.");
              return;
            }
            if (t.inicio === t.fim) {
              toast.error("Início e fim do turno devem ser diferentes.");
              return;
            }
          }
        }
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

    if (aba === "geral") {
      payload = {
        aba: "geral",
        restauranteId: restaurante.id,
        nome: f.nome.trim(),
        cnpj: f.cnpj.trim() || null,
        telefone: f.telefone.trim() || null,
        endereco: f.endereco.trim() || null,
        horario_funcionamento: f.horario_funcionamento_habilitado
          ? f.horario_funcionamento
          : [],
        url_publica_cardapio: f.url_publica_cardapio.trim() || null,
        sessao_ociosa_horas: f.sessao_ociosa_horas,
      };
    } else if (aba === "identidade") {
      payload = {
        aba: "identidade",
        restauranteId: restaurante.id,
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
      const r4 = parseNumOrNull(f.taxa_servico_repasse_percentual, 100, "Repasse aos garçons (%)");
      if (r4 === "ERR") return;

      if (f.taxa_servico_habilitada && (r1 == null || r1 <= 0)) {
        toast.error("Informe o percentual da taxa de serviço.");
        return;
      }
      if (f.couvert_mesa_habilitado && (r2 == null || r2 <= 0)) {
        toast.error("Informe o valor do couvert de mesa.");
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
      };
    } else if (aba === "comissoes") {
      if (f.comissao_ativa && !comissaoFormValido) {
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
        comissao_ativa: f.comissao_ativa,
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
    } else if (aba === "delivery") {
      function parseNum(raw: string, max: number, label: string, integer = false): number | "ERR" {
        const t = raw.trim();
        if (t === "") return 0;
        const n = integer ? parseInt(t, 10) : Number(t.replace(",", "."));
        if (!Number.isFinite(n) || n < 0 || n > max) {
          toast.error(`${label} inválido (0–${max})`);
          return "ERR";
        }
        return n;
      }
      const taxa = parseNum(f.delivery_taxa_entrega, 500, "Taxa de entrega");
      if (taxa === "ERR") return;
      const minimo = parseNum(f.delivery_pedido_minimo, 10000, "Pedido mínimo");
      if (minimo === "ERR") return;
      const tempo = parseNum(f.delivery_tempo_estimado_min, 600, "Tempo estimado", true);
      if (tempo === "ERR") return;
      let raio: number | null = null;
      if (f.delivery_raio_km.trim() !== "") {
        const r = parseNum(f.delivery_raio_km, 200, "Raio");
        if (r === "ERR") return;
        raio = r;
      }
      const slug = f.delivery_slug.trim() || null;
      if (f.delivery_ativo && !slug) {
        toast.error("Informe o endereço público (slug) para ativar o delivery.");
        return;
      }
      if (slug && !/^[a-z0-9-]{2,80}$/i.test(slug)) {
        toast.error("Slug inválido. Use letras, números e hífen (2–80).");
        return;
      }
      if (
        f.delivery_ativo &&
        !f.delivery_aceita_dinheiro &&
        !f.delivery_aceita_cartao_entrega &&
        !f.delivery_aceita_pix
      ) {
        toast.error("Habilite ao menos uma forma de pagamento.");
        return;
      }
      payload = {
        aba: "delivery",
        restauranteId: restaurante.id,
        delivery_ativo: f.delivery_ativo,
        delivery_retirada_ativa: f.delivery_retirada_ativa,
        delivery_slug: slug,
        delivery_taxa_entrega: taxa,
        delivery_pedido_minimo: minimo,
        delivery_tempo_estimado_min: tempo,
        delivery_raio_km: raio,
        delivery_aceita_dinheiro: f.delivery_aceita_dinheiro,
        delivery_aceita_cartao_entrega: f.delivery_aceita_cartao_entrega,
        delivery_aceita_pix: f.delivery_aceita_pix,
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
          (aba === "comissoes" && form.comissao_ativa && !comissaoFormValido)
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
        onValueChange={(v) => navigate({ to: ".", search: { tab: v as TabId }, replace: true })}
        className="space-y-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:justify-start">
          {(
            [
              ["geral", "Geral"],
              ["identidade", "Identidade"],
              ["pagamentos", "Pagamentos"],
              ["taxas", "Taxa e couvert"],
              ["comissoes", "Comissões"],
              ["caixa", "Caixa"],
              ["cardapio", "Cardápio"],
              ["delivery", "Delivery"],
            ] as [TabId, string][]
          ).map(([id, label]) => (
            <TabsTrigger key={id} value={id} className="w-full sm:w-auto">
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

        <TabsContent value="geral" className="space-y-6">
          <GeralForm
            nome={form.nome}
            cnpj={form.cnpj}
            telefone={form.telefone}
            endereco={form.endereco}
            horarioHabilitado={form.horario_funcionamento_habilitado}
            horario={form.horario_funcionamento}
            urlPublicaCardapio={form.url_publica_cardapio}
            sessaoOciosaHoras={form.sessao_ociosa_horas}
            onChange={patch}
          />
          <SaveBtn aba="geral" />
        </TabsContent>

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
          <CouvertMesaForm
            mesaHabilitado={form.couvert_mesa_habilitado}
            mesaValor={form.couvert_mesa_valor}
            mesaDescricao={form.couvert_mesa_descricao}
            onChange={patch}
          />
          <SaveBtn aba="taxas" />
        </TabsContent>

        <TabsContent value="comissoes" className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold">
                  Pagar comissão a garçons
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quando ligado, novos pedidos entregues geram comissão conforme
                  as regras abaixo. Quando desligado, novos pedidos entregues
                  deixam de gerar comissão. Comissões já lançadas no histórico
                  são preservadas.
                </p>
              </div>
              <Switch
                checked={form.comissao_ativa}
                onCheckedChange={(v) => patch({ comissao_ativa: v })}
                aria-label="Pagar comissão a garçons"
              />
            </div>
          </section>
          {form.comissao_ativa && (
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
          )}
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

        <TabsContent value="delivery" className="space-y-6">
          <DeliveryForm
            values={{
              delivery_ativo: form.delivery_ativo,
              delivery_retirada_ativa: form.delivery_retirada_ativa,
              delivery_slug: form.delivery_slug,
              delivery_taxa_entrega: form.delivery_taxa_entrega,
              delivery_pedido_minimo: form.delivery_pedido_minimo,
              delivery_tempo_estimado_min: form.delivery_tempo_estimado_min,
              delivery_raio_km: form.delivery_raio_km,
              delivery_aceita_dinheiro: form.delivery_aceita_dinheiro,
              delivery_aceita_cartao_entrega: form.delivery_aceita_cartao_entrega,
              delivery_aceita_pix: form.delivery_aceita_pix,
            }}
            onChange={patch}
          />
          <SaveBtn aba="delivery" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
