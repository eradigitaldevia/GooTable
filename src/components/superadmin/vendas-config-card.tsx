import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ExternalLink, Info, Loader2, MessageCircle } from "lucide-react";
import { montarLinkVendas, MENSAGEM_VENDAS_PADRAO } from "@/lib/vendas-link";
import { useAtualizarConfigVendas, usePlataformaConfig } from "@/hooks/use-plataforma-config";

export function VendasConfigCard() {
  const { data, isLoading } = usePlataformaConfig();
  const salvar = useAtualizarConfigVendas();
  const [numero, setNumero] = useState("");
  const [link, setLink] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!data) return;
    setNumero(data.vendas_whatsapp ?? "");
    setLink(data.vendas_link ?? "");
    setMensagem(data.vendas_mensagem ?? MENSAGEM_VENDAS_PADRAO);
  }, [data]);

  const vendasLink = useMemo(
    () => montarLinkVendas(numero, link, mensagem),
    [numero, link, mensagem],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    salvar.mutate(
      {
        vendas_whatsapp: numero.trim() || null,
        vendas_link: link.trim() || null,
        vendas_mensagem: mensagem.trim() || null,
      },
      {
        onSuccess: () => toast.success("Configuração de vendas salva"),
        onError: (err: unknown) =>
          toast.error(err instanceof Error ? err.message : "Erro ao salvar"),
      },
    );
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Vendas</h2>
      </div>

      <div className="mt-4 flex gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          Este link é usado em: <strong>landing</strong> — botão do header e botão do hero;{" "}
          <strong>tela de login</strong> — link “Fale com vendas”.
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="vendas-link">Link do WhatsApp de vendas</Label>
          <Input
            id="vendas-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://wa.me/message/XXXX"
          />
          <p className="text-xs text-muted-foreground">
            Quando preenchido, tem prioridade. Aceita wa.me, api.whatsapp.com e links de convite do
            WhatsApp Business.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vendas-whatsapp">Número do WhatsApp (fallback)</Label>
          <Input
            id="vendas-whatsapp"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="(88) 99999-9999"
            inputMode="tel"
          />
          <p className="text-xs text-muted-foreground">
            DDI 55 é assumido automaticamente. Usado apenas se o link acima estiver em branco.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vendas-mensagem">Mensagem pré-preenchida</Label>
          <Input
            id="vendas-mensagem"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder={MENSAGEM_VENDAS_PADRAO}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xs font-medium text-muted-foreground">Prévia do link</div>
          {vendasLink ? (
            <>
              <div className="mt-1 break-all text-xs">{vendasLink.href}</div>
              <div className="mt-2 flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={vendasLink.href} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Testar link
                  </a>
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">
              Configure um número ou link para ativar o botão “Fale com vendas”. O botão ficará
              inativo enquanto não houver WhatsApp.
            </div>
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
