import type { NextConfig } from "next";

// Product photographs live in the Supabase storage bucket of the project this build points at.
const storageHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;

const nextConfig: NextConfig = {
  images: {
    qualities: [60, 75],
    remotePatterns: storageHost ? [{ protocol: "https", hostname: storageHost, pathname: "/storage/v1/object/public/product-images/**" }] : [],
  },
  // Every signed-in page is rendered per request. Nothing private is prerendered or shared between
  // visitors, so the component cache and partial prefetching stay off in this app.
  cacheComponents: false,
  partialPrefetching: false,
  poweredByHeader: false,
  // The nightly reset reads the sample photographs from disk; make sure they are shipped with that function.
  outputFileTracingIncludes: { "/api/cron/reset": ["./scripts/seed-images/**/*"] },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // Pages and actions: never stored by a shared cache.
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
