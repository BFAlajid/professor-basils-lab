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
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
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
