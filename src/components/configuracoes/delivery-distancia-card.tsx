import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EnderecoForm } from "@/components/delivery/endereco-form";
import { useLocalizarOrigem, useSalvarConfigDistancia } from "@/hooks/use-delivery-distancia";
import type { ConfigDistancia } from "@/lib/delivery-distancia.functions";
import type { EnderecoCliente } from "@/lib/delivery.functions";
import type { FaixaKm, FalhaDistancia, ModeloKm } from "@/lib/taxa-distancia";
import { DeliveryFaixasKm } from "./delivery-faixas-km";

const VAZIO: EnderecoCliente = { cep: "", rua: "", numero: "", bairro: "", cidade: "", uf: "" };
const num = (s: string) => Number(s.replace(",", ".")) || 0;
const erro = (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao salvar");

export function DeliveryDistanciaCard({
  restauranteId,
  config,
}: {
  restauranteId: string;
  config: ConfigDistancia;
}) {
  const localizar = useLocalizarOrigem(restauranteId);
  const salvar = useSalvarConfigDistancia(restauranteId);
  const [end, setEnd] = useState<EnderecoCliente>(VAZIO);
  const [modelo, setModelo] = useState<ModeloKm>(config.modelo);
  const [faixas, setFaixas] = useState<FaixaKm[]>(config.faixas);
  const [baseValor, setBaseValor] = useState(String(config.baseValor));
  const [baseKm, setBaseKm] = useState(String(config.baseKm));
  const [extra, setExtra] = useState(String(config.valorKmExtra));
  const [falha, setFalha] = useState<FalhaDistancia>(config.falha);

  useEffect(() => {
    setModelo(config.modelo);
    setFaixas(config.faixas);
    setFalha(config.falha);
  }, [config.modelo, config.faixas, config.falha]);

  const onLocalizar = () =>
    localizar.mutate(end, {
      onSuccess: (r) => toast.success(`Localizado: ${r.formatado}`),
      onError: erro,
    });

  const onSalvar = () => {
    if (modelo === "faixas" && faixas.length === 0) return toast.error("Adicione ao menos uma faixa.");
    salvar.mutate(
      { modelo, faixas, baseValor: num(baseValor), baseKm: num(baseKm), valorKmExtra: num(extra), falha },
      { onSuccess: () => toast.success("Taxa por distância salva"), onError: erro },
    );
  };

  return (
    <section className="space-y-5 rounded-lg border border-border bg-card p-4">
      <header>
        <h2 className="text-base font-semibold">Taxa por distância</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Distância pela rota de carro entre o restaurante e o cliente. O raio máximo é o "Raio de
          entrega (km)" acima{config.raioKm ? ` (atual: ${config.raioKm} km)` : " (sem limite)"}.
        </p>
      </header>

      <div className="space-y-2">
        <Label>Endereço de saída do restaurante</Label>
        {config.origemEndereco ? (
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 text-primary" /> Localizado: {config.origemEndereco}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Ainda não localizado.</p>
        )}
        <EnderecoForm value={end} onChange={setEnd} />
        <Button type="button" variant="outline" disabled={localizar.isPending} onClick={onLocalizar}>
          {localizar.isPending ? "Localizando…" : "Localizar endereço"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Forma de cobrança</Label>
        <RadioGroup value={modelo} onValueChange={(v) => setModelo(v as ModeloKm)} className="gap-2">
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="faixas" /> Faixas de distância
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="base_km" /> Taxa base + valor por km extra
          </label>
        </RadioGroup>
      </div>

      {modelo === "faixas" ? (
        <DeliveryFaixasKm faixas={faixas} onChange={setFaixas} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Taxa base (R$)</Label>
            <Input inputMode="decimal" value={baseValor} onChange={(e) => setBaseValor(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Cobre até (km)</Label>
            <Input inputMode="decimal" value={baseKm} onChange={(e) => setBaseKm(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>R$ por km extra</Label>
            <Input inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Se não for possível calcular a distância</Label>
        <RadioGroup value={falha} onValueChange={(v) => setFalha(v as FalhaDistancia)} className="gap-2">
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="taxa_fixa" /> Cobrar a taxa fixa
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="bloquear" /> Bloquear pedido
          </label>
        </RadioGroup>
      </div>

      <Button type="button" disabled={salvar.isPending} onClick={onSalvar}>
        {salvar.isPending ? "Salvando…" : "Salvar taxa por distância"}
      </Button>
    </section>
  );
}