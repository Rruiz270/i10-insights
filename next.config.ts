import type { NextConfig } from "next";

// When mounted under www.institutoi10.com.br/insights/* via Vercel rewrite,
// set NEXT_PUBLIC_BASE_PATH=/insights so Next prepends the prefix to every
// internal Link href, asset URL, and fetch() call. Empty in local dev.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath,
  images: {
    // Manus image generation can return URLs from various CDNs; allow them all
    // for now. Tighten later once we know the canonical CDN.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
