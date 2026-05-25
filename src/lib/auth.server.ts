/**
 * Helpers server-only para verificação de permissões.
 * NÃO importar em código cliente.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Garante que o usuário é membro do restaurante (ou platform admin). */
export async function assertAcessoRestaurante(
  supabase: SupabaseClient<Database>,
  userId: string,
  restauranteId: string,
) {
  const [{ data: membro }, { data: pa }] = await Promise.all([
    supabase
      .from("restaurante_membros")
      .select("id")
      .eq("user_id", userId)
      .eq("restaurante_id", restauranteId)
      .maybeSingle(),
    supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (!membro && !pa) {
    throw new Response("Forbidden: sem acesso a este restaurante", { status: 403 });
  }
}

/** Garante que o usuário é platform admin. */
export async function assertPlatformAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Forbidden: not a platform admin", { status: 403 });
}
