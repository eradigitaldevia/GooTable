import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useConfigDistancia, useSalvarModoTaxa } from "@/hooks/use-delivery-distancia";
import type { ModoTaxa } from "@/lib/delivery-distancia.functions";
import { DeliveryBairrosCard } from "./delivery-bairros-card";
import { DeliveryDistanciaCard } from "./delivery-distancia-card";

const OPCOES: Array<{ v: ModoTaxa; t: string; d: string }> = [
  { v: "fixa", t: "Taxa fixa única", d: "Usa o valor de taxa de entrega acima." },
  { v: "bairro", t: "Taxa por bairro", d: "Tabela de bairros com o valor de cada um." },
  { v: "distancia", t: "Taxa por distância (km)", d: "Calculada pela rota de carro, com raio máximo." },
];

export function DeliveryTaxaCard({ restauranteId }: { restauranteId: string }) {
  const { data } = useConfigDistancia(restauranteId);
  const salvarModo = useSalvarModoTaxa(restauranteId);
  if (!data) return null;

  const trocar = (modo: ModoTaxa) =>
    salvarModo.mutate(modo, {
      onSuccess: () => toast.success("Forma de cobrança salva"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
    });

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <header>
          <h2 className="text-base font-semibold">Como cobrar a entrega</h2>
          <p className="mt-1 text-sm text-muted-foreground">Salvo na hora ao escolher.</p>
        </header>
        <RadioGroup
          value={data.modo}
          onValueChange={(v) => trocar(v as ModoTaxa)}
          disabled={salvarModo.isPending}
          className="gap-3"
        >
          {OPCOES.map((o) => (
            <Label key={o.v} className="flex cursor-pointer items-start gap-3 font-normal">
              <RadioGroupItem value={o.v} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium">{o.t}</span>
                <span className="block text-xs text-muted-foreground">{o.d}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </section>
      {data.modo === "bairro" && <DeliveryBairrosCard restauranteId={restauranteId} />}
      <DeliveryDistanciaCard restauranteId={restauranteId} config={data} />
    </div>
  );
}