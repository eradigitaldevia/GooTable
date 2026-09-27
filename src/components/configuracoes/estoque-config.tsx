import { Switch } from "@/components/ui/switch";

export function EstoqueConfig({
  ativo,
  salvando,
  onToggle,
}: {
  ativo: boolean;
  salvando: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Controle de estoque</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando ligado, cada pedido recebido desconta os insumos das fichas técnicas e cancelamentos devolvem ao
            estoque. Produtos com insumo marcado para bloquear ficam indisponíveis quando o insumo acaba. Desligado,
            o sistema funciona normalmente sem controle de estoque. Alterações são salvas automaticamente.
          </p>
        </div>
        <Switch checked={ativo} disabled={salvando} onCheckedChange={onToggle} aria-label="Controle de estoque" />
      </div>
    </section>
  );
}
