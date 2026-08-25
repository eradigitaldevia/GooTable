import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { LegalLayout, LegalSecao } from "@/components/legal/legal-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { enviarSolicitacaoLgpdFn } from "@/lib/lgpd.functions";
import {
  LGPD_EMAIL_DPO,
  LGPD_PRAZO_RESPOSTA_DIAS,
  LGPD_TIPOS_SOLICITACAO,
} from "@/lib/lgpd";

const TITULO = "Direitos do titular (LGPD) — Mesa";
const DESC =
  "Solicite acesso, correção, portabilidade ou exclusão dos seus dados pessoais tratados na plataforma Mesa.";

export const Route = createFileRoute("/direitos")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESC },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DireitosPage,
});

const schema = z.object({
  tipo: z.enum(["consulta", "exclusao", "retificacao", "oposicao"]),
  nome: z.string().trim().min(2, "Informe seu nome completo"),
  email: z.string().trim().email("E-mail inválido"),
  telefone: z.string().trim().max(30).optional(),
  mensagem: z.string().trim().max(2000).optional(),
});

function DireitosPage() {
  const enviar = useServerFn(enviarSolicitacaoLgpdFn);
  const [form, setForm] = useState({
    tipo: "consulta",
    nome: "",
    email: "",
    telefone: "",
    mensagem: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setEnviando(true);
    try {
      await enviar({ data: parsed.data });
      setEnviado(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar solicitação");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <LegalLayout titulo="Direitos do titular">
      <LegalSecao titulo="Como funciona">
        <p>
          Você pode solicitar confirmação de tratamento, acesso, correção,
          portabilidade, eliminação dos dados ou opor-se ao tratamento.
          Responderemos pelo e-mail informado em até {LGPD_PRAZO_RESPOSTA_DIAS}{" "}
          dias. Também é possível escrever diretamente para {LGPD_EMAIL_DPO}.
        </p>
      </LegalSecao>

      {enviado ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">
            Recebemos sua solicitação
          </h2>
          <p className="mt-1 text-sm">
            Entraremos em contato pelo e-mail informado em até{" "}
            {LGPD_PRAZO_RESPOSTA_DIAS} dias.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de solicitação</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) => setForm({ ...form, tipo: v })}
            >
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LGPD_TIPOS_SOLICITACAO.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail para resposta</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              maxLength={160}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone usado nos pedidos (opcional)</Label>
            <Input
              id="telefone"
              type="tel"
              inputMode="numeric"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              maxLength={30}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensagem">Detalhes (opcional)</Label>
            <Textarea
              id="mensagem"
              value={form.mensagem}
              onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
              maxLength={2000}
              rows={4}
              placeholder="Descreva sua solicitação"
            />
          </div>

          <Button type="submit" className="h-11 w-full" disabled={enviando}>
            {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar solicitação
          </Button>
        </form>
      )}
    </LegalLayout>
  );
}
