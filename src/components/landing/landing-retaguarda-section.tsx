import { PackageMinus, ListTree, ShieldAlert, ClipboardCheck, LineChart, Receipt, Landmark, ArrowLeftRight } from "lucide-react";
import { LandingSection } from "./landing-section";

export function LandingRetaguardaSection() {
  return (
    <>
      <LandingSection
        id="estoque"
        alt
        eyebrow="Estoque & Fichas Técnicas"
        title="Controle de estoque e ficha técnica"
        desc="Saiba exatamente quanto de cada insumo foi usado em cada venda."
        itens={[
          { icon: PackageMinus, title: "Baixa automática", desc: "Insumos descontados ao confirmar o pedido e estornados em cancelamentos." },
          { icon: ListTree, title: "Fichas técnicas", desc: "Fichas simples e compostas, com preparos intermediários." },
          { icon: ShieldAlert, title: "Ruptura controlada", desc: "Escolha alertar ou bloquear vendas quando um insumo acabar." },
          { icon: ClipboardCheck, title: "Inventário físico", desc: "Conferência e ajuste rápido das diferenças de estoque." },
        ]}
      />
      <LandingSection
        id="financeiro"
        eyebrow="Financeiro & DRE"
        title="Gestão financeira completa"
        desc="Os números do restaurante organizados, sem planilhas."
        itens={[
          { icon: LineChart, title: "DRE gerencial", desc: "Resultado do período gerado automaticamente." },
          { icon: ArrowLeftRight, title: "Fluxo de caixa", desc: "Previsto x realizado para planejar com segurança." },
          { icon: Receipt, title: "Contas a pagar e receber", desc: "Controle de vencimentos, categorias e fornecedores." },
          { icon: Landmark, title: "Integração com o caixa", desc: "Fechamentos de caixa e repasses entram no financeiro." },
        ]}
      />
    </>
  );
}
