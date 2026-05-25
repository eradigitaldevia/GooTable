import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function AdminMobileHeader({
  nome,
  onOpen,
}: {
  nome: string;
  onOpen: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:hidden">
      <Button variant="ghost" size="icon" onClick={onOpen}>
        <Menu className="h-5 w-5" />
      </Button>
      <span className="font-semibold">{nome}</span>
    </header>
  );
}
