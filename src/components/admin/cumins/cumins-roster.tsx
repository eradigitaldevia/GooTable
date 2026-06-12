import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Pencil,
  Plus,
  UserPlus,
  CheckCircle2,
  KeyRound,
  Mail,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAtualizarCumim,
  useCriarCumim,
  useCumins,
  useRedefinirSenhaCumim,
  useVincularUsuarioCumim,
  useAlterarEmailCumim,
} from "@/hooks/use-cumins";
import type { Cumim } from "@/lib/cumins.functions";
import { traduzirErroSenha } from "@/lib/auth-errors";

function CumimForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial?: Cumim;
  onSubmit: (data: { nome: string; telefone: string; ativo: boolean }) => void;
  submitting?: boolean;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [telefone, setTelefone] = useState(initial?.telefone ?? "");
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!nome.trim()) {
          toast.error("Informe o nome");
          return;
        }
        onSubmit({ nome, telefone, ativo });
      }}
    >
      <div>
        <Label htmlFor="c-nome">Nome</Label>
        <Input id="c-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="c-tel">Telefone</Label>
        <Input
          id="c-tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(11) 99999-9999"
        />
      </div>
      {initial && (
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <div className="text-sm font-medium">Ativo</div>
            <div className="text-xs text-muted-foreground">
              Cumins inativos não podem fazer login no painel.
            </div>
          </div>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </div>
      )}
      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CuminsRoster({ restauranteId }: { restauranteId: string }) {
  const { data: cumins = [], isLoading } = useCumins(restauranteId, true);
  const criar = useCriarCumim(restauranteId);
  const atualizar = useAtualizarCumim(restauranteId);
  const vincular = useVincularUsuarioCumim(restauranteId);
  const redefinirSenha = useRedefinirSenhaCumim(restauranteId);
  const alterarEmail = useAlterarEmailCumim(restauranteId);

  const [openNovo, setOpenNovo] = useState(false);
  const [edit, setEdit] = useState<Cumim | null>(null);
  const [vincularAlvo, setVincularAlvo] = useState<Cumim | null>(null);
  const [vincEmail, setVincEmail] = useState("");
  const [vincSenha, setVincSenha] = useState("");
  const [senhaAlvo, setSenhaAlvo] = useState<Cumim | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [emailAlvo, setEmailAlvo] = useState<Cumim | null>(null);
  const [novoEmail, setNovoEmail] = useState("");

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h3 className="text-base font-semibold">Cumins cadastrados</h3>
          <p className="text-xs text-muted-foreground">
            Cadastre os cumins (runners) e vincule um login para cada um.
          </p>
        </div>
        <Dialog open={openNovo} onOpenChange={setOpenNovo}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Novo cumim
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo cumim</DialogTitle>
            </DialogHeader>
            <CumimForm
              submitting={criar.isPending}
              onSubmit={async (d) => {
                try {
                  await criar.mutateAsync({
                    nome: d.nome,
                    telefone: d.telefone,
                  });
                  toast.success("Cumim adicionado");
                  setOpenNovo(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao salvar");
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Login</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading && cumins.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum cumim cadastrado.
                </td>
              </tr>
            )}
            {cumins.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.telefone ?? "—"}</td>
                <td className="px-4 py-3">
                  {c.ativo ? (
                    <Badge variant="secondary">Ativo</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inativo
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.user_id ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Vinculado
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Redefinir senha"
                        onClick={() => {
                          setSenhaAlvo(c);
                          setNovaSenha("");
                          setConfirmarSenha("");
                        }}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Alterar e-mail"
                        onClick={() => {
                          setEmailAlvo(c);
                          setNovoEmail("");
                        }}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setVincularAlvo(c);
                        setVincEmail("");
                        setVincSenha("");
                      }}
                    >
                      <UserPlus className="mr-1 h-3.5 w-3.5" /> Vincular
                    </Button>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      title="Visualizar tela do cumim (somente leitura)"
                    >
                      <Link
                        to="/admin/cumins/$cumimId/display"
                        params={{ cumimId: c.id }}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cumim</DialogTitle>
          </DialogHeader>
          {edit && (
            <CumimForm
              initial={edit}
              submitting={atualizar.isPending}
              onSubmit={async (d) => {
                try {
                  await atualizar.mutateAsync({
                    id: edit.id,
                    nome: d.nome,
                    telefone: d.telefone,
                    ativo: d.ativo,
                  });
                  toast.success("Cumim atualizado");
                  setEdit(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao salvar");
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!vincularAlvo}
        onOpenChange={(o) => !o && setVincularAlvo(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Vincular usuário {vincularAlvo ? `— ${vincularAlvo.nome}` : ""}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!vincularAlvo) return;
              const email = vincEmail.trim();
              if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
                toast.error("E-mail inválido");
                return;
              }
              if (vincSenha.length < 8) {
                toast.error("Senha deve ter ao menos 8 caracteres");
                return;
              }
              try {
                await vincular.mutateAsync({
                  cumimId: vincularAlvo.id,
                  email,
                  senha: vincSenha,
                });
                toast.success("Usuário criado e vinculado");
                setVincularAlvo(null);
              } catch (err) {
                toast.error(traduzirErroSenha(err));
              }
            }}
          >
            <div>
              <Label htmlFor="cvinc-email">E-mail</Label>
              <Input
                id="cvinc-email"
                type="email"
                value={vincEmail}
                onChange={(e) => setVincEmail(e.target.value)}
                placeholder="cumim@restaurante.com"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="cvinc-senha">Senha</Label>
              <Input
                id="cvinc-senha"
                type="text"
                value={vincSenha}
                onChange={(e) => setVincSenha(e.target.value)}
                placeholder="mín. 8 caracteres, evite senhas comuns"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Defina a senha que o cumim usará para fazer login. Ele poderá
                alterá-la depois.
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={vincular.isPending}>
                {vincular.isPending ? "Vinculando…" : "Criar e vincular"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!senhaAlvo}
        onOpenChange={(o) => {
          if (!o) {
            setSenhaAlvo(null);
            setNovaSenha("");
            setConfirmarSenha("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Redefinir senha {senhaAlvo ? `— ${senhaAlvo.nome}` : ""}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!senhaAlvo) return;
              if (novaSenha.length < 8) {
                toast.error("A senha deve ter no mínimo 8 caracteres");
                return;
              }
              if (novaSenha !== confirmarSenha) {
                toast.error("As senhas não coincidem");
                return;
              }
              try {
                await redefinirSenha.mutateAsync({
                  cumimId: senhaAlvo.id,
                  novaSenha,
                });
                toast.success("Senha redefinida");
                setSenhaAlvo(null);
                setNovaSenha("");
                setConfirmarSenha("");
              } catch (err) {
                toast.error(traduzirErroSenha(err));
              }
            }}
          >
            <div>
              <Label htmlFor="cumim-nova-senha">Nova senha</Label>
              <Input
                id="cumim-nova-senha"
                type="text"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="mín. 8 caracteres, evite senhas comuns"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="cumim-confirmar-senha">Confirmar senha</Label>
              <Input
                id="cumim-confirmar-senha"
                type="text"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="repita a senha"
                autoComplete="off"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  novaSenha.length < 8 ||
                  novaSenha !== confirmarSenha ||
                  redefinirSenha.isPending
                }
              >
                {redefinirSenha.isPending ? "Salvando…" : "Redefinir"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!emailAlvo}
        onOpenChange={(o) => {
          if (!o) {
            setEmailAlvo(null);
            setNovoEmail("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Alterar e-mail {emailAlvo ? `— ${emailAlvo.nome}` : ""}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!emailAlvo) return;
              const email = novoEmail.trim();
              if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
                toast.error("E-mail inválido");
                return;
              }
              try {
                await alterarEmail.mutateAsync({
                  cumimId: emailAlvo.id,
                  email,
                });
                toast.success("E-mail alterado");
                setEmailAlvo(null);
                setNovoEmail("");
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Erro ao alterar e-mail",
                );
              }
            }}
          >
            <div>
              <Label htmlFor="cumim-novo-email">Novo e-mail</Label>
              <Input
                id="cumim-novo-email"
                type="email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="cumim@restaurante.com"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                O cumim passará a usar este e-mail para fazer login.
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={alterarEmail.isPending}>
                {alterarEmail.isPending ? "Salvando…" : "Alterar e-mail"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}