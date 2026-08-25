import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";

export const Route = createFileRoute("/cadastro")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  component: Cadastro,
});

function Cadastro() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <QrCode className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">Mesa</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Cadastro fechado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A criação de contas é feita exclusivamente pela equipe comercial.
        </p>
        <Button asChild className="mt-6">
          <Link to="/login">Ir para o login</Link>
        </Button>
      </div>
    </div>
  );
}
