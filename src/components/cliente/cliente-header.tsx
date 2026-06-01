import { Search, Receipt, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { CategoriaTabs } from "./categoria-tabs";

interface Restaurante {
  id: string;
  nome: string;
  logo_url: string | null;
  cor_primaria: string | null;
  ativo: boolean;
}
interface Mesa { id: string; numero: string; restaurante_id: string; ativa: boolean; }
interface Categoria { id: string; nome: string; ordem: number; }

export function ClienteHeader({
  restaurante,
  mesa,
  busca,
  onBuscaChange,
  categorias,
  catAtiva,
  onCatChange,
  qrToken,
}: {
  restaurante: Restaurante | null;
  mesa: Mesa | null;
  busca: string;
  onBuscaChange: (v: string) => void;
  categorias: Categoria[];
  catAtiva: string | "todas";
  onCatChange: (v: string | "todas") => void;
  qrToken: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        {restaurante?.logo_url ? (
          <img src={restaurante.logo_url} alt={restaurante.nome} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            {restaurante?.nome.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-base font-bold leading-tight">{restaurante?.nome}</h1>
          <p className="text-xs text-muted-foreground">Mesa {mesa?.numero}</p>
        </div>
        <Link
          to="/m/$qrToken/conta"
          params={{ qrToken }}
          aria-label="Conta da mesa"
          className="rounded-full p-2 hover:bg-accent"
        >
          <Receipt className="h-5 w-5" />
        </Link>
        <Link
          to="/m/$qrToken/minha-conta"
          params={{ qrToken }}
          aria-label="Minha conta"
          className="rounded-full p-2 hover:bg-accent"
        >
          <User className="h-5 w-5" />
        </Link>
      </div>
      <div className="mx-auto max-w-2xl px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Buscar no cardápio…"
            className="pl-9 h-11 rounded-full"
          />
        </div>
        <CategoriaTabs categorias={categorias} ativa={catAtiva} onChange={onCatChange} />
      </div>
    </header>
  );
}
