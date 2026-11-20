import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import gootableLogo from "@/assets/gootable-logo.png.asset.json";

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
          <img src={gootableLogo.url} alt="GooTable" className="h-14 w-auto" />
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
