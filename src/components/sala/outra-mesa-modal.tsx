import { useMemo, useState } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { useMesasRestaurante } from "@/hooks/use-sala";

export function OutraMesaModal({
  restauranteId,
  meuGarcomId,
  onSelecionar,
  onClose,
}: {
  restauranteId: string;
  meuGarcomId: string;
  onSelecionar: (mesaId: string) => void;
  onClose: () => void;
}) {
  const { data: mesas = [], isLoading } = useMesasRestaurante(
    restauranteId,
    true,
  );
  const [q, setQ] = useState("");

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return mesas;
    return mesas.filter(
      (m) =>
        m.numero.toLowerCase().includes(t) ||
        (m.garcom_nome ?? "").toLowerCase().includes(t),
    );
  }, [mesas, q]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/95 backdrop-blur sm:items-center">
      <div className="mx-auto flex h-[80vh] w-full max-w-md flex-col rounded-t-3xl border-t bg-card p-4 shadow-2xl sm:rounded-3xl sm:border">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Outra mesa</h2>
            <p className="text-xs text-muted-foreground">
              Selecione qualquer mesa do salão.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            inputMode="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nº ou garçom..."
            className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtradas.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma mesa encontrada.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filtradas.map((m) => {
                const minha = m.garcom_id === meuGarcomId;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onSelecionar(m.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-left hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">
                          Mesa {m.numero}
                          {minha && (
                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              sua
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {m.garcom_nome ?? "Sem garçom"}
                          {m.sessao_aberta ? " · sessão aberta" : " · livre"}
                          {m.pedidos_abertos > 0
                            ? ` · ${m.pedidos_abertos} pedido(s)`
                            : ""}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}