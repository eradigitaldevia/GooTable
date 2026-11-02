import { useCallback, useState } from "react";

export type EnderecoCep = { rua: string; bairro: string; cidade: string; uf: string };

async function viaCep(cep: string): Promise<EnderecoCep | null> {
  const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!r.ok) throw new Error("viacep");
  const j = await r.json();
  if (j.erro) return null;
  return { rua: j.logradouro ?? "", bairro: j.bairro ?? "", cidade: j.localidade ?? "", uf: j.uf ?? "" };
}

async function brasilApi(cep: string): Promise<EnderecoCep | null> {
  const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("brasilapi");
  const j = await r.json();
  return { rua: j.street ?? "", bairro: j.neighborhood ?? "", cidade: j.city ?? "", uf: j.state ?? "" };
}

/** Consulta CEP (ViaCEP com fallback BrasilAPI). Retorna null se inexistente. */
export function useBuscaCep() {
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(async (cepRaw: string): Promise<EnderecoCep | null> => {
    const cep = cepRaw.replace(/\D/g, "");
    if (cep.length !== 8) return null;
    setBuscando(true);
    setErro(null);
    try {
      let res: EnderecoCep | null;
      try {
        res = await viaCep(cep);
      } catch {
        res = await brasilApi(cep);
      }
      if (!res) setErro("CEP não encontrado. Preencha o endereço manualmente.");
      return res;
    } catch {
      setErro("Não foi possível consultar o CEP. Preencha manualmente.");
      return null;
    } finally {
      setBuscando(false);
    }
  }, []);

  return { buscar, buscando, erro };
}
