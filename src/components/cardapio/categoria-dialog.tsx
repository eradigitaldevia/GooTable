import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

const CategoriaDialogBody = lazy(() => import("./categoria-dialog-body"));

export function CategoriaDialog({ restauranteId, onSaved }: { restauranteId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Categoria
        </Button>
      </DialogTrigger>
      {open && (
        <Suspense fallback={null}>
          <CategoriaDialogBody
            restauranteId={restauranteId}
            onSaved={onSaved}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </Dialog>
  );
}
