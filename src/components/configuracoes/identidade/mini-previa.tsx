import { foregroundOn } from "@/lib/cor-utils";

type Tema = "claro" | "escuro";

export function MiniPrevia({
  primaria,
  secundaria,
  acento,
  tema,
  nome,
}: {
  primaria: string;
  secundaria: string;
  acento: string;
  tema: Tema;
  nome: string;
}) {
  const bg = tema === "escuro" ? "#18181b" : "#fafafa";
  const fgBg = foregroundOn(bg);
  const fgPri = foregroundOn(primaria);
  const fgSec = foregroundOn(secundaria);
  const fgAce = foregroundOn(acento);

  return (
    <div
      className="overflow-hidden rounded-xl border border-border"
      style={{ backgroundColor: bg, color: fgBg }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: primaria, color: fgPri }}
      >
        <span className="text-sm font-semibold">{nome || "Seu restaurante"}</span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: secundaria, color: fgSec }}
        >
          Aberto
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Prato exemplo</div>
            <div className="text-xs opacity-70">Descrição curta do prato</div>
          </div>
          <span className="text-sm font-bold" style={{ color: acento }}>
            R$ 24,00
          </span>
        </div>
        <button
          type="button"
          className="w-full rounded-md px-3 py-2 text-sm font-medium"
          style={{ backgroundColor: primaria, color: fgPri }}
          tabIndex={-1}
        >
          Adicionar
        </button>
        <div className="flex gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px]"
            style={{ backgroundColor: acento, color: fgAce }}
          >
            Novo
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px]"
            style={{ backgroundColor: secundaria, color: fgSec }}
          >
            Promoção
          </span>
        </div>
      </div>
    </div>
  );
}