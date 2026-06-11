import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PreviewCardapioMobile } from "./preview-cardapio-mobile";

export function PreviewDrawer({
  open,
  onOpenChange,
  restauranteId,
  nome,
  logoUrl,
  cor_primaria,
  cor_secundaria,
  cor_acento,
  tema_cardapio,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  restauranteId: string;
  nome: string;
  logoUrl: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  cor_acento: string;
  tema_cardapio: "claro" | "escuro";
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="text-base">Prévia ao vivo</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Reflete as cores em edição (não precisa salvar).
          </p>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-hidden">
          {open ? (
            <PreviewCardapioMobile
              restauranteId={restauranteId}
              nome={nome}
              logoUrl={logoUrl}
              cor_primaria={cor_primaria}
              cor_secundaria={cor_secundaria}
              cor_acento={cor_acento}
              tema_cardapio={tema_cardapio}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}