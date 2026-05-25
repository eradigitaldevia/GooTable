import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

const NovaMesaDialogBody = lazy(() => import("./nova-mesa-dialog-body"));

export function NovaMesaDialog({ restauranteId }: { restauranteId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Mesa
        </Button>
      </DialogTrigger>
      {open && (
        <Suspense fallback={null}>
          <NovaMesaDialogBody
            restauranteId={restauranteId}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </Dialog>
  );
}
