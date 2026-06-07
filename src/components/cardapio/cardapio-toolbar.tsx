import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, LayoutGrid, List, Group } from "lucide-react";
import { forwardRef } from "react";

export type SortOption =
  | "default"
  | "name-asc"
  | "price-asc"
  | "price-desc"
  | "unavailable-first";

export type AvailabilityFilter = "all" | "available" | "unavailable";
export type DestinoFilter = "all" | "cozinha" | "bar";
export type ViewMode = "grid" | "list";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  totalFiltered: number;
  totalProdutos: number;
  availability: AvailabilityFilter;
  onAvailabilityChange: (v: AvailabilityFilter) => void;
  destino: DestinoFilter;
  onDestinoChange: (v: DestinoFilter) => void;
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  groupByCategoria: boolean;
  onGroupByCategoriaChange: (v: boolean) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  searchInputRef?: React.Ref<HTMLInputElement>;
}

export const CardapioToolbar = forwardRef<HTMLInputElement, Props>(function CardapioToolbar(
  {
    search,
    onSearchChange,
    totalFiltered,
    totalProdutos,
    availability,
    onAvailabilityChange,
    destino,
    onDestinoChange,
    sort,
    onSortChange,
    view,
    onViewChange,
    groupByCategoria,
    onGroupByCategoriaChange,
    hasActiveFilters,
    onClearFilters,
    searchInputRef,
  },
  _ref,
) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome ou descrição… (atalho: / )"
            className="h-9 pl-8 pr-8"
            aria-label="Buscar produtos"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={availability} onValueChange={(v) => onAvailabilityChange(v as AvailabilityFilter)}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="available">Disponíveis</SelectItem>
            <SelectItem value="unavailable">Indisponíveis</SelectItem>
          </SelectContent>
        </Select>

        <Select value={destino} onValueChange={(v) => onDestinoChange(v as DestinoFilter)}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos destinos</SelectItem>
            <SelectItem value="cozinha">Cozinha</SelectItem>
            <SelectItem value="bar">Bar</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Ordem padrão</SelectItem>
            <SelectItem value="name-asc">Nome A–Z</SelectItem>
            <SelectItem value="price-asc">Preço ↑</SelectItem>
            <SelectItem value="price-desc">Preço ↓</SelectItem>
            <SelectItem value="unavailable-first">Indisponíveis primeiro</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={groupByCategoria ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onGroupByCategoriaChange(!groupByCategoria)}
          className="h-9"
          aria-pressed={groupByCategoria}
        >
          <Group className="mr-1.5 h-4 w-4" /> Agrupar
        </Button>

        <div className="inline-flex overflow-hidden rounded-md border border-border">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 rounded-none"
            onClick={() => onViewChange("grid")}
            aria-label="Visualização em grade"
            aria-pressed={view === "grid"}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 rounded-none"
            onClick={() => onViewChange("list")}
            aria-label="Visualização em lista"
            aria-pressed={view === "list"}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={onClearFilters}>
            <X className="mr-1 h-4 w-4" /> Limpar filtros
          </Button>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        Mostrando {totalFiltered} de {totalProdutos} produtos
      </div>
    </div>
  );
});