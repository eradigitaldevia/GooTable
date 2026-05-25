import { useState } from "react";
import { Bell, Receipt, Coffee, HandPlatter, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { criarChamadoFn, listarTiposPublicoFn, type TipoChamado } from "@/lib/chamados.functions";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bell: Bell,
  receipt: Receipt,
  coffee: Coffee,
  hand: HandPlatter,
};

interface Props {
  qrToken: string;
  comandaId: string | null;
  sessaoId: string | null;
  clienteId: string | null;
  bottomOffset?: boolean;
}

export function ChamarGarcomFab({ qrToken, comandaId, sessaoId, clienteId, bottomOffset }: Props) {
  const [open, setOpen] = useState(false);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const listar = useServerFn(listarTiposPublicoFn);
  const criar = useServerFn(criarChamadoFn);

  const { data: tipos } = useQuery({
    queryKey: ["tipos-chamado-publico", qrToken],
    queryFn: () => listar({ data: { qrToken } }),
    enabled: !!qrToken,
  });

  const handleChamar = async (t: TipoChamado) => {
    try {
      setEnviandoId(t.id);
      const res = await criar({
        data: {
          qrToken,
          tipoChamadoId: t.id,
          comandaId,
          sessaoId,
          clienteId,
        },
      });
      if (!res.ok) {
        toast.warning(res.motivo ?? "Aguarde um instante");
      } else {
        toast.success("Solicitação enviada. Em instantes alguém virá até você.");
        setOpen(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setEnviandoId(null);
    }
  };

  if (!tipos?.length) return null;

  return (
    <>
      <Button
        size="icon"
        onClick={() => setOpen(true)}
        className={
          "fixed right-4 z-30 h-14 w-14 rounded-full shadow-lg " +
          (bottomOffset ? "bottom-24" : "bottom-6")
        }
        aria-label="Chamar atendimento"
      >
        <Bell className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Como podemos ajudar?</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid gap-2 pb-4">
            {tipos.map((t) => {
              const Icon = ICONS[t.icone] ?? Bell;
              const isLoading = enviandoId === t.id;
              return (
                <Button
                  key={t.id}
                  variant="outline"
                  className="h-14 justify-start gap-3 rounded-xl text-base"
                  onClick={() => handleChamar(t)}
                  disabled={!!enviandoId}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5 text-primary" />
                  )}
                  {t.nome}
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
