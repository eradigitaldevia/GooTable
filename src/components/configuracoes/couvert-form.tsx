import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function CouvertForm({
  mesaHabilitado,
  mesaValor,
  mesaDescricao,
  artisticoHabilitado,
  artisticoValor,
  artisticoDescricao,
  repasseHabilitado,
  repassePercentual,
  onChange,
}: {
  mesaHabilitado: boolean;
  mesaValor: string;
  mesaDescricao: string;
  artisticoHabilitado: boolean;
  artisticoValor: string;
  artisticoDescricao: string;
  repasseHabilitado: boolean;
  repassePercentual: string;
  onChange: (patch: {
    couvert_mesa_habilitado?: boolean;
    couvert_mesa_valor?: string;
    couvert_mesa_descricao?: string;
    couvert_artistico_habilitado?: boolean;
    couvert_artistico_valor?: string;
    couvert_artistico_descricao?: string;
    couvert_artistico_repasse_habilitado?: boolean;
    couvert_artistico_repasse_percentual?: string;
  }) => void;
}) {
  return (
    <section className="space-y-6 rounded-lg border border-border bg-card p-4">
      <header>
        <h2 className="text-base font-semibold">Couvert</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O couvert nunca é cobrado automaticamente — o garçom lança apenas
          quando o cliente consumir (mesa) ou estiver na área com acesso
          visual/acústico (artístico), conforme o CDC.
        </p>
      </header>

      {/* Couvert de mesa */}
      <div className="space-y-3 rounded-md border border-border p-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Couvert de mesa</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Porção de pães, patês, azeitonas etc. servida antes da refeição.
              Só pode ser cobrada se o cliente solicitar/consumir.
            </p>
          </div>
          <Switch
            checked={mesaHabilitado}
            onCheckedChange={(v) => onChange({ couvert_mesa_habilitado: v })}
            aria-label="Habilitar couvert de mesa"
          />
        </div>

        {mesaHabilitado && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Valor por porção (R$)</Label>
              <Input
                inputMode="decimal"
                placeholder="12,00"
                value={mesaValor}
                onChange={(e) => onChange({ couvert_mesa_valor: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Composição</Label>
              <Textarea
                rows={2}
                placeholder="Pães variados, patês, azeitonas…"
                value={mesaDescricao}
                onChange={(e) => onChange({ couvert_mesa_descricao: e.target.value })}
                maxLength={300}
              />
            </div>
          </div>
        )}
      </div>

      {/* Couvert artístico */}
      <div className="space-y-3 rounded-md border border-border p-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Couvert artístico</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Taxa para remunerar artistas ao vivo. Proibido cobrar por som
              mecânico, TV ou para clientes sem acesso visual/acústico.
            </p>
          </div>
          <Switch
            checked={artisticoHabilitado}
            onCheckedChange={(v) => onChange({ couvert_artistico_habilitado: v })}
            aria-label="Habilitar couvert artístico"
          />
        </div>

        {artisticoHabilitado && (
          <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Valor por pessoa (R$)</Label>
              <Input
                inputMode="decimal"
                placeholder="15,00"
                value={artisticoValor}
                onChange={(e) => onChange({ couvert_artistico_valor: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição / evento</Label>
              <Textarea
                rows={2}
                placeholder="Música ao vivo — sex/sáb 20h"
                value={artisticoDescricao}
                onChange={(e) => onChange({ couvert_artistico_descricao: e.target.value })}
                maxLength={300}
              />
            </div>
          </div>
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">Repasse aos artistas</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Defina quanto do couvert artístico arrecadado vai para os
                  artistas (rateado conforme o peso configurado em cada
                  apresentação). Ex.: 100% = todo o couvert vai para os
                  artistas; 80% = 20% fica para a casa.
                </p>
                <a
                  href="/admin/couvert-artistico"
                  className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                >
                  Gerenciar artistas e apresentações →
                </a>
              </div>
              <Switch
                checked={repasseHabilitado}
                onCheckedChange={(v) =>
                  onChange({ couvert_artistico_repasse_habilitado: v })
                }
                aria-label="Habilitar repasse do couvert artístico aos artistas"
              />
            </div>
            {repasseHabilitado && (
              <div className="mt-3 max-w-xs space-y-1">
                <Label>% do couvert que vai para os artistas</Label>
                <Input
                  inputMode="decimal"
                  placeholder="100"
                  value={repassePercentual}
                  onChange={(e) =>
                    onChange({
                      couvert_artistico_repasse_percentual: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">Entre 0 e 100%.</p>
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </section>
  );
}
