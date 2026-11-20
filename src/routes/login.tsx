import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { usePlataformaConfig } from "@/hooks/use-plataforma-config";
import { montarLinkVendas } from "@/lib/vendas-link";
import { LegalDialog, type LegalDoc } from "@/components/legal/legal-dialog";
import gootableLogo from "@/assets/gootable-logo.png.asset.json";

function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

const DEST_CACHE_KEY = "auth:dest";

function getCachedDestination(userId: string): string | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(DEST_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { userId?: string; dest?: string };
    if (parsed.userId === userId && typeof parsed.dest === "string") {
      return parsed.dest;
    }
  } catch {
    // ignore
  }
  return undefined;
}

function setCachedDestination(userId: string, dest: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(DEST_CACHE_KEY, JSON.stringify({ userId, dest }));
  } catch {
    // ignore
  }
}

async function resolveDestination(userId: string, requested?: string) {
  if (requested) return requested;
  const cached = getCachedDestination(userId);
  if (cached) return cached;
  const { data: pa } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (pa) {
    setCachedDestination(userId, "/superadmin");
    return "/superadmin";
  }
  const { data: garcom } = await supabase
    .from("garcons")
    .select("id")
    .eq("user_id", userId)
    .eq("ativo", true)
    .maybeSingle();
  if (garcom) {
    setCachedDestination(userId, "/sala");
    return "/sala";
  }
  const { data: membro } = await supabase
    .from("restaurante_membros")
    .select("papel")
    .eq("user_id", userId)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  const dest =
    membro?.papel === "cozinheiro"
      ? "/cozinha"
      : membro?.papel === "bar"
        ? "/bar"
        : membro?.papel === "caixa"
          ? "/caixa"
          : "/admin";
  setCachedDestination(userId, dest);
  return dest;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => {
    const r = safeRedirect(search.redirect);
    return r ? { redirect: r } : {};
  },
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;
    const dest = await resolveDestination(user.id, search.redirect);
    throw redirect({ to: dest, replace: true });
  },
  component: Login,
});

const schema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

function Login() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);
  const { data: plataformaConfig } = usePlataformaConfig();
  const vendas = montarLinkVendas(
    plataformaConfig?.vendas_whatsapp,
    plataformaConfig?.vendas_link,
    plataformaConfig?.vendas_mensagem,
  );


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.session) {
      setLoading(false);
      toast.error(
        error?.message === "Invalid login credentials"
          ? "Email ou senha incorretos"
          : (error?.message ?? "Falha ao entrar"),
      );
      return;
    }

    await supabase.auth.getSession();
    const dest = await resolveDestination(data.user.id, redirectTo);
    toast.success("Bem-vindo de volta!");
    await navigate({ to: dest, replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src={gootableLogo.url} alt="GooTable" className="h-14 w-auto" />
        </Link>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
          <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse o painel do seu restaurante.
          </p>

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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Quer contratar?{" "}
            <a
              href={vendas?.href ?? undefined}
              {...(vendas?.isWhatsapp ? { target: "_blank", rel: "noreferrer" } : {})}
              className="font-semibold text-primary hover:underline"
            >
              Fale com vendas
            </a>

          </p>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            <button type="button" onClick={() => setLegalDoc("termos")} className="hover:underline">
              Termos
            </button>
            {" · "}
            <button type="button" onClick={() => setLegalDoc("privacidade")} className="hover:underline">
              Privacidade
            </button>
            {" · "}
            <button type="button" onClick={() => setLegalDoc("direitos")} className="hover:underline">
              Direitos do titular
            </button>
          </p>
        </div>
      </div>
      <LegalDialog
        doc={legalDoc}
        open={legalDoc !== null}
        onOpenChange={(o) => !o && setLegalDoc(null)}
      />
    </div>
  );
}
