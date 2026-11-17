import type { NextConfig } from "next";

// Product photographs live in the Supabase storage bucket of the project this build points at.
const storageHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;

const nextConfig: NextConfig = {
  images: {
    qualities: [60, 75],
    // 480 fills the gap between 384 and 640: the size a mid-density phone needs for a two-thirds-wide photo.
    imageSizes: [32, 48, 64, 96, 128, 256, 384, 480],
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
  // The first address of this project forwards to the current one, path kept.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "makbas-nu.vercel.app" }],
        destination: "https://dasta-wholesale.vercel.app/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Pages and actions: never stored by a shared cache.
        source: "/((?!_next/static|_next/image|favicon.ico|fonts/).*)",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      {
        // Font files carry a version in their name, so a browser may keep them for good.
        source: "/fonts/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
