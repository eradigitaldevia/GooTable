import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HorarioFuncionamentoForm } from "./horario-funcionamento-form";
import type { HorarioFuncionamento } from "@/lib/configuracoes.functions";

type GeralPatch = {
  nome?: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
  horario_funcionamento_habilitado?: boolean;
  horario_funcionamento?: HorarioFuncionamento;
};

export function GeralForm({
  nome,
  cnpj,
  telefone,
  endereco,
  horarioHabilitado,
  horario,
  onChange,
}: {
  nome: string;
  cnpj: string;
  telefone: string;
  endereco: string;
  horarioHabilitado: boolean;
  horario: HorarioFuncionamento;
  onChange: (patch: GeralPatch) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div>
          <h2 className="text-lg font-semibold">Informações do restaurante</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Dados de identificação e contato. CNPJ, telefone e endereço aparecem
            no cabeçalho dos comprovantes impressos.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Nome do restaurante</Label>
          <Input
            value={nome}
            onChange={(e) => onChange({ nome: e.target.value })}
            maxLength={100}
          />
        </div>

        <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
          <div>
            <div className="text-sm font-medium">Dados para impressão</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Aparecem no cabeçalho dos comprovantes impressos pelo garçom e pelo
              caixa. Campos opcionais — só aparece o que estiver preenchido.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>CNPJ</Label>
              <Input
                value={cnpj}
                maxLength={20}
                placeholder="00.000.000/0000-00"
                onChange={(e) => onChange({ cnpj: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input
                value={telefone}
                maxLength={30}
                placeholder="(11) 99999-9999"
                onChange={(e) => onChange({ telefone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Endereço</Label>
            <Input
              value={endereco}
              maxLength={200}
              placeholder="Rua X, 123 - Bairro - Cidade/UF"
              onChange={(e) => onChange({ endereco: e.target.value })}
            />
          </div>
        </div>
      </section>

      <HorarioFuncionamentoForm
        habilitado={horarioHabilitado}
        horario={horario}
        onChangeHabilitado={(v) => onChange({ horario_funcionamento_habilitado: v })}
        onChangeHorario={(h) => onChange({ horario_funcionamento: h })}
      />
    </div>
  );
}