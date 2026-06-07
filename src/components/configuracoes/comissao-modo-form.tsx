import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

export function ComissaoModoForm({
  modo,
  rateioTrocaTurno,
  pagarPedidoCliente,
  percentualPedidoCliente,
  onChange,
  semGarcons = false,
  todosGarconsZerados = false,
  mesasSemGarcom = 0,
  onValidityChange,
}: {
  modo: "pedido" | "item";
  rateioTrocaTurno: boolean;
  pagarPedidoCliente: boolean;
  percentualPedidoCliente: string;
  onChange: (p: {
    comissao_modo?: "pedido" | "item";
    comissao_rateio_troca_turno?: boolean;
    comissao_pedido_cliente?: boolean;
    comissao_pedido_cliente_percentual?: string;
  }) => void;
  semGarcons?: boolean;
  todosGarconsZerados?: boolean;
  mesasSemGarcom?: number;
  onValidityChange?: (valid: boolean) => void;
}) {
  const percTrim = percentualPedidoCliente.trim();
  let percInvalido = false;
  if (percTrim !== "") {
    const n = Number(percTrim.replace(",", "."));
    percInvalido = !Number.isFinite(n) || n < 0 || n > 100;
  }

  useEffect(() => {
    onValidityChange?.(!percInvalido);
  }, [percInvalido, onValidityChange]);

  return (
    <Card className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Comissão de garçons</h2>
        <p className="text-sm text-muted-foreground">
          Como a comissão é calculada quando o pedido é entregue.
        </p>
      </div>

      {semGarcons && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Nenhum garçom cadastrado. A comissão só terá efeito após cadastrar
            garçons em{" "}
            <Link
              to="/admin/garcons"
              search={{ tab: "garcons" }}
              className="underline underline-offset-2"
            >
              Garçons → Garçons
            </Link>
            .
          </span>
        </div>
      )}
      {!semGarcons && todosGarconsZerados && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Os garçons cadastrados estão com 0% de comissão. Defina o
            percentual em cada garçom ou preencha um % específico para pedidos
            do cliente.{" "}
            <Link
              to="/admin/garcons"
              search={{ tab: "garcons" }}
              className="underline underline-offset-2"
            >
              Ir para Garçons
            </Link>
            .
          </span>
        </div>
      )}
      {pagarPedidoCliente && mesasSemGarcom > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {mesasSemGarcom} mesa{mesasSemGarcom > 1 ? "s" : ""} sem garçom
            atribuído. Pedidos do cliente nessa
            {mesasSemGarcom > 1 ? "s mesas" : " mesa"} ficarão sem comissão.{" "}
            <Link
              to="/admin/garcons"
              search={{ tab: "mesas" }}
              className="underline underline-offset-2"
            >
              Atribuir agora
            </Link>
            .
          </span>
        </div>
      )}

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

      <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
        <div className="min-w-0">
          <div className="font-medium">
            Pagar comissão em pedidos do cliente (QR Code)
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Quando ligado, pedidos do cliente (QR) geram comissão dividida
            entre os garçons atribuídos à mesa com turno aberto. Recomendamos
            manter cada mesa com pelo menos um garçom atribuído para que a
            comissão tenha destinatário. Quando desligado, somente pedidos
            lançados por um garçom geram comissão, e os pedidos do cliente
            também deixam de contar para as metas individuais.
          </p>
        </div>
        <Switch
          checked={pagarPedidoCliente}
          onCheckedChange={(v) => onChange({ comissao_pedido_cliente: v })}
          aria-label="Pagar comissão em pedidos do cliente"
        />
      </div>

      {pagarPedidoCliente && (
        <div className="space-y-1 rounded-lg border p-3">
          <Label htmlFor="comissao-perc-cliente" className="font-medium">
            Percentual específico para pedidos do cliente (opcional)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="comissao-perc-cliente"
              inputMode="decimal"
              placeholder="Usar percentual padrão"
              value={percentualPedidoCliente}
              onChange={(e) =>
                onChange({
                  comissao_pedido_cliente_percentual: e.target.value,
                })
              }
              aria-invalid={percInvalido || undefined}
              className={`max-w-[180px] ${percInvalido ? "border-destructive" : ""}`}
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          {percInvalido && (
            <p className="text-xs text-destructive">
              Use um valor entre 0 e 100.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Deixe vazio para usar o percentual padrão de cada garçom. Quando
            preenchido, substitui o percentual do garçom (e do produto, no modo
            Por item) apenas para pedidos lançados pelo cliente.
          </p>
        </div>
      )}
    </Card>
  );
}