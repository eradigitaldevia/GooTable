import { config } from "dotenv";

// Try loading a local .env.test for local runs; otherwise rely on injected env vars.
config({ path: ".env.test" });

if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for integration tests."
  );
}
