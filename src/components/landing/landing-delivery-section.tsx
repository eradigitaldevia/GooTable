import { Bike, Instagram, Clock, Wallet } from "lucide-react";
import { LandingSection } from "./landing-section";

export function LandingDeliverySection() {
  return (
    <LandingSection
      id="delivery"
      alt
      eyebrow="Delivery Próprio"
      title="Delivery próprio com zero comissões"
      desc="Venda direto para o seu cliente, sem intermediários que cobram de 20% a 27% por pedido."
      itens={[
        { icon: Instagram, title: "Canal direto", desc: "Link próprio para divulgar no Instagram e no WhatsApp." },
        { icon: Bike, title: "Taxa de entrega", desc: "Taxa de entrega configurável pelo restaurante." },
        { icon: Clock, title: "Horário de funcionamento", desc: "Pedidos aceitos apenas dentro do horário configurado." },
        { icon: Wallet, title: "PIX instantâneo", desc: "Receba os pedidos de delivery via PIX." },
      ]}
    />
  );
}
