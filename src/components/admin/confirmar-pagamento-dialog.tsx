import { lazy, Suspense } from "react";
import { Dialog } from "@/components/ui/dialog";

const ConfirmarPagamentoDialogBody = lazy(
  () => import("./confirmar-pagamento-dialog-body")
);

export function ConfirmarPagamentoDialog({
  open,
  onOpenChange,
  restauranteId,
  comandaId,
  saldoSugerido,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  restauranteId: string;
  comandaId: string;
  saldoSugerido: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <Suspense fallback={null}>
          <ConfirmarPagamentoDialogBody
            onOpenChange={onOpenChange}
            restauranteId={restauranteId}
            comandaId={comandaId}
            saldoSugerido={saldoSugerido}
          />
        </Suspense>
      )}
    </Dialog>
  );
}
