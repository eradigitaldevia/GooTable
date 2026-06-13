import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EnderecoCliente } from "@/lib/delivery.functions";

function formatCep(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function EnderecoForm({
  value,
  onChange,
}: {
  value: EnderecoCliente;
  onChange: (e: EnderecoCliente) => void;
}) {
  const set = <K extends keyof EnderecoCliente>(k: K, v: EnderecoCliente[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label htmlFor="end-cep">CEP</Label>
          <Input
            id="end-cep"
            inputMode="numeric"
            value={value.cep ?? ""}
            onChange={(e) => set("cep", formatCep(e.target.value))}
            placeholder="00000-000"
          />
        </div>
        <div>
          <Label htmlFor="end-uf">UF</Label>
          <Input
            id="end-uf"
            value={value.uf}
            maxLength={2}
            onChange={(e) => set("uf", e.target.value.toUpperCase())}
            placeholder="SP"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="end-rua">Rua</Label>
        <Input
          id="end-rua"
          value={value.rua}
          onChange={(e) => set("rua", e.target.value)}
          placeholder="Av. Paulista"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="end-num">Número</Label>
          <Input
            id="end-num"
            value={value.numero}
            onChange={(e) => set("numero", e.target.value)}
            placeholder="123"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="end-comp">Complemento</Label>
          <Input
            id="end-comp"
            value={value.complemento ?? ""}
            onChange={(e) => set("complemento", e.target.value)}
            placeholder="Apto 12"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="end-bai">Bairro</Label>
        <Input
          id="end-bai"
          value={value.bairro}
          onChange={(e) => set("bairro", e.target.value)}
          placeholder="Bela Vista"
        />
      </div>
      <div>
        <Label htmlFor="end-cid">Cidade</Label>
        <Input
          id="end-cid"
          value={value.cidade}
          onChange={(e) => set("cidade", e.target.value)}
          placeholder="São Paulo"
        />
      </div>
      <div>
        <Label htmlFor="end-ref">Ponto de referência</Label>
        <Input
          id="end-ref"
          value={value.referencia ?? ""}
          onChange={(e) => set("referencia", e.target.value)}
          placeholder="Próx. ao mercado"
        />
      </div>
    </div>
  );
}