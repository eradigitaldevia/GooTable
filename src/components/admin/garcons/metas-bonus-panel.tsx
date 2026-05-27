import { MetasList } from "./metas-list";
import { BonusList } from "./bonus-list";

export function MetasBonusPanel({ restauranteId }: { restauranteId: string }) {
  return (
    <div className="space-y-4">
      <MetasList restauranteId={restauranteId} />
      <BonusList restauranteId={restauranteId} />
    </div>
  );
}
