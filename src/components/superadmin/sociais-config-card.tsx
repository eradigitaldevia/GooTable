import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Info, Loader2, Share2 } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import { REDES_SOCIAIS, montarLinkSocial, type RedeSocial } from "@/lib/social-links";
import { useAtualizarConfigSociais, usePlataformaConfig } from "@/hooks/use-plataforma-config";

type Valores = Record<RedeSocial, string>;

const VAZIO: Valores = {
  instagram: "",
  facebook: "",
  youtube: "",
  linkedin: "",
  tiktok: "",
  x: "",
};

export function SociaisConfigCard() {
  const { data, isLoading } = usePlataformaConfig();
  const salvar = useAtualizarConfigSociais();
  const [valores, setValores] = useState<Valores>(VAZIO);

  useEffect(() => {
    if (!data) return;
    const next = { ...VAZIO };
    for (const rede of REDES_SOCIAIS) {
      next[rede.chave] = data[rede.campo] ?? "";
    }
    setValores(next);
  }, [data]);

  const previews = useMemo(
    () =>
      REDES_SOCIAIS.map((rede) => ({
        rede,
        href: montarLinkSocial(rede.chave, valores[rede.chave]),
      })).filter((p) => p.href),
    [valores],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    salvar.mutate(
      {
        social_instagram: valores.instagram.trim() || null,
        social_facebook: valores.facebook.trim() || null,
        social_youtube: valores.youtube.trim() || null,
        social_linkedin: valores.linkedin.trim() || null,
        social_tiktok: valores.tiktok.trim() || null,
        social_x: valores.x.trim() || null,
      },
      {
        onSuccess: () => toast.success("Redes sociais salvas"),
        onError: (err: unknown) =>
          toast.error(err instanceof Error ? err.message : "Erro ao salvar"),
      },
    );
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Redes sociais</h2>
      </div>

      <div className="mt-4 flex gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          Os ícones aparecem no rodapé da <strong>landing page</strong>; redes em branco não são
          exibidas. Informe o usuário (ex.: @mesasistema) ou a URL completa do perfil.
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {REDES_SOCIAIS.map((rede) => (
            <div key={rede.chave} className="space-y-1.5">
              <Label htmlFor={`social-${rede.chave}`} className="flex items-center gap-1.5">
                <SocialIcon rede={rede.chave} className="h-3.5 w-3.5 text-muted-foreground" />
                {rede.rotulo}
              </Label>
              <Input
                id={`social-${rede.chave}`}
                value={valores[rede.chave]}
                onChange={(e) =>
                  setValores((v) => ({ ...v, [rede.chave]: e.target.value }))
                }
                placeholder={rede.placeholder}
              />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xs font-medium text-muted-foreground">Prévia dos links</div>
          {previews.length === 0 ? (
            <div className="mt-1 text-xs text-muted-foreground">
              Nenhuma rede configurada — o rodapé não exibirá ícones.
            </div>
          ) : (
            <ul className="mt-2 space-y-1">
              {previews.map((p) => (
                <li key={p.rede.chave} className="flex items-center gap-2 text-xs">
                  <SocialIcon rede={p.rede.chave} className="h-3.5 w-3.5 text-muted-foreground" />
                  <a
                    href={p.href!}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all hover:underline"
                  >
                    {p.href}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button type="submit" disabled={salvar.isPending || isLoading}>
          {salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </form>
    </Card>
  );
}
