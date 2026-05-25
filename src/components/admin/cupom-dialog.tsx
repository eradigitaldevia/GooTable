import { lazy, Suspense } from "react";
import { Dialog } from "@/components/ui/dialog";
import type { Cupom } from "@/lib/cupons.functions";

const CupomDialogBody = lazy(() => import("./cupom-dialog-body"));

export function CupomDialog({
  open,
  onOpenChange,
  restauranteId,
  cupom,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  restauranteId: string | undefined;
  cupom: Cupom | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <Suspense fallback={null}>
          <CupomDialogBody
            onClose={() => onOpenChange(false)}
            restauranteId={restauranteId}
            cupom={cupom}
          />
        </Suspense>
      )}
    </Dialog>
  );
}
