interface Categoria { id: string; nome: string; ordem: number; }

function CatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
          : "bg-secondary text-secondary-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

export function CategoriaTabs({
  categorias,
  ativa,
  onChange,
}: {
  categorias: Categoria[];
  ativa: string | "todas";
  onChange: (v: string | "todas") => void;
}) {
  return (
    <div className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
      <CatChip active={ativa === "todas"} onClick={() => onChange("todas")}>Todas</CatChip>
      {categorias.map((c) => (
        <CatChip key={c.id} active={ativa === c.id} onClick={() => onChange(c.id)}>
          {c.nome}
        </CatChip>
      ))}
    </div>
  );
}
