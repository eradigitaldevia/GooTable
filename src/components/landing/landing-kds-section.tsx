import { Split, Printer, BellRing, Timer } from "lucide-react";
import { LandingSection } from "./landing-section";

export function LandingKdsSection() {
  return (
    <LandingSection
      id="kds"
      eyebrow="KDS & Produção"
      title="Cozinha e bar em tempo real"
      desc="Cada item chega na tela certa, na hora certa."
      itens={[
        { icon: Split, title: "Roteamento automático", desc: "Itens enviados automaticamente para a tela da cozinha ou do bar." },
        { icon: Printer, title: "Impressão automática", desc: "Comanda de produção impressa assim que o pedido chega (opcional)." },
        { icon: BellRing, title: "Sinalização sonora", desc: "Alerta sonoro a cada novo pedido para a equipe não perder nada." },
        { icon: Timer, title: "Tempo de preparo", desc: "Controle visual do tempo de cada pedido para evitar atrasos." },
      ]}
    />
  );
}
