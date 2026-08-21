import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HorarioFuncionamentoForm } from "./horario-funcionamento-form";
import type { HorarioFuncionamento } from "@/lib/configuracoes.functions";

type GeralPatch = {
  nome?: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
  horario_funcionamento?: HorarioFuncionamento;
  url_publica_cardapio?: string;
  sessao_ociosa_horas?: number;
};

export function GeralForm({
  nome,
  cnpj,
  telefone,
  endereco,
  horario,
  urlPublicaCardapio,
  sessaoOciosaHoras,
  onChange,
}: {
  nome: string;
  cnpj: string;
  telefone: string;
  endereco: string;
  horario: HorarioFuncionamento;
  urlPublicaCardapio: string;
  sessaoOciosaHoras: number;
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
          <p className="text-xs text-muted-foreground">
            Aparece em destaque no cabeçalho dos comprovantes impressos.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
          <div>
            <div className="text-sm font-medium">Dados para impressão</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Complementam o nome do restaurante no cabeçalho dos comprovantes
              impressos. Campos opcionais — só aparece o que estiver preenchido.
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

        <div className="space-y-2">
          <Label>URL pública do cardápio</Label>
          <Input
            value={urlPublicaCardapio}
            maxLength={200}
            placeholder="https://dine-tap-flow.lovable.app"
            onChange={(e) => onChange({ url_publica_cardapio: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Endereço usado nos QR Codes das mesas. Deixe em branco para usar o
            domínio atual. Use o domínio publicado (ou o seu domínio próprio)
            para que clientes consigam abrir o cardápio sem fazer login.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Liberar mesa sem pedido após (horas)</Label>
          <Input
            type="number"
            min={1}
            max={48}
            value={sessaoOciosaHoras}
            onChange={(e) =>
              onChange({ sessao_ociosa_horas: Number(e.target.value) })
            }
            className="max-w-[140px]"
          />
          <p className="text-xs text-muted-foreground">
            Mesas que abriram sessão pelo QR Code e ficaram sem nenhum pedido
            voltam para "Livre" automaticamente após esse tempo. Quando a mesa
            é liberada, o cliente verá a mensagem "Sua mesa foi liberada por
            inatividade. Leia o QR Code da mesa para pedir novamente" e precisará
            ler o QR Code novamente para fazer novos pedidos. Mesas com consumo
            lançado nunca são liberadas automaticamente.
          </p>
        </div>
      </section>

      <HorarioFuncionamentoForm
        horario={horario}
        onChangeHorario={(h) => onChange({ horario_funcionamento: h })}
      />
    </div>
  );
}