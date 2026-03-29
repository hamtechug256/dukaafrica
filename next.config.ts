import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  
  // Content Security Policy headers for Clerk
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self';",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.accounts.dev https://*.clerk.accounts.dev https://cdn.clerk.io https://challenges.cloudflare.com;",
              "connect-src 'self' https://clerk.accounts.dev https://*.clerk.accounts.dev https://api.clerk.io https://cdn.clerk.io https://fonts.googleapis.com https://fonts.gstatic.com;",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
              "font-src 'self' https://fonts.gstatic.com;",
              "img-src 'self' data: blob: https: http:;",
              "frame-src 'self' https://challenges.cloudflare.com https://clerk.accounts.dev https://*.clerk.accounts.dev;",
              "worker-src 'self' blob:;",
            ].join(' '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
