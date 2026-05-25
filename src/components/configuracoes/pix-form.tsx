import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function PixForm({
  habilitado,
  chave,
  titular,
  onChange,
}: {
  habilitado: boolean;
  chave: string;
  titular: string;
  onChange: (patch: { pix_habilitado?: boolean; pix_chave?: string; pix_nome_titular?: string }) => void;
}) {
  return (
    <section className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Pagamento via PIX</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando habilitado, o cliente verá o QR Code do PIX ao finalizar o pedido.
            <br />
            <span className="text-xs">Pagamento confirmado manualmente pelo garçom (PIX estático).</span>
          </p>
        </div>
        <Switch
          checked={habilitado}
          onCheckedChange={(v) => onChange({ pix_habilitado: v })}
        />
      </div>

      {habilitado && (
        <>
          <div className="space-y-2">
            <Label>Chave PIX</Label>
            <Input
              value={chave}
              onChange={(e) => onChange({ pix_chave: e.target.value })}
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
            />
          </div>
          <div className="space-y-2">
            <Label>Nome do titular</Label>
            <Input
              value={titular}
              onChange={(e) => onChange({ pix_nome_titular: e.target.value })}
              placeholder="Nome que aparece no PIX"
            />
          </div>
        </>
      )}
    </section>
  );
}
