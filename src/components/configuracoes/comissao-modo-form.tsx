import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

export function ComissaoModoForm({
  modo,
  rateioTrocaTurno,
  onChange,
}: {
  modo: "pedido" | "item";
  rateioTrocaTurno: boolean;
  onChange: (p: { comissao_modo?: "pedido" | "item"; comissao_rateio_troca_turno?: boolean }) => void;
}) {
  return (
    <Card className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Comissão de garçons</h2>
        <p className="text-sm text-muted-foreground">
          Como a comissão é calculada quando o pedido é entregue.
        </p>
      </div>
      <RadioGroup
        value={modo}
        onValueChange={(v) =>
          onChange({ comissao_modo: v as "pedido" | "item" })
        }
        className="space-y-2"
      >
        <Label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
          <RadioGroupItem value="pedido" className="mt-1" />
          <div>
            <div className="font-medium">Por pedido</div>
            <div className="text-xs text-muted-foreground">
              Aplica o % do garçom sobre o total do pedido.
            </div>
          </div>
        </Label>
        <Label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
          <RadioGroupItem value="item" className="mt-1" />
          <div>
            <div className="font-medium">Por item</div>
            <div className="text-xs text-muted-foreground">
              Soma item a item usando o % do produto (quando definido) ou o % do
              garçom. Itens marcados como não-aplicáveis são ignorados.
            </div>
          </div>
        </Label>
      </RadioGroup>

      <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
        <div className="min-w-0">
          <div className="font-medium">
            Dividir comissão entre garçons atribuídos com turno aberto
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Quando ligado, cada pedido que o garçom lança é dividido igualmente
            entre todos os garçons da mesa que estão com turno aberto naquele
            momento. Quando desligado, a comissão fica 100% para quem lançou.
            Pedidos do cliente (QR) sempre são divididos entre os atribuídos com
            turno aberto, independente desta opção.
          </p>
        </div>
        <Switch
          checked={rateioTrocaTurno}
          onCheckedChange={(v) => onChange({ comissao_rateio_troca_turno: v })}
          aria-label="Dividir comissão entre garçons atribuídos com turno aberto"
        />
      </div>
    </Card>
  );
}