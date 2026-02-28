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
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      // Prevent browsers/CDN from serving stale HTML after deployments
      {
        source: "/((?!_next/static|favicon.ico).*)",
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
