import { Loader2, Users, User } from "lucide-react";

export type EscolhaComanda = "participar" | "separada";

export interface ComandaResumo {
  id: string;
  tipo: "individual" | "compartilhada";
  titular_cliente_id: string | null;
  titular_nome: string | null;
  status: "aberta" | "fechada";
  participantes: { cliente_id: string; nome: string }[];
}

export function EscolherComandaModal({
  comandasAtivas,
  onEscolher,
  enviando,
}: {
  comandasAtivas: ComandaResumo[];
  onEscolher: (escolha: EscolhaComanda) => void;
  enviando: boolean;
}) {
  const nomes = Array.from(
    new Set(
      comandasAtivas.flatMap((c) =>
        c.participantes.map((p) => p.nome).filter((n) => n.length > 0),
      ),
    ),
  );

  const resumoNomes =
    nomes.length === 0
      ? "outras pessoas"
      : nomes.length === 1
        ? nomes[0]
        : nomes.length === 2
          ? `${nomes[0]} e ${nomes[1]}`
          : `${nomes.slice(0, 2).join(", ")} e mais ${nomes.length - 2}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/95 backdrop-blur sm:items-center">
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t bg-card p-6 shadow-2xl sm:rounded-3xl sm:border">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold">Esta mesa já está aberta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {resumoNomes} {nomes.length === 1 ? "está" : "estão"} usando esta mesa. Como você quer pedir?
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onEscolher("participar")}
            disabled={enviando}
            className="flex w-full items-start gap-3 rounded-2xl border bg-background p-4 text-left transition hover:border-primary disabled:opacity-60"
          >
            <Users className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="font-semibold">Participar da mesma conta</div>
              <div className="text-sm text-muted-foreground">
                Os pedidos vão para a comanda compartilhada da mesa.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onEscolher("separada")}
            disabled={enviando}
            className="flex w-full items-start gap-3 rounded-2xl border bg-background p-4 text-left transition hover:border-primary disabled:opacity-60"
          >
            <User className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="font-semibold">Criar minha comanda separada</div>
              <div className="text-sm text-muted-foreground">
                Você paga somente o que pediu, mesmo na mesma mesa.
              </div>
            </div>
          </button>
        </div>

        {enviando && (
          <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Confirmando...
          </div>
        )}
      </div>
    </div>
  );
}
