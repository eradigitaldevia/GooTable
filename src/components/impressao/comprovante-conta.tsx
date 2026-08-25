import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatBRL } from "@/lib/cart";

type Restaurante = {
  nome: string;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  logo_url?: string | null;
};

type Item = {
  nome: string;
  quantidade: number;
  preco_unit: number;
  observacao?: string | null;
};

type Couvert = { descricao: string; total: number };

type Pagamento = { metodo: string; valor: number; quando?: string | null };

export type ComprovanteContaProps = {
  restaurante: Restaurante;
  contexto: {
    tipo: "mesa" | "comanda";
    mesaNumero?: string | number | null;
    comandaTitular?: string | null;
    garcomNome?: string | null;
  };
  itens: Item[];
  couverts?: Couvert[];
  totais: {
    subtotal: number;
    couvert?: number;
    taxa_servico?: number;
    desconto?: number;
    total: number;
    total_pago?: number;
    saldo?: number;
  };
  pagamentos?: Pagamento[];
  divisao?: { pessoas: number; valorPorPessoa: number };
  variante: "rascunho" | "pago";
  /** Marca o cupom como reimpressão ("2ª VIA"). */
  segundaVia?: boolean;
};

const METODO_LABEL: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  fiado: "Fiado",
  outro: "Outro",
};

function formatDateTime(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Sep() {
  return (
    <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
  );
}

function Linha({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        fontWeight: bold ? 700 : 400,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function ComprovanteConta({
  restaurante,
  contexto,
  itens,
  couverts = [],
  totais,
  pagamentos = [],
  divisao,
  variante,
  segundaVia = false,
}: ComprovanteContaProps) {
  // O cupom é renderizado direto no <body> para que a regra de impressão possa
  // esconder toda a interface sem deixar páginas em branco.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;

  const conteudo = (
    <div className="print-only" data-print-root="">
      <div style={{ textAlign: "center" }}>
        {restaurante.logo_url ? (
          <img
            src={restaurante.logo_url}
            alt=""
            style={{
              maxWidth: "40mm",
              maxHeight: "20mm",
              display: "block",
              margin: "0 auto 4px",
            }}
          />
        ) : null}
        <div style={{ fontWeight: 700, fontSize: 13 }}>{restaurante.nome}</div>
        {restaurante.cnpj ? <div>CNPJ: {restaurante.cnpj}</div> : null}
        {restaurante.endereco ? <div>{restaurante.endereco}</div> : null}
        {restaurante.telefone ? <div>Tel: {restaurante.telefone}</div> : null}
      </div>

      <Sep />

      <div style={{ textAlign: "center", fontWeight: 700 }}>
        {variante === "pago" ? "COMPROVANTE DE PAGAMENTO" : "CONTA"}
      </div>
      <div style={{ textAlign: "center", marginTop: 2 }}>
        {contexto.tipo === "mesa"
          ? `Mesa ${contexto.mesaNumero ?? "—"}`
          : `Comanda: ${contexto.comandaTitular ?? "—"}`}
        {contexto.tipo === "comanda" && contexto.mesaNumero
          ? ` · Mesa ${contexto.mesaNumero}`
          : ""}
      </div>
      {contexto.garcomNome ? (
        <div style={{ textAlign: "center" }}>Garçom: {contexto.garcomNome}</div>
      ) : null}
      <div style={{ textAlign: "center" }}>{formatDateTime()}</div>

      <Sep />

      {itens.length === 0 ? (
        <div style={{ textAlign: "center" }}>Nenhum item.</div>
      ) : (
        <div>
          {itens.map((it, idx) => {
            const subtotal = it.quantidade * it.preco_unit;
            return (
              <div key={idx} style={{ marginBottom: 3 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ flex: 1 }}>
                    {it.quantidade}× {it.nome}
                  </span>
                  <span>{formatBRL(subtotal)}</span>
                </div>
                {it.observacao ? (
                  <div style={{ fontStyle: "italic", paddingLeft: 8 }}>
                    obs: {it.observacao}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {couverts.length > 0 ? (
        <>
          <Sep />
          {couverts.map((c, i) => (
            <Linha key={i} label={c.descricao} value={formatBRL(c.total)} />
          ))}
        </>
      ) : null}

      <Sep />

      <Linha label="Subtotal" value={formatBRL(totais.subtotal)} />
      {totais.couvert && totais.couvert > 0 ? (
        <Linha label="Couvert" value={formatBRL(totais.couvert)} />
      ) : null}
      {totais.taxa_servico && totais.taxa_servico > 0 ? (
        <Linha label="Taxa de serviço" value={formatBRL(totais.taxa_servico)} />
      ) : null}
      {totais.desconto && totais.desconto > 0 ? (
        <Linha label="Desconto" value={`- ${formatBRL(totais.desconto)}`} />
      ) : null}
      <Linha label="TOTAL" value={formatBRL(totais.total)} bold />
      {totais.total_pago != null ? (
        <Linha label="Pago" value={formatBRL(totais.total_pago)} />
      ) : null}
      {totais.saldo != null && totais.saldo > 0 ? (
        <Linha label="Saldo" value={formatBRL(totais.saldo)} bold />
      ) : null}

      {divisao ? (
        <>
          <Sep />
          <div style={{ textAlign: "center" }}>
            Dividido por {divisao.pessoas} pessoa{divisao.pessoas > 1 ? "s" : ""}
          </div>
          <Linha
            label="Por pessoa"
            value={formatBRL(divisao.valorPorPessoa)}
            bold
          />
        </>
      ) : null}

      {pagamentos.length > 0 ? (
        <>
          <Sep />
          <div style={{ fontWeight: 700 }}>PAGAMENTOS</div>
          {pagamentos.map((p, i) => (
            <Linha
              key={i}
              label={`${METODO_LABEL[p.metodo] ?? p.metodo}${p.quando ? ` · ${formatDateTime(p.quando)}` : ""}`}
              value={formatBRL(p.valor)}
            />
          ))}
        </>
      ) : null}

      {variante === "pago" ? (
        <>
          <Sep />
          <div
            style={{
              textAlign: "center",
              fontWeight: 700,
              fontSize: 14,
              border: "1px solid #000",
              padding: "4px 0",
              margin: "4px 0",
            }}
          >
            PAGO
          </div>
        </>
      ) : null}

      <Sep />
      <div style={{ textAlign: "center", fontSize: 10 }}>
        Não é documento fiscal
      </div>
      <div style={{ height: "8mm" }} />
    </div>
  );

  return createPortal(conteudo, document.body);
}