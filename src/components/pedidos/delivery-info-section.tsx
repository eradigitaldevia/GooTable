import { Button } from "@/components/ui/button";
import { MapPin, Phone, MessageCircle, Copy, Share2, Bike, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

interface DeliveryPedido {
  id: string;
  canal?: string | null;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  endereco_cep?: string | null;
  distancia_km?: number | null;
  endereco_rua?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_uf?: string | null;
  endereco_referencia?: string | null;
}

function formatarEndereco(p: DeliveryPedido): string {
  const linha1 = [p.endereco_rua, p.endereco_numero].filter(Boolean).join(", ");
  const linha2 = [p.endereco_bairro, [p.endereco_cidade, p.endereco_uf].filter(Boolean).join("/")]
    .filter(Boolean)
    .join(" — ");
  return [linha1, p.endereco_complemento, linha2, p.endereco_cep, p.endereco_referencia]
    .filter(Boolean)
    .join("\n");
}

function digitsOnly(s?: string | null) {
  return (s ?? "").replace(/\D/g, "");
}

export function DeliveryInfoSection({
  pedido,
  deliverySlug,
}: {
  pedido: DeliveryPedido;
  deliverySlug?: string | null;
}) {
  const canal = pedido.canal;
  if (canal !== "delivery" && canal !== "retirada") return null;

  const isDelivery = canal === "delivery";
  const enderecoTexto = isDelivery ? formatarEndereco(pedido) : "";
  const tel = pedido.cliente_telefone ?? "";
  const telDigits = digitsOnly(tel);

  const handleCopiarEndereco = async () => {
    try {
      await navigator.clipboard.writeText(enderecoTexto);
      toast.success("Endereço copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleNotificarRetirada = async () => {
    if (!deliverySlug) {
      toast.error("Slug de delivery não disponível");
      return;
    }
    const url = `${window.location.origin}/delivery/${deliverySlug}/pedido/${pedido.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link de rastreio copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  const whatsappHref = telDigits
    ? `https://wa.me/55${telDigits}?text=${encodeURIComponent(
        `Olá ${pedido.cliente_nome ?? ""}, sobre seu pedido #${pedido.id.slice(0, 8)}`,
      )}`
    : null;

  return (
    <div className="space-y-2 rounded-xl border bg-accent/40 p-3 text-sm">
      <div className="flex items-center gap-2 font-semibold">
        {isDelivery ? <Bike className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
        {isDelivery ? "Entrega" : "Retirada"}
      </div>
      {pedido.cliente_nome && (
        <div className="text-muted-foreground">{pedido.cliente_nome}</div>
      )}
      {tel && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Phone className="h-3.5 w-3.5" />
          {tel}
        </div>
      )}
      {isDelivery && enderecoTexto && (
        <div className="flex items-start gap-1 whitespace-pre-line text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{enderecoTexto}</span>
        </div>
      )}
      {isDelivery && pedido.distancia_km != null && (
        <p className="text-xs text-muted-foreground">
          Distância: {Number(pedido.distancia_km).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {whatsappHref && (
          <Button asChild size="sm" variant="outline">
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
            </a>
          </Button>
        )}
        {isDelivery && enderecoTexto && (
          <Button size="sm" variant="outline" onClick={handleCopiarEndereco}>
            <Copy className="mr-1 h-4 w-4" /> Copiar endereço
          </Button>
        )}
        {!isDelivery && (
          <Button size="sm" variant="outline" onClick={handleNotificarRetirada}>
            <Share2 className="mr-1 h-4 w-4" /> Notificar cliente
          </Button>
        )}
      </div>
    </div>
  );
}