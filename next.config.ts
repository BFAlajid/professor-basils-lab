import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  // Exclude mgba-wasm from server bundling (browser-only)
  serverExternalPackages: ["@thenick775/mgba-wasm"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/sprites/**",
      },
    ],
    unoptimized: true,
  },
  async headers() {
    // React's dev-mode debugging tools (e.g. component stack traces) require
    // eval(). Only allow it in development — production CSP must never carry
    // 'unsafe-eval'.
    const scriptSrc =
      process.env.NODE_ENV === "development"
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'"
        : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'";
    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' raw.githubusercontent.com *.public.blob.vercel-storage.com data:",
      "connect-src 'self' pokeapi.co *.pokeapi.co 0.peerjs.com *.public.blob.vercel-storage.com",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
    ].join("; ");

    return [
      // CSP for all routes
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      // COOP/COEP only on the root SPA page (needed for WASM SharedArrayBuffer in emulator tab)
      // New routes (/pokemon/*, /share/*, /api/og) are free of these restrictions
      {
        source: "/",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      // mGBA pthread worker support. Under COEP `require-corp`, every subresource
      // (including module workers) must present CORP, and the worker script itself
      // must carry COEP to be allowed as a module worker of an isolated embedder.
      // mGBA spawns `new Worker(new URL('mgba.js', import.meta.url), {type:'module'})`
      // which re-fetches /mgba/mgba.js as the worker script; without these headers
      // Chrome silently blocks the worker and the pthread pool `Promise.all` never
      // resolves, causing the 30s init timeout.
      {
        source: "/mgba/:path*",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      // Prevent browsers/CDN from serving stale HTML after deployments
      // Exclude static assets, ISR pokemon pages (they use revalidate), and favicon
      {
        source: "/((?!_next/static|favicon.ico|pokemon).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

const analyzed = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);

export default analyzed;
