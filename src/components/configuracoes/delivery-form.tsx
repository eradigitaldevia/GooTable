import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export interface DeliveryFormValues {
  delivery_ativo: boolean;
  delivery_retirada_ativa: boolean;
  delivery_slug: string;
  delivery_taxa_entrega: string;
  delivery_pedido_minimo: string;
  delivery_tempo_estimado_min: string;
  delivery_raio_km: string;
  delivery_aceita_dinheiro: boolean;
  delivery_aceita_cartao_entrega: boolean;
  delivery_aceita_pix: boolean;
}

export function DeliveryForm({
  values,
  onChange,
}: {
  values: DeliveryFormValues;
  onChange: (patch: Partial<DeliveryFormValues>) => void;
}) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined" && values.delivery_slug
      ? `${window.location.origin}/delivery/${values.delivery_slug}`
      : "";

  const semPagamento =
    values.delivery_ativo &&
    !values.delivery_aceita_dinheiro &&
    !values.delivery_aceita_cartao_entrega &&
    !values.delivery_aceita_pix;

  async function copiar() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Delivery</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ative para receber pedidos pelo link público de delivery.
            </p>
          </div>
          <Switch
            checked={values.delivery_ativo}
            onCheckedChange={(v) => onChange({ delivery_ativo: v })}
            aria-label="Ativar delivery"
          />
        </div>

        <div className="mt-4 flex items-start justify-between gap-4 rounded-md border border-border p-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Retirada no local</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Permite que o cliente escolha "retirar no local" no fluxo de delivery.
            </p>
          </div>
          <Switch
            checked={values.delivery_retirada_ativa}
            onCheckedChange={(v) => onChange({ delivery_retirada_ativa: v })}
            aria-label="Ativar retirada"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-4">
        <header>
          <h2 className="text-base font-semibold">Configurações</h2>
        </header>

        <div className="space-y-1">
          <Label>Endereço público (slug)</Label>
          <Input
            value={values.delivery_slug}
            onChange={(e) =>
              onChange({
                delivery_slug: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "-")
                  .replace(/-+/g, "-"),
              })
            }
            placeholder="meu-restaurante"
            maxLength={80}
          />
          {url && (
            <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
              <span className="flex-1 truncate font-mono">{url}</span>
              <Button type="button" size="sm" variant="ghost" onClick={copiar}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Taxa de entrega (R$)</Label>
            <Input
              inputMode="decimal"
              value={values.delivery_taxa_entrega}
              onChange={(e) => onChange({ delivery_taxa_entrega: e.target.value })}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-1">
            <Label>Pedido mínimo (R$)</Label>
            <Input
              inputMode="decimal"
              value={values.delivery_pedido_minimo}
              onChange={(e) => onChange({ delivery_pedido_minimo: e.target.value })}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-1">
            <Label>Tempo estimado (min)</Label>
            <Input
              type="number"
              min={0}
              max={600}
              value={values.delivery_tempo_estimado_min}
              onChange={(e) => onChange({ delivery_tempo_estimado_min: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Raio de entrega (km)</Label>
            <Input
              inputMode="decimal"
              value={values.delivery_raio_km}
              onChange={(e) => onChange({ delivery_raio_km: e.target.value })}
              placeholder="Opcional"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <header>
          <h2 className="text-base font-semibold">Pagamentos aceitos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            PIX é processado online. Dinheiro e cartão são pagos na entrega.
          </p>
        </header>
        <Toggle
          label="PIX (na hora)"
          checked={values.delivery_aceita_pix}
          onChange={(v) => onChange({ delivery_aceita_pix: v })}
        />
        <Toggle
          label="Dinheiro (na entrega)"
          checked={values.delivery_aceita_dinheiro}
          onChange={(v) => onChange({ delivery_aceita_dinheiro: v })}
        />
        <Toggle
          label="Cartão (na entrega)"
          checked={values.delivery_aceita_cartao_entrega}
          onChange={(v) => onChange({ delivery_aceita_cartao_entrega: v })}
        />
        {semPagamento && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Delivery está ativo, mas nenhuma forma de pagamento está habilitada.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}