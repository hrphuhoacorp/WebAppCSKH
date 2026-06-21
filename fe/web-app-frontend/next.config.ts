import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_DOTNET_API_ORIGIN ?? "http://localhost:5109";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.142",
  ],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;