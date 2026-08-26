export type ContratoEstado = "sem_data" | "ok" | "proximo" | "vencido";

export type ContratoStatus = {
  estado: ContratoEstado;
  dias: number;
  rotulo: string;
};

/** Calcula o estado do contrato a partir da data de vencimento (YYYY-MM-DD). */
export function contratoStatus(vencimento: string | null | undefined): ContratoStatus {
  if (!vencimento) return { estado: "sem_data", dias: 0, rotulo: "" };

  const [ano, mes, dia] = vencimento.slice(0, 10).split("-").map(Number);
  if (!ano || !mes || !dia) return { estado: "sem_data", dias: 0, rotulo: "" };

  const alvo = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dias = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  const data = alvo.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  if (dias < 0) {
    const atraso = Math.abs(dias);
    return {
      estado: "vencido",
      dias,
      rotulo: atraso === 1 ? "Vencido há 1 dia" : `Vencido há ${atraso} dias`,
    };
  }
  if (dias === 0) return { estado: "proximo", dias, rotulo: "Vence hoje" };
  if (dias <= 7) {
    return { estado: "proximo", dias, rotulo: dias === 1 ? "Vence amanhã" : `Vence em ${dias} dias` };
  }
  return { estado: "ok", dias, rotulo: `Vence em ${data}` };
}
