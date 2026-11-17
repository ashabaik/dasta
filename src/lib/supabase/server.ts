import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * Database client that acts as the visitor. Every query goes through row level security with the
 * visitor's own session. This is the client pages and actions use.
 */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called while rendering a page: cookies are read-only there. The proxy refreshes them.
        }
      },
    },
  });
}

/**
 * Privileged client (secret key, bypasses row level security). Used in exactly three places:
 * creating throwaway sample accounts, storing a re-encoded product photo, and payment webhooks.
 * Never import this into a page that renders data.
 */
export function supabaseAdmin() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
