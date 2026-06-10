import type { RelatorioComissoes } from "./relatorios.functions";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function csvEscape(v: string | number) {
  const s = String(v);
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportarRelatorioCSV(rel: RelatorioComissoes) {
  const linhas: string[] = [];
  linhas.push(
    [
      "Garçom",
      "Data",
      "Pedido",
      "Valor pedido",
      "%",
      "Peso",
      "Comissão",
      "Status",
    ]
      .map(csvEscape)
      .join(";"),
  );
  for (const g of rel.garcons) {
    for (const c of g.comissoes) {
      linhas.push(
        [
          g.garcom_nome,
          fmtDateTime(c.calculado_em),
          c.pedido_id.slice(0, 8),
          c.valor_pedido.toFixed(2).replace(".", ","),
          c.percentual.toFixed(2).replace(".", ","),
          c.peso.toFixed(0),
          c.valor_comissao.toFixed(2).replace(".", ","),
          c.status,
        ]
          .map(csvEscape)
          .join(";"),
      );
    }
    for (const b of g.bonus) {
      linhas.push(
        [
          g.garcom_nome,
          fmtDateTime(b.calculado_em),
          `BONUS:${b.meta_nome}`,
          "",
          "",
          "",
          b.valor.toFixed(2).replace(".", ","),
          b.status,
        ]
          .map(csvEscape)
          .join(";"),
      );
    }
    for (const t of g.taxa_servico) {
      linhas.push(
        [
          g.garcom_nome,
          fmtDateTime(t.calculado_em),
          `TAXA:${t.comanda_id.slice(0, 8)}`,
          t.valor_taxa_total.toFixed(2).replace(".", ","),
          `${t.percentual_repasse.toFixed(2)}% repasse`,
          t.peso.toFixed(0),
          t.valor_repasse.toFixed(2).replace(".", ","),
          t.status,
        ]
          .map(csvEscape)
          .join(";"),
      );
    }
  }
  const csv = "\uFEFF" + linhas.join("\n");
  const fname = `comissoes_${rel.restaurante.nome}_${rel.periodo.inicio.slice(0, 10)}_${rel.periodo.fim.slice(0, 10)}.csv`;
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), fname);
}

export async function gerarRelatorioPDF(rel: RelatorioComissoes) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.text(`Extrato de comissões — ${rel.restaurante.nome}`, 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Período: ${fmtDate(rel.periodo.inicio)} a ${fmtDate(rel.periodo.fim)}    Emitido em ${fmtDateTime(rel.gerado_em)}`,
    40,
    58,
  );
  doc.setTextColor(0);

  let cursorY = 80;

  if (rel.garcons.length === 0) {
    doc.setFontSize(11);
    doc.text("Nenhum dado para o período selecionado.", 40, cursorY);
  }

  for (const g of rel.garcons) {
    if (cursorY > 720) {
      doc.addPage();
      cursorY = 40;
    }
    doc.setFontSize(12);
    doc.text(g.garcom_nome, 40, cursorY);
    doc.setFontSize(9);
    doc.setTextColor(90);
    const linhaResumo =
      `Pedidos: ${g.totais.pedidos_count}   Vendido: ${brl(g.totais.total_vendido)}   ` +
      `Comissão pend.: ${brl(g.totais.comissao_pendente)}   paga: ${brl(g.totais.comissao_paga)}   ` +
      `Bônus pend.: ${brl(g.totais.bonus_pendente)}   pago: ${brl(g.totais.bonus_pago)}   ` +
      `Taxa serv. pend.: ${brl(g.totais.taxa_servico_pendente)}   paga: ${brl(g.totais.taxa_servico_paga)}   ` +
      `Total a pagar: ${brl(g.totais.total_pagar)}`;
    doc.text(linhaResumo, 40, cursorY + 14, { maxWidth: pageWidth - 80 });
    doc.setTextColor(0);
    cursorY += 36;

    if (g.comissoes.length > 0) {
      autoTable(doc, {
        startY: cursorY,
        head: [["Data", "Pedido", "Valor", "%", "Peso", "Comissão", "Status"]],
        body: g.comissoes.map((c) => [
          fmtDateTime(c.calculado_em),
          c.pedido_id.slice(0, 8),
          brl(c.valor_pedido),
          `${c.percentual.toFixed(2)}%`,
          `${c.peso.toFixed(0)}%`,
          brl(c.valor_comissao),
          c.status,
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [240, 240, 240], textColor: 30 },
        margin: { left: 40, right: 40 },
      });
      cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }

    if (g.bonus.length > 0) {
      autoTable(doc, {
        startY: cursorY,
        head: [["Data", "Meta", "Tipo", "Período ref.", "Valor", "Status"]],
        body: g.bonus.map((b) => [
          fmtDateTime(b.calculado_em),
          b.meta_nome,
          b.meta_tipo,
          fmtDate(b.periodo_ref),
          brl(b.valor),
          b.status,
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [240, 240, 240], textColor: 30 },
        margin: { left: 40, right: 40 },
      });
      cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }

    if (g.taxa_servico.length > 0) {
      autoTable(doc, {
        startY: cursorY,
        head: [["Data", "Comanda", "Taxa total", "% repasse", "Peso", "Repasse", "Status"]],
        body: g.taxa_servico.map((t) => [
          fmtDateTime(t.calculado_em),
          t.comanda_id.slice(0, 8),
          brl(t.valor_taxa_total),
          `${t.percentual_repasse.toFixed(2)}%`,
          `${t.peso.toFixed(0)}`,
          brl(t.valor_repasse),
          t.status,
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [240, 240, 240], textColor: 30 },
        margin: { left: 40, right: 40 },
      });
      cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }

    cursorY += 8;
  }

  const total = rel.garcons.reduce((acc, g) => acc + g.totais.total_pagar, 0);
  if (cursorY > 760) {
    doc.addPage();
    cursorY = 40;
  }
  doc.setFontSize(11);
  doc.text(`Total geral a pagar: ${brl(total)}`, 40, cursorY + 10);

  const fname = `comissoes_${rel.restaurante.nome}_${rel.periodo.inicio.slice(0, 10)}_${rel.periodo.fim.slice(0, 10)}.pdf`;
  doc.save(fname);
}