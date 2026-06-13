import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CouvertArtisticoForm } from "@/components/configuracoes/couvert-form";
import { useAuth } from "@/hooks/use-auth";
import { useMeuRestaurante } from "@/hooks/use-restaurante";
import { useAtualizarConfiguracoes } from "@/hooks/use-configuracoes";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { UnsavedChangesDialog } from "@/components/configuracoes/unsaved-changes-dialog";

export function TaxaCouvertTab() {
  const { user } = useAuth();
  const { data: restaurante } = useMeuRestaurante(user?.id);
  const atualizar = useAtualizarConfiguracoes(user?.id);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    couvert_artistico_habilitado: false,
    couvert_artistico_valor: "" as string,
    couvert_artistico_descricao: "",
    couvert_artistico_repasse_habilitado: false,
    couvert_artistico_repasse_percentual: "" as string,
  });

  const prevSnapshotRef = useRef<typeof form | null>(null);

  useEffect(() => {
    if (!restaurante) return;
    const next: typeof form = {
      couvert_artistico_habilitado: restaurante.couvert_artistico_habilitado ?? false,
      couvert_artistico_valor:
        restaurante.couvert_artistico_valor != null
          ? String(restaurante.couvert_artistico_valor)
          : "",
      couvert_artistico_descricao: restaurante.couvert_artistico_descricao ?? "",
      couvert_artistico_repasse_habilitado:
        restaurante.couvert_artistico_repasse_habilitado ?? false,
      couvert_artistico_repasse_percentual:
        restaurante.couvert_artistico_repasse_percentual != null
          ? String(restaurante.couvert_artistico_repasse_percentual)
          : "",
    };
    const prev = prevSnapshotRef.current;
    if (prev == null) {
      setForm(next);
    } else {
      setForm((curr) => {
        const merged = { ...curr };
        (Object.keys(next) as (keyof typeof form)[]).forEach((k) => {
          if (curr[k] === prev[k]) {
            (merged[k] as typeof next[typeof k]) = next[k];
          }
        });
        return merged;
      });
    }
    prevSnapshotRef.current = next;
  }, [restaurante]);

  const snapshot = useMemo(() => {
    if (!restaurante) return null;
    return {
      couvert_artistico_habilitado: restaurante.couvert_artistico_habilitado ?? false,
      couvert_artistico_valor:
        restaurante.couvert_artistico_valor != null
          ? String(restaurante.couvert_artistico_valor)
          : "",
      couvert_artistico_descricao: restaurante.couvert_artistico_descricao ?? "",
      couvert_artistico_repasse_habilitado:
        restaurante.couvert_artistico_repasse_habilitado ?? false,
      couvert_artistico_repasse_percentual:
        restaurante.couvert_artistico_repasse_percentual != null
          ? String(restaurante.couvert_artistico_repasse_percentual)
          : "",
    } as typeof form;
  }, [restaurante]);

  const isDirty = useMemo(() => {
    if (!snapshot) return false;
    return (Object.keys(form) as (keyof typeof form)[]).some(
      (k) => form[k] !== snapshot[k],
    );
  }, [form, snapshot]);

  const guard = useUnsavedChangesGuard({ isDirty });

  function patch(p: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function parseNumOrNull(raw: string, max: number, label: string): number | null | "ERR" {
    const t = raw.trim();
    if (t === "") return null;
    const n = Number(t.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > max) {
      toast.error(`${label} inválido (0–${max})`);
      return "ERR";
    }
    return n;
  }

  async function salvar() {
    if (!restaurante) return;
    const r3 = parseNumOrNull(form.couvert_artistico_valor, 1000, "Couvert artístico (R$)");
    if (r3 === "ERR") return;
    const r5 = parseNumOrNull(
      form.couvert_artistico_repasse_percentual,
      100,
      "Repasse aos artistas (%)",
    );
    if (r5 === "ERR") return;

    if (form.couvert_artistico_habilitado && (r3 == null || r3 <= 0)) {
      toast.error("Informe o valor por pessoa do couvert artístico.");
      return;
    }
    if (
      form.couvert_artistico_habilitado &&
      form.couvert_artistico_repasse_habilitado &&
      (r5 == null || r5 <= 0)
    ) {
      toast.error("Informe o percentual de repasse aos artistas.");
      return;
    }

    setSalvando(true);
    try {
      await atualizar.mutateAsync({
        aba: "couvert-artistico",
        restauranteId: restaurante.id,
        couvert_artistico_habilitado: form.couvert_artistico_habilitado,
        couvert_artistico_valor: r3,
        couvert_artistico_descricao: form.couvert_artistico_descricao.trim() || null,
        couvert_artistico_repasse_habilitado:
          form.couvert_artistico_habilitado && form.couvert_artistico_repasse_habilitado,
        couvert_artistico_repasse_percentual: form.couvert_artistico_habilitado ? r5 : null,
      });
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <UnsavedChangesDialog
        open={guard.status === "blocked"}
        onCancel={() => guard.reset?.()}
        onDiscard={() => {
          if (snapshot) {
            setForm(snapshot);
            prevSnapshotRef.current = snapshot;
          }
          guard.proceed?.();
        }}
      />
      <CouvertArtisticoForm
        artisticoHabilitado={form.couvert_artistico_habilitado}
        artisticoValor={form.couvert_artistico_valor}
        artisticoDescricao={form.couvert_artistico_descricao}
        repasseHabilitado={form.couvert_artistico_repasse_habilitado}
        repassePercentual={form.couvert_artistico_repasse_percentual}
        onChange={patch}
      />
      <div className="flex justify-end">
        <Button onClick={salvar} disabled={salvando} className="h-11 px-6">
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}