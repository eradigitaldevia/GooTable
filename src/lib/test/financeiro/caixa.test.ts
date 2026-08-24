import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getOrCreateTestUser,
  releaseTestUser,
  ensureSignedIn,
} from "@/lib/test/__helpers/auth";
import { createFixtures, cleanupFixtures, type FixtureContext } from "@/lib/test/__helpers/fixtures";

describe("Caixa", () => {
  let ctx: FixtureContext;
  let user: { userId: string; email: string; password: string };
  let client: any;

  beforeAll(async () => {
    const auth = await getOrCreateTestUser();
    client = auth.client;
    await ensureSignedIn(client);
    user = { userId: auth.userId, email: auth.email, password: (auth.client as any).__testCredentials.password };
    ctx = await createFixtures(auth.userId, auth.email);
  });

  afterAll(async () => {
    await cleanupFixtures(ctx);
    await releaseTestUser(user);
  });

  it("abre turno de caixa com fundo inicial", async () => {
    const { data: turnoId, error } = await client.rpc("abrir_turno_caixa", {
      _restaurante_id: ctx.restaurante.id,
      _operador_nome: "Operador Teste",
      _fundo_inicial: 100,
    });

    if (error) throw error;
    expect(turnoId).toBeTruthy();

    const { data: turno } = await client
      .from("turnos_caixa")
      .select("status, fundo_inicial")
      .eq("id", turnoId)
      .single();

    expect(turno?.status).toBe("aberto");
    expect(turno?.fundo_inicial).toBe(100);

    // Fecha para limpar
    await client.rpc("fechar_turno_caixa", {
      _turno_id: turnoId,
      _contagem_fisica: 100,
      _fundo_final: 100,
      _obs: "",
    });
  });

  it("registra sangria e suprimento", async () => {
    const { data: turnoId, error: abrirError } = await client.rpc("abrir_turno_caixa", {
      _restaurante_id: ctx.restaurante.id,
      _operador_nome: "Operador Teste",
      _fundo_inicial: 50,
    });
    if (abrirError) throw abrirError;

    const { error: sangriaError } = await client.rpc("registrar_movimento_caixa", {
      _turno_id: turnoId,
      _tipo: "sangria",
      _valor: 10,
      _motivo: "Sangria teste",
    });
    expect(sangriaError).toBeNull();

    const { error: suprimentoError } = await client.rpc("registrar_movimento_caixa", {
      _turno_id: turnoId,
      _tipo: "suprimento",
      _valor: 20,
      _motivo: "Suprimento teste",
    });
    expect(suprimentoError).toBeNull();

    const { data: totais } = await client.rpc("totais_turno_caixa", {
      _turno_id: turnoId,
    });
    expect(totais?.total_sangrias).toBe(10);
    expect(totais?.total_suprimentos).toBe(20);
    expect(totais?.saldo_esperado).toBe(60);

    await client.rpc("fechar_turno_caixa", {
      _turno_id: turnoId,
      _contagem_fisica: 60,
      _fundo_final: 60,
      _obs: "",
    });
  });
});
