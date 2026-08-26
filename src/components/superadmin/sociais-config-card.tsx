import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Info, Loader2, Share2 } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import {
  REDES_SOCIAIS,
  montarLinkSocial,
  validarValorSocial,
  type RedeSocial,
} from "@/lib/social-links";
import { useAtualizarConfigSociais, usePlataformaConfig } from "@/hooks/use-plataforma-config";
import { cn } from "@/lib/utils";

type Estado = { valor: string; ativo: boolean };
type Valores = Record<RedeSocial, Estado>;

const VAZIO: Valores = {
  instagram: { valor: "", ativo: true },
  facebook: { valor: "", ativo: true },
  youtube: { valor: "", ativo: true },
  linkedin: { valor: "", ativo: true },
  tiktok: { valor: "", ativo: true },
  x: { valor: "", ativo: true },
};

export function SociaisConfigCard() {
  const { data, isLoading } = usePlataformaConfig();
  const salvar = useAtualizarConfigSociais();
  const [valores, setValores] = useState<Valores>(VAZIO);

  useEffect(() => {
    if (!data) return;
    const next = { ...VAZIO } as Valores;
    for (const rede of REDES_SOCIAIS) {
      next[rede.chave] = {
        valor: data[rede.campo] ?? "",
        ativo: data[rede.campoAtivo] ?? true,
      };
    }
    setValores(next);
  }, [data]);

  const erros = useMemo(() => {
    const map: Partial<Record<RedeSocial, string>> = {};
    for (const rede of REDES_SOCIAIS) {
      const res = validarValorSocial(rede.chave, valores[rede.chave].valor);
      if (!res.ok) map[rede.chave] = res.erro;
    }
    return map;
  }, [valores]);

  const qtdErros = Object.keys(erros).length;

  const previews = useMemo(
    () =>
      REDES_SOCIAIS.map((rede) => ({
        rede,
        ativo: valores[rede.chave].ativo,
        href: montarLinkSocial(rede.chave, valores[rede.chave].valor),
      })).filter((p) => p.href),
    [valores],
  );

  const setCampo = (chave: RedeSocial, patch: Partial<Estado>) =>
    setValores((v) => ({ ...v, [chave]: { ...v[chave], ...patch } }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qtdErros > 0) {
      toast.error(
        qtdErros === 1
          ? "1 rede social precisa de correção."
          : `${qtdErros} redes sociais precisam de correção.`,
      );
      return;
    }
    salvar.mutate(
      {
        social_instagram: valores.instagram.valor.trim() || null,
        social_facebook: valores.facebook.valor.trim() || null,
        social_youtube: valores.youtube.valor.trim() || null,
        social_linkedin: valores.linkedin.valor.trim() || null,
        social_tiktok: valores.tiktok.valor.trim() || null,
        social_x: valores.x.valor.trim() || null,
        social_instagram_ativo: valores.instagram.ativo,
        social_facebook_ativo: valores.facebook.ativo,
        social_youtube_ativo: valores.youtube.ativo,
        social_linkedin_ativo: valores.linkedin.ativo,
        social_tiktok_ativo: valores.tiktok.ativo,
        social_x_ativo: valores.x.ativo,
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
          Os ícones aparecem no rodapé da <strong>landing page</strong>; redes em branco ou
          desativadas não são exibidas. Informe o usuário (ex.: @mesasistema) ou a URL completa do
          perfil.
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {REDES_SOCIAIS.map((rede) => {
            const erro = erros[rede.chave];
            const estado = valores[rede.chave];
            return (
              <div key={rede.chave} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`social-${rede.chave}`} className="flex items-center gap-1.5">
                    <SocialIcon rede={rede.chave} className="h-3.5 w-3.5 text-muted-foreground" />
                    {rede.rotulo}
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {estado.ativo ? "Exibindo" : "Oculta"}
                    </span>
                    <Switch
                      checked={estado.ativo}
                      onCheckedChange={(v) => setCampo(rede.chave, { ativo: v })}
                      aria-label={`Exibir ${rede.rotulo} na landing page`}
                    />
                  </div>
                </div>
                <Input
                  id={`social-${rede.chave}`}
                  value={estado.valor}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setCampo(rede.chave, {
                      valor,
                      ...(estado.valor.trim() === "" && valor.trim() !== "" ? { ativo: true } : {}),
                    });
                  }}
                  placeholder={rede.placeholder}
                  aria-invalid={!!erro}
                  className={cn(
                    erro && "border-destructive focus-visible:ring-destructive",
                    !estado.ativo && "opacity-60",
                  )}
                />
                {erro && <p className="text-xs text-destructive">{erro}</p>}
              </div>
            );
          })}
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
                <li
                  key={p.rede.chave}
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    !p.ativo && "text-muted-foreground/70",
                  )}
                >
                  <SocialIcon rede={p.rede.chave} className="h-3.5 w-3.5 text-muted-foreground" />
                  <a
                    href={p.href!}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all hover:underline"
                  >
                    {p.href}
                  </a>
                  {!p.ativo && <span className="shrink-0 text-[11px]">(oculta)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button type="submit" disabled={salvar.isPending || isLoading || qtdErros > 0}>
          {salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </form>
    </Card>
  );
}
