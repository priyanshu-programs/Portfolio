import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // Serve AVIF/WebP to browsers that support them for every next/image usage.
    formats: ["image/avif", "image/webp"],
    // Allow the work-popout thumbnails to be optimized through next/image.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Sanity-hosted content images (portrait, collage, work thumbnails, etc.).
      { protocol: "https", hostname: "cdn.sanity.io" },
    ],
  },
  experimental: {
    // Defaults to true, which caches Server Component fetches across HMR
    // refreshes — so freshly published Sanity content stays invisible in dev.
    serverComponentsHmrCache: false,
  },
  logging: {
    // Print cache HIT/MISS per fetch in dev, so content staleness is
    // diagnosable from the console instead of by guesswork.
    fetches: { fullUrl: true },
  },
  // Baseline security headers. No CSP here: the site inlines styles and runs
  // WebGL shaders, so a policy strict enough to be worth having needs its own
  // pass with nonces rather than a blanket 'unsafe-inline'.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Don't send the full URL to third parties. Matters because the
          // revalidate secret used to ride in a query string; header-based now,
          // but this closes the class of leak rather than the one instance.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Stop the browser from re-interpreting a proxied asset's type — the
          // /api/image route forwards an upstream Content-Type verbatim.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No part of the site is meant to be framed. X-Frame-Options is the
          // legacy control; the CSP directive is the one modern browsers
          // honour, so both are sent. (frame-ancestors is a CSP directive and
          // has no effect as a bare header, hence the minimal CSP.)
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
