import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ComandaPreparoItem = {
  nome: string;
  quantidade: number;
  observacao?: string | null;
};

export type ComandaPreparoProps = {
  destino: "cozinha" | "bar";
  variante: "novo" | "adicional" | "cancelamento";
  mesaNumero?: string | number | null;
  comandaTitular?: string | null;
  garcomNome?: string | null;
  canal?: string | null;
  observacao?: string | null;
  itens: ComandaPreparoItem[];
  pedidoId: string;
  criadoEm?: string | null;
  motivo?: string | null;
};

function hora(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function Sep() {
  return <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />;
}

/**
 * Cupom de preparo (80mm) impresso automaticamente pelas telas de Cozinha/Bar.
 * Não contém valores — é uma via de produção.
 */
export function ComandaPreparo({
  destino,
  variante,
  mesaNumero,
  comandaTitular,
  garcomNome,
  canal,
  observacao,
  itens,
  pedidoId,
  criadoEm,
  motivo,
}: ComandaPreparoProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;

  const conteudo = (
    <div className="print-only" data-print-root="">
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 15 }}>
        {destino === "bar" ? "BAR" : "COZINHA"}
      </div>

      {variante !== "novo" ? (
        <div
          style={{
            textAlign: "center",
            fontWeight: 700,
            letterSpacing: 1,
            border: "1px dashed #000",
            padding: "2px 0",
            margin: "3px 0",
          }}
        >
          {variante === "adicional" ? "** ADICIONAL **" : "** CANCELAMENTO **"}
        </div>
      ) : null}

      <div style={{ textAlign: "center", marginTop: 2, fontSize: 13 }}>
        {canal === "delivery"
          ? "DELIVERY"
          : `Mesa ${mesaNumero ?? "—"}`}
        {comandaTitular ? ` · ${comandaTitular}` : ""}
      </div>
      <div style={{ textAlign: "center" }}>
        {garcomNome ? `Garçom: ${garcomNome} · ` : ""}
        {hora(criadoEm)}
      </div>

      <Sep />

      {itens.length === 0 ? (
        <div style={{ textAlign: "center" }}>Sem itens.</div>
      ) : (
        <div>
          {itens.map((it, idx) => (
            <div key={idx} style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {it.quantidade}× {it.nome}
              </div>
              {it.observacao ? (
                <div style={{ fontStyle: "italic", paddingLeft: 10 }}>
                  obs: {it.observacao}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {observacao ? (
        <>
          <Sep />
          <div style={{ fontStyle: "italic" }}>obs. do pedido: {observacao}</div>
        </>
      ) : null}

      {motivo ? (
        <>
          <Sep />
          <div style={{ fontStyle: "italic" }}>motivo: {motivo}</div>
        </>
      ) : null}

      <Sep />
      <div style={{ textAlign: "center", fontSize: 10 }}>
        Pedido #{pedidoId.slice(0, 6)}
      </div>
      <div style={{ height: "8mm" }} />
    </div>
  );

  return createPortal(conteudo, document.body);
}
