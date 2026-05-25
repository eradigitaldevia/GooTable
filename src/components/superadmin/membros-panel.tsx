import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdicionarMembro, useMembros, useRemoverMembro } from "@/hooks/use-superadmin";

export function MembrosPanel({ restauranteId }: { restauranteId: string }) {
  const { data } = useMembros(restauranteId);
  const adicionar = useAdicionarMembro(restauranteId);
  const remover = useRemoverMembro(restauranteId);
  const [novoEmail, setNovoEmail] = useState("");

  const membros = data?.membros ?? [];

  const handleAdd = async () => {
    if (!novoEmail) return;
    try {
      await adicionar.mutateAsync({ email: novoEmail, papel: "admin" });
      toast.success("Membro adicionado");
      setNovoEmail("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemove = async (membroId: string) => {
    if (!confirm("Remover este membro?")) return;
    try {
      await remover.mutateAsync({ membroId });
      toast.success("Removido");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label>Adicionar membro por email</Label>
          <Input
            type="email"
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            placeholder="usuario@exemplo.com"
          />
        </div>
        <Button onClick={handleAdd} disabled={!novoEmail || adicionar.isPending}>
          Adicionar
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Papel</th>
              <th className="px-4 py-2"></th>
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
            {membros.map((m: any) => (
              <tr key={m.id}>
                <td className="px-4 py-2">{m.email}</td>
                <td className="px-4 py-2">
                  <Badge variant="secondary">{m.papel}</Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemove(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
