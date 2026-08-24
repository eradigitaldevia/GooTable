import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "./supabase";

let userPool: { email: string; password: string; userId: string }[] = [];

export async function getOrCreateTestUser(): Promise<{
  client: ReturnType<typeof createClient<Database>>;
  userId: string;
  email: string;
}> {
  const existing = userPool.pop();
  if (existing) {
    const client = createAuthenticatedClient(existing.email, existing.password);
    return { client, userId: existing.userId, email: existing.email };
  }

  const suffix = crypto.randomUUID().slice(0, 8);
  const email = `test-${suffix}@example.com`;
  const password = `TestPass123!${suffix}`;

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !created.user) {
    throw error ?? new Error("Failed to create test user");
  }

  const client = createAuthenticatedClient(email, password);
  return { client, userId: created.user.id, email };
}

export async function releaseTestUser(user: {
  userId: string;
  email: string;
  password: string;
}) {
  userPool.push({
    userId: user.userId,
    email: user.email,
    password: user.password,
  });
}

function createAuthenticatedClient(email: string, password: string) {
  const client = createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  // Synchronous login is not available; caller must sign in before using.
  // We attach credentials to the client for reuse.
  (client as any).__testCredentials = { email, password };
  return client;
}

export async function ensureSignedIn(
  client: ReturnType<typeof createClient<Database>>
) {
  const creds = (client as any).__testCredentials as
    | { email: string; password: string }
    | undefined;
  if (!creds) throw new Error("Client missing test credentials");

  const { error } = await client.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });
  if (error) throw error;
}
