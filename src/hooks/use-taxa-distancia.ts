import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { calcularDistanciaEntregaFn } from "@/lib/delivery-distancia.functions";
import type { EnderecoCliente } from "@/lib/delivery.functions";

export type EstadoTaxaDistancia =
  | { status: "inativo" | "aguardando" | "carregando" }
  | { status: "ok"; distanciaKm: number | null; taxa: number }
  | { status: "erro"; erro: string };

/** Calcula a taxa por distância no checkout (com espera após digitar). */
export function useTaxaDistancia(
  slug: string,
  endereco: EnderecoCliente | null | undefined,
  ativo: boolean,
): EstadoTaxaDistancia {
  const fn = useServerFn(calcularDistanciaEntregaFn);
  const completo =
    !!endereco &&
    (endereco.cep ?? "").replace(/\D/g, "").length === 8 &&
    !!endereco.rua.trim() &&
    !!endereco.numero.trim() &&
    !!endereco.cidade.trim() &&
    endereco.uf.trim().length === 2;
  const chave = completo
    ? [endereco.cep, endereco.rua, endereco.numero, endereco.bairro, endereco.cidade, endereco.uf]
        .map((s) => (s ?? "").trim().toLowerCase())
        .join("|")
    : "";

  const [chaveEstavel, setChaveEstavel] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setChaveEstavel(chave), 800);
    return () => clearTimeout(t);
  }, [chave]);

  const pronto = ativo && completo && chaveEstavel === chave;
  const q = useQuery({
    queryKey: ["taxa-distancia", slug, chaveEstavel],
    enabled: pronto,
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: () =>
      fn({
        data: {
          slug,
          endereco: {
            cep: endereco?.cep ?? null,
            rua: endereco?.rua ?? "",
            numero: endereco?.numero ?? "",
            bairro: endereco?.bairro ?? "",
            cidade: endereco?.cidade ?? "",
            uf: endereco?.uf ?? "",
          },
        },
      }),
  });

  if (!ativo) return { status: "inativo" };
  if (!completo) return { status: "aguardando" };
  if (!pronto || q.isFetching || !q.data) {
    if (q.isError) return { status: "erro", erro: "Não foi possível calcular a taxa" };
    return { status: "carregando" };
  }
  if (!q.data.ok) return { status: "erro", erro: q.data.erro };
  return { status: "ok", distanciaKm: q.data.distanciaKm, taxa: q.data.taxa };
}