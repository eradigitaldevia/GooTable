import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useAdicionarMembroEquipe,
  useAlterarPapelMembro,
  useConvidarMembroEquipe,
  useCriarMembroEquipe,
  useEquipe,
  useReenviarConviteMembro,
  useRemoverMembroEquipe,
} from "@/hooks/use-equipe";
import type { PapelMembro } from "@/lib/equipe.functions";

const PAPEL_LABEL: Record<PapelMembro, string> = {
  admin: "Admin",
  staff: "Staff",
  cozinheiro: "Cozinheiro",
};

const PAPEL_DESC: Record<PapelMembro, string> = {
  admin: "Acesso total ao painel administrativo",
  staff: "Acesso ao painel (exceto equipe)",
  cozinheiro: "Apenas o Display de cozinha",
};

interface Membro {
  id: string;
  user_id: string;
  papel: PapelMembro;
  email: string;
}

export function EquipePanel({ restauranteId }: { restauranteId: string }) {
  const { data } = useEquipe(restauranteId);
  const adicionar = useAdicionarMembroEquipe(restauranteId);
  const convidar = useConvidarMembroEquipe(restauranteId);
  const criar = useCriarMembroEquipe(restauranteId);
  const alterar = useAlterarPapelMembro(restauranteId);
  const remover = useRemoverMembroEquipe(restauranteId);
  const reenviar = useReenviarConviteMembro(restauranteId);

  const [novoEmail, setNovoEmail] = useState("");
  const [novoPapel, setNovoPapel] = useState<PapelMembro>("cozinheiro");
  const [convEmail, setConvEmail] = useState("");
  const [convPapel, setConvPapel] = useState<PapelMembro>("cozinheiro");
  const [criarEmail, setCriarEmail] = useState("");
  const [criarSenha, setCriarSenha] = useState("");
  const [criarPapel, setCriarPapel] = useState<PapelMembro>("cozinheiro");
  const [confirmacao, setConfirmacao] = useState<
    | { tipo: "papel"; membro: Membro; novoPapel: PapelMembro }
    | { tipo: "remover"; membro: Membro }
    | null
  >(null);

  const membros = (data?.membros ?? []) as Membro[];
  const meuUserId = data?.meuUserId;

  const handleAdd = async () => {
    if (!novoEmail) return;
    try {
      await adicionar.mutateAsync({ email: novoEmail, papel: novoPapel });
      toast.success("Membro adicionado");
      setNovoEmail("");
      setNovoPapel("cozinheiro");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao adicionar membro");
    }
  };

  const handleConvidar = async () => {
    if (!convEmail) return;
    try {
      const res = await convidar.mutateAsync({ email: convEmail, papel: convPapel });
      toast.success(
        res?.jaExistia
          ? "Usuário já existia e foi vinculado ao restaurante"
          : "Convite enviado por email",
      );
      setConvEmail("");
      setConvPapel("cozinheiro");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar convite");
    }
  };

  const handleCriar = async () => {
    if (!criarEmail || !criarSenha) return;
    try {
      await criar.mutateAsync({
        email: criarEmail,
        senha: criarSenha,
        papel: criarPapel,
      });
      toast.success("Membro criado");
      setCriarEmail("");
      setCriarSenha("");
      setCriarPapel("cozinheiro");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar membro");
    }
  };

  const handleReenviar = async (membroId: string) => {
    try {
      const res = await reenviar.mutateAsync({ membroId });
      toast.success(
        res?.tipo === "convite"
          ? "Convite reenviado por email"
          : "Link de redefinição de senha enviado",
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao reenviar");
    }
  };

  const tentarAlterarPapel = (membro: Membro, novoPapel: PapelMembro) => {
    if (membro.papel === novoPapel) return;
    const precisaConfirmar =
      membro.user_id === meuUserId || (membro.papel === "admin" && novoPapel !== "admin");
    if (precisaConfirmar) {
      setConfirmacao({ tipo: "papel", membro, novoPapel });
    } else {
      aplicarAlterarPapel(membro.id, novoPapel);
    }
  };

  const aplicarAlterarPapel = async (membroId: string, novoPapel: PapelMembro) => {
    try {
      await alterar.mutateAsync({ membroId, novoPapel });
      toast.success("Papel atualizado");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao alterar papel");
    }
  };

  const aplicarRemover = async (membroId: string) => {
    try {
      await remover.mutateAsync({ membroId });
      toast.success("Membro removido");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao remover");
    }
  };

  return (
    <>
      <Card className="space-y-5 p-6">
        <div>
          <h2 className="text-base font-semibold">Adicionar membro</h2>
          <p className="text-xs text-muted-foreground">
            Escolha como adicionar a pessoa ao restaurante.
          </p>
        </div>

        <Tabs defaultValue="convidar" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
            <TabsTrigger value="convidar">Convidar</TabsTrigger>
            <TabsTrigger value="criar">Criar direto</TabsTrigger>
            <TabsTrigger value="existente">Existente</TabsTrigger>
          </TabsList>

          <TabsContent value="convidar" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Enviamos um email com link para a pessoa definir a própria senha.
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
              <div>
                <Label htmlFor="conv-email">Email</Label>
                <Input
                  id="conv-email"
                  type="email"
                  value={convEmail}
                  onChange={(e) => setConvEmail(e.target.value)}
                  placeholder="usuario@exemplo.com"
                />
              </div>
              <div>
                <Label>Papel</Label>
                <Select value={convPapel} onValueChange={(v) => setConvPapel(v as PapelMembro)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["admin", "staff", "cozinheiro"] as PapelMembro[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        <div className="flex flex-col">
                          <span className="font-medium">{PAPEL_LABEL[p]}</span>
                          <span className="text-xs text-muted-foreground">{PAPEL_DESC[p]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleConvidar} disabled={!convEmail || convidar.isPending}>
                Enviar convite
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="criar" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Cria a conta com uma senha temporária. Compartilhe a senha com a pessoa.
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end">
              <div>
                <Label htmlFor="criar-email">Email</Label>
                <Input
                  id="criar-email"
                  type="email"
                  value={criarEmail}
                  onChange={(e) => setCriarEmail(e.target.value)}
                  placeholder="usuario@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="criar-senha">Senha temporária</Label>
                <Input
                  id="criar-senha"
                  type="text"
                  value={criarSenha}
                  onChange={(e) => setCriarSenha(e.target.value)}
                  placeholder="mínimo 6 caracteres"
                />
              </div>
              <div>
                <Label>Papel</Label>
                <Select value={criarPapel} onValueChange={(v) => setCriarPapel(v as PapelMembro)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["admin", "staff", "cozinheiro"] as PapelMembro[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PAPEL_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCriar}
                disabled={!criarEmail || criarSenha.length < 6 || criar.isPending}
              >
                Criar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="existente" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              A pessoa precisa já ter uma conta criada com este email.
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
              <div>
                <Label htmlFor="novo-email">Email</Label>
                <Input
                  id="novo-email"
                  type="email"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  placeholder="usuario@exemplo.com"
                />
              </div>
              <div>
                <Label>Papel</Label>
                <Select value={novoPapel} onValueChange={(v) => setNovoPapel(v as PapelMembro)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["admin", "staff", "cozinheiro"] as PapelMembro[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        <div className="flex flex-col">
                          <span className="font-medium">{PAPEL_LABEL[p]}</span>
                          <span className="text-xs text-muted-foreground">{PAPEL_DESC[p]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={!novoEmail || adicionar.isPending}>
                Adicionar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {membros.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum membro.
                </td>
              </tr>
            )}
            {membros.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{m.email}</span>
                    {m.user_id === meuUserId && (
                      <Badge variant="secondary" className="text-[10px]">
                        você
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={m.papel}
                    onValueChange={(v) => tentarAlterarPapel(m, v as PapelMembro)}
                    disabled={alterar.isPending}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["admin", "staff", "cozinheiro"] as PapelMembro[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {PAPEL_LABEL[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Reenviar convite / redefinir senha"
                      onClick={() => handleReenviar(m.id)}
                      disabled={reenviar.isPending}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setConfirmacao({ tipo: "remover", membro: m })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <AlertDialog
        open={!!confirmacao}
        onOpenChange={(open) => !open && setConfirmacao(null)}
      >
        <AlertDialogContent>
          {confirmacao?.tipo === "papel" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar alteração de papel</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmacao.membro.user_id === meuUserId
                    ? `Você está alterando o seu próprio papel para "${PAPEL_LABEL[confirmacao.novoPapel]}". Pode perder acesso a partes do sistema.`
                    : `Rebaixar "${confirmacao.membro.email}" de Admin para "${PAPEL_LABEL[confirmacao.novoPapel]}".`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const c = confirmacao;
                    setConfirmacao(null);
                    aplicarAlterarPapel(c.membro.id, c.novoPapel);
                  }}
                >
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {confirmacao?.tipo === "remover" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover membro</AlertDialogTitle>
                <AlertDialogDescription>
                  Remover "{confirmacao.membro.email}" do restaurante? Esta pessoa perderá o
                  acesso imediatamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const c = confirmacao;
                    setConfirmacao(null);
                    aplicarRemover(c.membro.id);
                  }}
                >
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}