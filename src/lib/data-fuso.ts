/**
 * Utilitários de data no fuso operacional do restaurante (America/Sao_Paulo).
 *
 * O servidor (Cloudflare Workers) roda sempre em UTC, então `new Date()` +
 * `setHours(0,0,0,0)` corta o dia às 21h de Brasília. Estas funções calculam
 * o início/fim do dia no fuso correto e retornam o instante (UTC) equivalente.
 */

export const FUSO_OPERACIONAL = "America/Sao_Paulo";

function offsetMs(instante: Date, timeZone: string): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(instante);
  const nome = partes.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(nome);
  if (!m) return 0;
  const sinal = m[1] === "-" ? -1 : 1;
  return sinal * (Number(m[2]) * 60 + Number(m[3])) * 60_000;
}

/** Data local (YYYY-MM-DD) do instante informado, no fuso operacional. */
export function dataLocal(d: Date = new Date(), timeZone = FUSO_OPERACIONAL): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Instante correspondente a uma data local (YYYY-MM-DD) + hora local. */
function instanteLocal(ymd: string, hora: string, timeZone = FUSO_OPERACIONAL): Date {
  const aproximado = Date.parse(`${ymd}T${hora}Z`);
  const off = offsetMs(new Date(aproximado), timeZone);
  return new Date(aproximado - off);
}

/** 00:00:00.000 do dia informado (padrão: hoje) no fuso operacional. */
export function inicioDoDia(base: Date | string = new Date(), timeZone = FUSO_OPERACIONAL): Date {
  const ymd = typeof base === "string" ? base.slice(0, 10) : dataLocal(base, timeZone);
  return instanteLocal(ymd, "00:00:00.000", timeZone);
}

/** 23:59:59.999 do dia informado (padrão: hoje) no fuso operacional. */
export function fimDoDia(base: Date | string = new Date(), timeZone = FUSO_OPERACIONAL): Date {
  const ymd = typeof base === "string" ? base.slice(0, 10) : dataLocal(base, timeZone);
  return instanteLocal(ymd, "23:59:59.999", timeZone);
}

/** 00:00:00.000 do primeiro dia do mês corrente no fuso operacional. */
export function inicioDoMes(base: Date = new Date(), timeZone = FUSO_OPERACIONAL): Date {
  const ymd = dataLocal(base, timeZone);
  return instanteLocal(`${ymd.slice(0, 8)}01`, "00:00:00.000", timeZone);
}
