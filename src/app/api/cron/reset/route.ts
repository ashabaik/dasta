import { NextResponse } from "next/server";
import { seedWithEnv } from "../../../../../scripts/seed.mjs";

// Nightly reset of the sample data (see vercel.json). Vercel calls this with the CRON_SECRET; anyone else
// gets 401. It wipes the marketplace tables and all sample accounts and seeds the sample data again, so
// whatever visitors did during the day is gone the next morning.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  try {
    await seedWithEnv(
      {
        target: "demo",
        databaseUrl: process.env.DATABASE_URL,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        secretKey: process.env.SUPABASE_SECRET_KEY!,
        demoPassword: process.env.DEMO_USER_PASSWORD!,
      },
      { quiet: true },
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "reset_failed" }, { status: 500 });
  }
}
