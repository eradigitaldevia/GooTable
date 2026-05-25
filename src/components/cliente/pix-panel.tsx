import { useMemo } from "react";
import { Copy, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/cart";
import { gerarPixPayload } from "@/lib/pix";
import { toast } from "sonner";

export function PixPanel({
  chave,
  titular,
  valor,
  descricao,
}: {
  chave: string;
  titular: string;
  valor: number;
  descricao: string;
}) {
  const payload = useMemo(
    () => gerarPixPayload({ chave, nomeTitular: titular, valor, descricao }),
    [chave, titular, valor, descricao],
  );

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Código PIX copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15 text-success">
          <QrCode className="h-4 w-4" />
        </div>
        <h2 className="font-semibold">Pagar com PIX</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Escaneie o QR ou copie o código PIX e finalize no seu banco. Depois é só mostrar o
        comprovante ao garçom.
      </p>
      <div className="mt-4 flex flex-col items-center gap-4 rounded-xl bg-background p-4">
        <QRCodeSVG value={payload} size={200} level="M" />
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-2xl font-bold text-primary">{formatBRL(valor)}</div>
          <div className="mt-1 text-xs text-muted-foreground">para {titular}</div>
        </div>
      </div>
      <Button onClick={copiar} className="mt-4 w-full h-12 rounded-2xl">
        <Copy className="mr-2 h-4 w-4" />
        Copiar código PIX
      </Button>
    </div>
  );
}
