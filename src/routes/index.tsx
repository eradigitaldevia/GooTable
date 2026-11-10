import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { usePlataformaConfig } from "@/hooks/use-plataforma-config";
import { montarLinkVendas } from "@/lib/vendas-link";
import { REDES_SOCIAIS, montarLinkSocial } from "@/lib/social-links";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingModulosNav } from "@/components/landing/landing-modulos-nav";
import { LandingSalaoSection } from "@/components/landing/landing-salao-section";
import { LandingDeliverySection } from "@/components/landing/landing-delivery-section";
import { LandingKdsSection } from "@/components/landing/landing-kds-section";
import { LandingRetaguardaSection } from "@/components/landing/landing-retaguarda-section";
import { LandingDiferenciaisSection } from "@/components/landing/landing-diferenciais-section";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

const CookieBanner = lazy(() =>
  import("@/components/legal/cookie-banner").then((m) => ({ default: m.CookieBanner })),
);
const CookiePreferenciasDialog = lazy(() =>
  import("@/components/legal/cookie-preferencias-dialog").then((m) => ({
    default: m.CookiePreferenciasDialog,
  })),
);

const TITULO = "GooTable — Operação e gestão completa para restaurantes";
const DESCRICAO =
  "Pedidos por QR Code, delivery próprio sem comissão, KDS com impressão automática, estoque com ficha técnica e financeiro com DRE.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESCRICAO },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESCRICAO },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const cookies = useCookieConsent("landing");
  const { data: config } = usePlataformaConfig();
  const vendas = montarLinkVendas(config?.vendas_whatsapp, config?.vendas_link, config?.vendas_mensagem);
  const vendasProps: Record<string, string> = vendas?.isWhatsapp ? { target: "_blank", rel: "noreferrer" } : {};
  const vendasHref = vendas?.href ?? undefined;

  const sociais = REDES_SOCIAIS.filter((rede) => config?.[rede.campoAtivo] ?? true)
    .map((rede) => ({
      chave: rede.chave,
      rotulo: rede.rotulo,
      href: montarLinkSocial(rede.chave, config?.[rede.campo]),
    }))
    .filter((s): s is { chave: typeof s.chave; rotulo: string; href: string } => !!s.href);

  return (
    <div className="min-h-screen bg-background">
      <LandingHero vendasHref={vendasHref} vendasProps={vendasProps} />
      <LandingModulosNav />
      <LandingSalaoSection />
      <LandingDeliverySection />
      <LandingKdsSection />
      <LandingRetaguardaSection />
      <LandingDiferenciaisSection />
      <LandingCtaSection vendasHref={vendasHref} vendasProps={vendasProps} />
      <LandingFooter sociais={sociais} onAbrirCookies={cookies.abrirPreferencias} />

      <ClientOnly>
        <Suspense fallback={null}>
          {cookies.mostrarBanner && (
            <CookieBanner
              onAceitarTodos={cookies.aceitarTodos}
              onRejeitar={cookies.rejeitarNaoEssenciais}
              onPersonalizar={cookies.abrirPreferencias}
            />
          )}
          <CookiePreferenciasDialog
            open={cookies.dialogAberto}
            onOpenChange={(o) => (o ? cookies.abrirPreferencias() : cookies.fecharPreferencias())}
            preferencias={cookies.preferencias}
            onSalvar={cookies.salvarPreferencias}
          />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
