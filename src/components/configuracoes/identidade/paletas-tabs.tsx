import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { PaletaPicker } from "./paleta-picker";
import { PaletaGerador } from "./paleta-gerador";
import { CoresManuaisForm } from "./cores-manuais-form";
import { PALETAS_PRESETS, type PaletaPreset } from "./paleta-presets";

type Tema = "claro" | "escuro";

type Patch = {
  cor_primaria?: string;
  cor_secundaria?: string;
  cor_acento?: string;
  tema_cardapio?: Tema;
};

export function PaletasTabs({
  corPrimaria,
  corSecundaria,
  corAcento,
  tema,
  onChange,
}: {
  corPrimaria: string;
  corSecundaria: string;
  corAcento: string;
  tema: Tema;
  onChange: (patch: Patch) => void;
}) {
  const paletaAtivaId =
    PALETAS_PRESETS.find(
      (p) =>
        p.cor_primaria.toLowerCase() === corPrimaria.toLowerCase() &&
        p.cor_secundaria.toLowerCase() === corSecundaria.toLowerCase() &&
        p.cor_acento.toLowerCase() === corAcento.toLowerCase() &&
        p.tema === tema,
    )?.id ?? null;

  const [abaInicial] = useState<"prontas" | "gerar" | "manual">(() => {
    const match = PALETAS_PRESETS.find(
      (p) =>
        p.cor_primaria.toLowerCase() === corPrimaria.toLowerCase() &&
        p.cor_secundaria.toLowerCase() === corSecundaria.toLowerCase() &&
        p.cor_acento.toLowerCase() === corAcento.toLowerCase() &&
        p.tema === tema,
    );
    return match ? "prontas" : "manual";
  });

  function aplicarPaleta(p: PaletaPreset) {
    onChange({
      cor_primaria: p.cor_primaria,
      cor_secundaria: p.cor_secundaria,
      cor_acento: p.cor_acento,
      tema_cardapio: p.tema,
    });
  }

  return (
    <Tabs defaultValue={abaInicial} className="space-y-4">
      <TabsList className="flex w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="prontas">Paletas prontas</TabsTrigger>
        <TabsTrigger value="gerar">Gerar da minha cor</TabsTrigger>
        <TabsTrigger value="manual">Cores manuais</TabsTrigger>
      </TabsList>

      <TabsContent value="prontas">
        <PaletaPicker selecionadaId={paletaAtivaId} onSelect={aplicarPaleta} />
      </TabsContent>

      <TabsContent value="gerar">
        <PaletaGerador
          corPrimariaAtual={corPrimaria}
          corSecundariaAtual={corSecundaria}
          corAcentoAtual={corAcento}
          temaAtual={tema}
          onSelect={aplicarPaleta}
        />
      </TabsContent>

      <TabsContent value="manual">
        <p className="mb-3 text-xs text-muted-foreground">
          Ajuste fino sobre a paleta atual. As cores exibidas são as que estão ativas no cardápio agora.
        </p>
        <CoresManuaisForm
          primaria={corPrimaria}
          secundaria={corSecundaria}
          acento={corAcento}
          onChange={onChange}
        />
      </TabsContent>
    </Tabs>
  );
}