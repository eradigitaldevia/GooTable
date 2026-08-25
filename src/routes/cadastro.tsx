import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCriarRestaurante } from "@/hooks/use-restaurante";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { registrarConsentimentoRestauranteFn } from "@/lib/lgpd.functions";
import { toast } from "sonner";
import { QrCode, Loader2 } from "lucide-react";

export const Route = createFileRoute("/cadastro")({
  component: Cadastro,
});

const schema = z.object({
  nomeRestaurante: z.string().trim().min(2, "Nome do restaurante muito curto").max(100),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

function Cadastro() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nomeRestaurante: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [aceite, setAceite] = useState(false);
  const criarMut = useCriarRestaurante(undefined);
  const registrarConsentimento = useServerFn(registrarConsentimentoRestauranteFn);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aceite) {
      toast.error("É necessário aceitar os Termos de Uso e a Política de Privacidade");
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/admin` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;

      // Tenta logar (caso confirmação de email esteja desativada — padrão Lovable Cloud)
      let userId = data.user?.id;
      if (!data.session) {
        const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (signErr) {
          toast.success("Conta criada! Verifique seu email para confirmar.");
          navigate({ to: "/login" });
          return;
        }
        userId = signIn.user.id;
      }

      if (!userId) throw new Error("Não foi possível obter o usuário");

      const rest = await criarMut.mutateAsync({ nome: parsed.data.nomeRestaurante });
      if (rest?.id) {
        try {
          await registrarConsentimento({ data: { restauranteId: rest.id } });
        } catch {
          // Falha no registro do aceite não bloqueia o cadastro.
        }
      }
      toast.success("Conta e restaurante criados!");
      navigate({ to: "/admin" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar conta";
      toast.error(msg.includes("already registered") ? "Este email já está em uso" : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <QrCode className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">Mesa</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
          <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Comece grátis. Em 2 minutos seu cardápio está no ar.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do restaurante</Label>
              <Input
                id="nome"
                value={form.nomeRestaurante}
                onChange={(e) => setForm({ ...form, nomeRestaurante: e.target.value })}
                placeholder="Ex: Cantina da Nona"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="voce@restaurante.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="aceite"
                checked={aceite}
                onCheckedChange={(v) => setAceite(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="aceite" className="text-sm font-normal leading-snug text-muted-foreground">
                Li e aceito os{" "}
                <Link to="/termos" target="_blank" className="font-medium text-primary hover:underline">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link to="/privacidade" target="_blank" className="font-medium text-primary hover:underline">
                  Política de Privacidade
                </Link>
                .
              </Label>
            </div>
            <Button
              type="submit"
              className="h-11 w-full text-base"
              disabled={loading || !aceite}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar conta
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Entrar
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            <Link to="/termos" className="hover:underline">
              Termos
            </Link>
            {" · "}
            <Link to="/privacidade" className="hover:underline">
              Privacidade
            </Link>
            {" · "}
            <Link to="/direitos" className="hover:underline">
              Direitos do titular
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
