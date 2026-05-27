import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

export function ComissaoModoForm({
  modo,
  onChange,
}: {
  modo: "pedido" | "item";
  onChange: (p: { comissao_modo: "pedido" | "item" }) => void;
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
    </Card>
  );
}