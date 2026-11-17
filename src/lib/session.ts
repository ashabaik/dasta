import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";

export type Role = "buyer" | "seller" | "admin";

export type Viewer = {
  role: Role;
  sellerId: string | null;
  sellerCode: string | null;
  sellerStatus: "pending" | "active" | "suspended" | null;
  buyerId: string | null;
  buyerCode: string | null;
};

/**
 * Who is looking at the page. The answer comes from the database (function whoami), which reads the
 * role from the private schema using the verified session. Nothing here trusts the browser.
 *
 * Two savings, neither of which changes the answer:
 *  - a visitor with no session cookie is not signed in, so the database is not asked at all;
 *  - the layout and the page of one request share a single lookup.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const store = await cookies();
  if (!store.getAll().some((c) => /^sb-.+-auth-token/.test(c.name))) return null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("whoami");
  if (error || !data || data.length === 0) return null;
  const r = data[0];
  return {
    role: r.role,
    sellerId: r.seller_id,
    sellerCode: r.seller_code,
    sellerStatus: r.seller_status,
    buyerId: r.buyer_id,
    buyerCode: r.buyer_code,
  };
});

/** For dashboards: sends anyone without the role to the sign-in page. */
export async function requireRole(locale: string, role: Role): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== role) redirect(`/${locale}/signin`);
  return viewer;
}
