import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TermosConteudo } from "@/components/legal/termos-conteudo";
import { PrivacidadeConteudo } from "@/components/legal/privacidade-conteudo";
import { DireitosConteudo } from "@/components/legal/direitos-conteudo";
import { LGPD_VERSAO } from "@/lib/lgpd";

export type LegalDoc = "termos" | "privacidade" | "direitos";

const DOCS: Record<
  LegalDoc,
  { titulo: string; rota: string; versao: boolean }
> = {
  termos: { titulo: "Termos de Uso", rota: "/termos", versao: true },
  privacidade: {
    titulo: "Política de Privacidade",
    rota: "/privacidade",
    versao: true,
  },
  direitos: { titulo: "Direitos do titular", rota: "/direitos", versao: false },
};

export function LegalDialog({
  doc,
  open,
  onOpenChange,
}: {
  doc: LegalDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const atual = doc ? DOCS[doc] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle>{atual?.titulo ?? "Documento legal"}</DialogTitle>
          <DialogDescription>
            {atual?.versao
              ? `Última atualização: versão ${LGPD_VERSAO}`
              : "Exercício de direitos do titular (LGPD)"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 px-6 py-5">
          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
            {doc === "termos" && <TermosConteudo />}
            {doc === "privacidade" && <PrivacidadeConteudo />}
            {doc === "direitos" && <DireitosConteudo />}
          </div>
        </ScrollArea>

        {atual && (
          <div className="border-t border-border px-6 py-3">
            <Link
              to={atual.rota}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir página completa
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
