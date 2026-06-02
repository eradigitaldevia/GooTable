import { Loader2, AlertTriangle } from "lucide-react";

export function ConflitoMesaModal({
  clienteNome,
  numeroMesaAtual,
  podeTransferir,
  enviando,
  onTransferir,
  onCancelar,
}: {
  clienteNome: string;
  numeroMesaAtual: string;
  podeTransferir: boolean;
  enviando: boolean;
  onTransferir: () => void;
  onCancelar: () => void;
}) {
  const primeiroNome = clienteNome.trim().split(/\s+/)[0] || clienteNome;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/95 backdrop-blur sm:items-center">
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t bg-card p-6 shadow-2xl sm:rounded-3xl sm:border">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Olá, {primeiroNome}!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você já tem uma conta aberta na <strong>Mesa {numeroMesaAtual}</strong>.
            Para abrir uma comanda nesta mesa, encerre a anterior.
          </p>
        </div>

        <div className="space-y-3">
          {podeTransferir ? (
            <button
              type="button"
              onClick={onTransferir}
              disabled={enviando}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              Transferir minha conta para esta mesa
            </button>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Você já tem pedidos lançados na Mesa {numeroMesaAtual}. Procure um
              garçom ou o caixa para encerrar a conta antes de mudar de mesa.
            </div>
          )}

          <button
            type="button"
            onClick={onCancelar}
            disabled={enviando}
            className="block w-full rounded-2xl border bg-background px-4 py-3 text-center text-sm font-medium hover:border-primary disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}