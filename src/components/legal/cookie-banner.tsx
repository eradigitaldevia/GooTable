import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CookieBanner({
  onAceitarTodos,
  onRejeitar,
  onPersonalizar,
}: {
  onAceitarTodos: () => void;
  onRejeitar: () => void;
  onPersonalizar: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)] sm:flex-row sm:items-center sm:gap-6 sm:p-5">
        <div className="flex flex-1 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            <Cookie className="h-4 w-4" />
          </div>
          <p className="text-sm text-muted-foreground">
            Usamos cookies para operar o site e entender como ele é usado. Você pode
            escolher quais categorias aceitar. Saiba mais na{" "}
            <Link to="/privacidade" className="font-medium text-primary hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onPersonalizar}>
            Personalizar
          </Button>
          <Button variant="outline" size="sm" onClick={onRejeitar}>
            Rejeitar não essenciais
          </Button>
          <Button size="sm" onClick={onAceitarTodos}>
            Aceitar todos
          </Button>
        </div>
      </div>
    </div>
  );
}
