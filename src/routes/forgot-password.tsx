import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QrCode, Loader2 } from "lucide-react";
import gootableLogo from "@/assets/gootable-logo.png.asset.json";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

const schema = z.object({
  email: z.string().trim().email("Email inválido"),
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Falha ao enviar email");
      return;
    }
    setSent(true);
    toast.success("Email de redefinição enviado.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src={gootableLogo.url} alt="GooTable" className="h-10 w-auto" />
        </Link>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
          <h1 className="text-2xl font-bold tracking-tight">Esqueci minha senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe seu email para receber o link de redefinição.
          </p>

          {sent ? (
            <div className="mt-6 space-y-4 text-sm">
              <p className="text-muted-foreground">
                Se houver uma conta vinculada ao email informado, você receberá em instantes um link
                para redefinir a senha.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Voltar para o login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@restaurante.com"
                  autoComplete="email"
                  required
                />
              </div>
              <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar link
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Lembrou a senha?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}