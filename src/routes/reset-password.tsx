import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { traduzirErroSenha } from "@/lib/auth-errors";
import gootableLogo from "@/assets/gootable-logo.png.asset.json";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

const schema = z
  .object({
    password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
    confirm: z.string().min(8, "Confirme a nova senha"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasSession(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true);
      setReady(true);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) {
      toast.error(traduzirErroSenha(error));
      return;
    }
    toast.success("Senha atualizada com sucesso.");
    await supabase.auth.signOut();
    await navigate({ to: "/login", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src={gootableLogo.url} alt="GooTable" className="h-10 w-auto" />
        </Link>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
          <h1 className="text-2xl font-bold tracking-tight">Definir nova senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha uma nova senha para sua conta.
          </p>

          {!ready ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : !hasSession ? (
            <div className="mt-6 space-y-4 text-sm">
              <p className="text-muted-foreground">
                Link inválido ou expirado. Solicite um novo link de redefinição.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/forgot-password">Solicitar novo link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
              <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Atualizar senha
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}