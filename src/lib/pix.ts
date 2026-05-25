// Gerador de payload BR Code (PIX estático) — implementação EMV TLV pura.
// Fonte: spec do BACEN — Manual do BR Code.

function tlv(id: string, value: string) {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

// CRC16-CCITT (poly 0x1021, init 0xFFFF) — exigido pelo padrão BR Code.
function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(s: string, max: number) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .slice(0, max);
}

export interface PixParams {
  chave: string;
  nomeTitular: string;
  cidade?: string;
  valor?: number;
  txid?: string;
  descricao?: string;
}

export function gerarPixPayload({
  chave,
  nomeTitular,
  cidade = "BRASIL",
  valor,
  txid = "***",
  descricao,
}: PixParams) {
  const merchantAccountInfo = [
    tlv("00", "BR.GOV.BCB.PIX"),
    tlv("01", chave.trim()),
    descricao ? tlv("02", sanitize(descricao, 50)) : "",
  ].join("");

  const additional = tlv("05", sanitize(txid, 25) || "***");

  const parts = [
    tlv("00", "01"), // Payload Format Indicator
    tlv("26", merchantAccountInfo), // Merchant Account Info — PIX
    tlv("52", "0000"), // Merchant Category Code
    tlv("53", "986"), // Currency BRL
    valor && valor > 0 ? tlv("54", valor.toFixed(2)) : "",
    tlv("58", "BR"),
    tlv("59", sanitize(nomeTitular, 25) || "TITULAR"),
    tlv("60", sanitize(cidade, 15) || "BRASIL"),
    tlv("62", additional),
  ].join("");

  const partial = parts + "6304";
  return partial + crc16(partial);
}
