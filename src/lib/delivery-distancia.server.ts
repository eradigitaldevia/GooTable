import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  calcularTaxaDistancia,
  taxaQuandoFalha,
  type FaixaKm,
  type FalhaDistancia,
  type ModeloKm,
  type ResultadoTaxaDistancia,
} from "./taxa-distancia";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const CACHE_DIAS = 30;
const LIMITE_DIA_RESTAURANTE = 300;
const LIMITE_HORA_VISITANTE = 10;

export interface EnderecoDestino {
  cep?: string | null;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface RestauranteDistanciaCfg {
  id: string;
  delivery_taxa_entrega: number | string | null;
  delivery_raio_km: number | string | null;
  delivery_origem_lat: number | null;
  delivery_origem_lng: number | null;
  delivery_km_modelo: string;
  delivery_km_faixas: unknown;
  delivery_km_base_valor: number | string;
  delivery_km_base_km: number | string;
  delivery_km_valor_extra: number | string;
  delivery_km_falha: string;
}

export type ResultadoEntregaDistancia = ResultadoTaxaDistancia & { distanciaKm: number | null };

function credenciais() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const maps = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovable || !maps) throw new Error("Google Maps não configurado");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": maps,
  };
}

async function erroGoogle(res: Response): Promise<never> {
  const body = await res.text();
  console.error(`[google-maps] falha [${res.status}]: ${body}`);
  if (res.status === 403) {
    throw new Error("Acesso ao Google Maps negado. Verifique a chave do Google Maps.");
  }
  throw new Error(`Falha no Google Maps [${res.status}]`);
}

export function enderecoTexto(e: EnderecoDestino): string {
  const cep = (e.cep ?? "").replace(/\D/g, "");
  return [`${e.rua}, ${e.numero}`, e.bairro, `${e.cidade} - ${e.uf.toUpperCase()}`, cep, "Brasil"]
    .filter(Boolean)
    .join(", ");
}

function chaveEndereco(e: EnderecoDestino): string {
  const n = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  return [(e.cep ?? "").replace(/\D/g, ""), n(e.rua), n(e.numero), n(e.cidade), e.uf.toUpperCase()].join("|");
}

/** Localiza um endereço (Geocoding). Retorna null se não encontrado. */
export async function geocodificar(
  endereco: string,
): Promise<{ lat: number; lng: number; formatado: string } | null> {
  const res = await fetch(
    `${GATEWAY_URL}/maps/api/geocode/json?region=br&language=pt-BR&address=${encodeURIComponent(endereco)}`,
    { headers: credenciais() },
  );
  if (!res.ok) await erroGoogle(res);
  const j = (await res.json()) as {
    status: string;
    results?: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } } }>;
  };
  if (j.status === "ZERO_RESULTS" || !j.results?.length) return null;
  if (j.status !== "OK") throw new Error(`Falha ao localizar endereço (${j.status})`);
  const r = j.results[0];
  return { lat: r.geometry.location.lat, lng: r.geometry.location.lng, formatado: r.formatted_address };
}

/** Rota de carro (Routes API). Retorna metros ou null se não houver rota. */
async function distanciaRota(lat: number, lng: number, destino: string): Promise<number | null> {
  const res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
    method: "POST",
    headers: {
      ...credenciais(),
      "Content-Type": "application/json",
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: lat, longitude: lng } } },
      destination: { address: destino },
      travelMode: "DRIVE",
      regionCode: "BR",
      languageCode: "pt-BR",
    }),
  });
  if (!res.ok) {
    if (res.status === 400 || res.status === 404) {
      console.warn(`[google-maps] rota não encontrada [${res.status}]: ${await res.text()}`);
      return null;
    }
    await erroGoogle(res);
  }
  const j = (await res.json()) as { routes?: Array<{ distanceMeters?: number }> };
  const rota = j.routes?.[0];
  if (!rota) return null;
  return rota.distanceMeters ?? 0;
}

function cfgTaxa(r: RestauranteDistanciaCfg) {
  const faixas = Array.isArray(r.delivery_km_faixas)
    ? (r.delivery_km_faixas as FaixaKm[]).map((f) => ({ ate_km: Number(f.ate_km), taxa: Number(f.taxa) }))
    : [];
  const raio = r.delivery_raio_km == null ? null : Number(r.delivery_raio_km);
  return {
    modelo: (r.delivery_km_modelo as ModeloKm) ?? "faixas",
    faixas,
    baseValor: Number(r.delivery_km_base_valor ?? 0),
    baseKm: Number(r.delivery_km_base_km ?? 0),
    valorKmExtra: Number(r.delivery_km_valor_extra ?? 0),
    raioMaxKm: raio && raio > 0 ? raio : null,
  };
}

/**
 * Calcula distância + taxa para o endereço, usando cache (30 dias) e limites de uso.
 * `visitante` identifica quem consulta (hash do IP) para o limite por hora.
 */
export async function resolverEntregaPorDistancia(
  r: RestauranteDistanciaCfg,
  endereco: EnderecoDestino,
  visitante: string,
): Promise<ResultadoEntregaDistancia> {
  const falha = (): ResultadoEntregaDistancia => ({
    ...taxaQuandoFalha((r.delivery_km_falha as FalhaDistancia) ?? "taxa_fixa", Number(r.delivery_taxa_entrega ?? 0)),
    distanciaKm: null,
  });
  if (r.delivery_origem_lat == null || r.delivery_origem_lng == null) return falha();

  const origem = `${r.delivery_origem_lat},${r.delivery_origem_lng}`;
  const chave = chaveEndereco(endereco);
  const limite = new Date(Date.now() - CACHE_DIAS * 86400000).toISOString();
  const { data: cache } = await supabaseAdmin
    .from("delivery_distancia_cache")
    .select("distancia_m, criado_em")
    .eq("restaurante_id", r.id)
    .eq("chave", chave)
    .eq("origem", origem)
    .gte("criado_em", limite)
    .maybeSingle();

  let metros: number | null = cache?.distancia_m ?? null;
  if (metros == null) {
    const { data: permitido, error: limErr } = await supabaseAdmin.rpc("registrar_consulta_distancia", {
      _restaurante_id: r.id,
      _visitante: visitante,
      _limite_dia: LIMITE_DIA_RESTAURANTE,
      _limite_hora: LIMITE_HORA_VISITANTE,
    });
    if (limErr || !permitido) return falha();
    try {
      metros = await distanciaRota(r.delivery_origem_lat, r.delivery_origem_lng, enderecoTexto(endereco));
    } catch (e) {
      console.error("[delivery-distancia]", e);
      return falha();
    }
    if (metros == null) return falha();
    await supabaseAdmin.from("delivery_distancia_cache").upsert({
      restaurante_id: r.id,
      chave,
      origem,
      distancia_m: metros,
      criado_em: new Date().toISOString(),
    });
  }

  const km = Math.round(metros / 10) / 100;
  return { ...calcularTaxaDistancia(km, cfgTaxa(r)), distanciaKm: km };
}

/** Identificador do visitante (hash do IP), sem guardar o IP em si. */
export async function idVisitante(ip: string | null | undefined): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip || "desconhecido"));
  return Array.from(new Uint8Array(buf).slice(0, 12))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}