import { QrCode, Users, HandPlatter, Printer } from "lucide-react";
import { LandingSection } from "./landing-section";

export function LandingSalaoSection() {
  return (
    <LandingSection
      id="salao"
      eyebrow="Salão & Mesas"
      title="Atendimento inteligente no salão"
      desc="O cliente pede pelo celular e a equipe acompanha cada mesa em tempo real."
      itens={[
        { icon: QrCode, title: "QR Code por mesa", desc: "O cliente pede do próprio smartphone, sem instalar aplicativo." },
        { icon: Users, title: "Divisão de contas", desc: "Comandas individuais identificadas por nome para agilizar o pagamento." },
        { icon: HandPlatter, title: "Área do Garçom", desc: "Atendimento cruzado, liberação de mesas e comissão configurável." },
        { icon: Printer, title: "Fechamento de conta", desc: "Impressão térmica da conta e múltiplos meios de pagamento (PIX, dinheiro, cartão)." },
      ]}
    />
  );
}
