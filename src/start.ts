import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/**
 * Anexa o Bearer token da sessão Supabase a toda chamada de server function
 * feita a partir do cliente. O `requireSupabaseAuth` (server-side) lê esse
 * header para validar o usuário.
 */
const supabaseAuthClientMiddleware = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let headers: Record<string, string> | undefined;
    if (typeof window !== "undefined") {
      const { supabase } = await import("./integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers = { Authorization: `Bearer ${token}` };
    }
    return next(headers ? { headers } : undefined);
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [attachSupabaseAuth, supabaseAuthClientMiddleware],
}));
