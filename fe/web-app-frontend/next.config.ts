import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_DOTNET_API_ORIGIN ?? "http://localhost:5109";
const backendHost = new URL(BACKEND_URL).hostname;
const backendPort = new URL(BACKEND_URL).port;

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.142",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: backendHost,
        port: backendPort || undefined,
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: backendHost,
        port: backendPort || undefined,
        pathname: "/media/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/sapo/:path*",
        destination: `${BACKEND_URL}/api/sapo/:path*`,
      },
    ];
  },
};

export default nextConfig;
