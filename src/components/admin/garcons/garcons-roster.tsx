import { useState } from "react";
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
import { Pencil, Plus, UserPlus, CheckCircle2, FileText, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  useAtualizarGarcom,
  useCriarGarcom,
  useGarcons,
  useRedefinirSenhaGarcom,
  useVincularUsuarioGarcom,
  useAlterarEmailGarcom,
} from "@/hooks/use-garcons";
import type { Garcom } from "@/lib/garcons.functions";
import { ExtratoGarcomDialog } from "./extrato-garcom-dialog";

function GarcomForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial?: Garcom;
  onSubmit: (data: {
    nome: string;
    telefone: string;
    percentualComissao: number;
    ativo: boolean;
  }) => void;
  submitting?: boolean;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [telefone, setTelefone] = useState(initial?.telefone ?? "");
  const [percentual, setPercentual] = useState(
    String(initial?.percentual_comissao ?? 8),
  );
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const p = Number(percentual.replace(",", "."));
        if (!nome.trim()) {
          toast.error("Informe o nome");
          return;
        }
        if (Number.isNaN(p) || p < 0 || p > 100) {
          toast.error("Percentual inválido (0 a 100)");
          return;
        }
        onSubmit({ nome, telefone, percentualComissao: p, ativo });
      }}
    >
      <div>
        <Label htmlFor="g-nome">Nome</Label>
        <Input id="g-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="g-tel">Telefone</Label>
        <Input
          id="g-tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(11) 99999-9999"
        />
      </div>
      <div>
        <Label htmlFor="g-pct">% Comissão</Label>
        <Input
          id="g-pct"
          inputMode="decimal"
          value={percentual}
          onChange={(e) => setPercentual(e.target.value)}
        />
      </div>
      {initial && (
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <div className="text-sm font-medium">Ativo</div>
            <div className="text-xs text-muted-foreground">
              Garçons inativos não podem ser atribuídos a mesas.
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

export function GarconsRoster({ restauranteId }: { restauranteId: string }) {
  const { data: garcons = [], isLoading } = useGarcons(restauranteId, true);
  const criar = useCriarGarcom(restauranteId);
  const atualizar = useAtualizarGarcom(restauranteId);
  const vincular = useVincularUsuarioGarcom(restauranteId);
  const redefinirSenha = useRedefinirSenhaGarcom(restauranteId);
  const alterarEmail = useAlterarEmailGarcom(restauranteId);
  const [openNovo, setOpenNovo] = useState(false);
  const [edit, setEdit] = useState<Garcom | null>(null);
  const [vincularAlvo, setVincularAlvo] = useState<Garcom | null>(null);
  const [vincEmail, setVincEmail] = useState("");
  const [vincSenha, setVincSenha] = useState("");
  const [extratoAlvo, setExtratoAlvo] = useState<Garcom | null>(null);
  const [senhaAlvo, setSenhaAlvo] = useState<Garcom | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [emailAlvo, setEmailAlvo] = useState<Garcom | null>(null);
  const [novoEmail, setNovoEmail] = useState("");

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h3 className="text-base font-semibold">Garçons cadastrados</h3>
          <p className="text-xs text-muted-foreground">
            Defina nome, contato e percentual de comissão por garçom.
          </p>
        </div>
        <Dialog open={openNovo} onOpenChange={setOpenNovo}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Novo garçom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo garçom</DialogTitle>
            </DialogHeader>
            <GarcomForm
              submitting={criar.isPending}
              onSubmit={async (d) => {
                try {
                  await criar.mutateAsync({
                    nome: d.nome,
                    telefone: d.telefone,
                    percentualComissao: d.percentualComissao,
                  });
                  toast.success("Garçom adicionado");
                  setOpenNovo(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao salvar");
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">Telefone</th>
            <th className="px-4 py-3">%</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Login</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                Carregando…
              </td>
            </tr>
          )}
          {!isLoading && garcons.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                Nenhum garçom cadastrado.
              </td>
            </tr>
          )}
          {garcons.map((g) => (
            <tr key={g.id}>
              <td className="px-4 py-3 font-medium">{g.nome}</td>
              <td className="px-4 py-3 text-muted-foreground">{g.telefone ?? "—"}</td>
              <td className="px-4 py-3 tabular-nums">{Number(g.percentual_comissao).toFixed(2)}%</td>
              <td className="px-4 py-3">
                {g.ativo ? (
                  <Badge variant="secondary">Ativo</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inativo
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3">
                {g.user_id ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Vinculado
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Redefinir senha"
                      onClick={() => {
                        setSenhaAlvo(g);
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
                        setEmailAlvo(g);
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
                      setVincularAlvo(g);
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
                    size="sm"
                    variant="ghost"
                    title="Extrato"
                    onClick={() => setExtratoAlvo(g)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEdit(g)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar garçom</DialogTitle>
          </DialogHeader>
          {edit && (
            <GarcomForm
              initial={edit}
              submitting={atualizar.isPending}
              onSubmit={async (d) => {
                try {
                  await atualizar.mutateAsync({
                    id: edit.id,
                    nome: d.nome,
                    telefone: d.telefone,
                    percentualComissao: d.percentualComissao,
                    ativo: d.ativo,
                  });
                  toast.success("Garçom atualizado");
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
              if (vincSenha.length < 6) {
                toast.error("Senha deve ter ao menos 6 caracteres");
                return;
              }
              try {
                await vincular.mutateAsync({
                  garcomId: vincularAlvo.id,
                  email,
                  senha: vincSenha,
                });
                toast.success("Usuário criado e vinculado");
                setVincularAlvo(null);
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Erro ao vincular",
                );
              }
            }}
          >
            <div>
              <Label htmlFor="vinc-email">E-mail</Label>
              <Input
                id="vinc-email"
                type="email"
                value={vincEmail}
                onChange={(e) => setVincEmail(e.target.value)}
                placeholder="garcom@restaurante.com"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="vinc-senha">Senha</Label>
              <Input
                id="vinc-senha"
                type="text"
                value={vincSenha}
                onChange={(e) => setVincSenha(e.target.value)}
                placeholder="mínimo 6 caracteres"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Defina a senha que o garçom usará para fazer login. Ele poderá
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

      <ExtratoGarcomDialog
        restauranteId={restauranteId}
        garcom={extratoAlvo}
        onClose={() => setExtratoAlvo(null)}
      />

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
              if (novaSenha.length < 6) {
                toast.error("A senha deve ter no mínimo 6 caracteres");
                return;
              }
              if (novaSenha !== confirmarSenha) {
                toast.error("As senhas não coincidem");
                return;
              }
              try {
                await redefinirSenha.mutateAsync({
                  garcomId: senhaAlvo.id,
                  novaSenha,
                });
                toast.success("Senha redefinida");
                setSenhaAlvo(null);
                setNovaSenha("");
                setConfirmarSenha("");
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Erro ao redefinir senha",
                );
              }
            }}
          >
            <div>
              <Label htmlFor="garcom-nova-senha">Nova senha</Label>
              <Input
                id="garcom-nova-senha"
                type="text"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="mínimo 6 caracteres"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="garcom-confirmar-senha">Confirmar senha</Label>
              <Input
                id="garcom-confirmar-senha"
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
                  novaSenha.length < 6 ||
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
                  garcomId: emailAlvo.id,
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
              <Label htmlFor="garcom-novo-email">Novo e-mail</Label>
              <Input
                id="garcom-novo-email"
                type="email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="garcom@restaurante.com"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                O garçom passará a usar este e-mail para fazer login.
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