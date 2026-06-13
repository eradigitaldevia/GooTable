import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, MessageCircle, Clock, Phone, Copy, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemaCardapioProvider } from "@/components/cliente/tema-cardapio-provider";
import { DeliveryHeader } from "@/components/delivery/delivery-header";
import { RastreioTimeline } from "@/components/delivery/rastreio-timeline";
import { getPedidoRastreioFn } from "@/lib/delivery.functions";
import { formatBRL } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/delivery/$slug_/pedido/$pedidoId")({
  component: RastreioPage,
});

const phoneKey = (slug: string) => `delivery-last-phone:${slug}`;

function formatTelefoneBR(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function RastreioPage() {
  const { slug, pedidoId } = Route.useParams();
  const fn = useServerFn(getPedidoRastreioFn);

  const [telefone, setTelefone] = useState<string | null>(null);
  const [telefoneInput, setTelefoneInput] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTelefone(window.localStorage.getItem(phoneKey(slug)));
  }, [slug]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["delivery-rastreio", slug, pedidoId, telefone],
    enabled: !!telefone,
    queryFn: () => fn({ data: { slug, pedidoId, telefone: telefone! } }),
    refetchInterval: 10_000,
    retry: 1,
  });

  const handleConfirmarTelefone = (e: React.FormEvent) => {
    e.preventDefault();
    const d = telefoneInput.replace(/\D/g, "");
    if (d.length < 10) {
      toast.error("Telefone inválido");
      return;
    }
    window.localStorage.setItem(phoneKey(slug), d);
    setTelefone(d);
  };

  const cores = useMemo(
    () => ({
      cor_primaria: data?.restaurante.cor_primaria ?? null,
      cor_secundaria: null,
      cor_acento: null,
      tema_cardapio: null,
    }),
    [data?.restaurante.cor_primaria],
  );

  if (!telefone) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <form
          onSubmit={handleConfirmarTelefone}
          className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6"
        >
          <div className="text-center">
            <Phone className="mx-auto mb-2 h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">Confirme seu telefone</h1>
            <p className="text-sm text-muted-foreground">
              Para acompanhar este pedido com segurança.
            </p>
          </div>
          <div>
            <Label htmlFor="tel-confirm">Telefone</Label>
            <Input
              id="tel-confirm"
              autoFocus
              inputMode="numeric"
              value={telefoneInput}
              onChange={(e) => setTelefoneInput(formatTelefoneBR(e.target.value))}
              placeholder="(11) 99999-9999"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 w-full rounded-2xl">
            Acompanhar
          </Button>
        </form>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {error ? (
          <div className="space-y-3 text-center">
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Não foi possível carregar"}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                window.localStorage.removeItem(phoneKey(slug));
                setTelefone(null);
              }}
            >
              Tentar com outro telefone
            </Button>
          </div>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        )}
      </div>
    );
  }

  const { status, modo, total, taxa_entrega, endereco_resumo, pagamento_metodo, pagamento_status, pix_payload, itens, criado_em, previsao_min, restaurante, id } =
    data;

  const waText = encodeURIComponent(
    `Olá! Estou acompanhando meu pedido #${id.slice(0, 8)} no ${restaurante.nome}.`,
  );
  const waLink = restaurante.whatsapp
    ? `https://wa.me/${restaurante.whatsapp.replace(/\D/g, "")}?text=${waText}`
    : null;

  return (
    <TemaCardapioProvider restaurante={cores} className="min-h-screen pb-10">
      <DeliveryHeader
        nome={restaurante.nome}
        logoUrl={restaurante.logo_url}
        backTo={{ to: "/delivery/$slug", params: { slug } }}
        subtitulo={`Pedido #${id.slice(0, 8)}`}
      />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <RastreioTimeline status={status} modo={modo} />
          {previsao_min && status !== "entregue" && status !== "cancelado" && (
            <p className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Estimativa total ~{previsao_min} min · feito{" "}
              {new Date(criado_em).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </section>

        {pix_payload && pagamento_status === "pendente" && (
          <PixBlock payload={pix_payload} valor={total} />
        )}

        {modo === "delivery" && endereco_resumo && (
          <section className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" />
              Endereço de entrega
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{endereco_resumo}</p>
          </section>
        )}

        <section className="space-y-2 rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Itens</h2>
          <ul className="divide-y">
            {itens.map((it, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {it.quantidade}× {it.nome}
                </span>
                <span className="text-muted-foreground">
                  {formatBRL(it.preco_unit * it.quantidade)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-1 border-t pt-2 text-sm">
            {taxa_entrega > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Taxa de entrega</span>
                <span>{formatBRL(taxa_entrega)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatBRL(total)}</span>
            </div>
            {pagamento_metodo && (
              <div className="text-xs text-muted-foreground">
                Pagamento: {pagamento_metodo.toUpperCase()} ·{" "}
                <span
                  className={
                    pagamento_status === "confirmado"
                      ? "text-success"
                      : pagamento_status === "pendente"
                        ? "text-accent-foreground"
                        : ""
                  }
                >
                  {pagamento_status ?? "—"}
                </span>
              </div>
            )}
          </div>
        </section>

        {waLink && (
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" className="h-12 w-full rounded-2xl">
              <MessageCircle className="mr-2 h-4 w-4" />
              Falar no WhatsApp
            </Button>
          </a>
        )}

        <Link
          to="/delivery/$slug"
          params={{ slug }}
          search={{ step: "identificacao" }}
          className="block"
        >
          <Button variant="ghost" className="h-11 w-full">
            Fazer outro pedido
          </Button>
        </Link>
      </main>
    </TemaCardapioProvider>
  );
}

function PixBlock({ payload, valor }: { payload: string; valor: number }) {
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Código PIX copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15 text-success">
          <QrCode className="h-4 w-4" />
        </div>
        <h2 className="font-semibold">Pague com PIX</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Escaneie o QR ou copie o código abaixo e finalize no seu banco.
      </p>
      <div className="mt-4 flex flex-col items-center gap-4 rounded-xl bg-background p-4">
        <QRCodeSVG value={payload} size={200} level="M" />
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-2xl font-bold text-primary">{formatBRL(valor)}</div>
        </div>
      </div>
      <Button onClick={copiar} className="mt-4 h-12 w-full rounded-2xl">
        <Copy className="mr-2 h-4 w-4" />
        Copiar código PIX
      </Button>
    </section>
  );
}