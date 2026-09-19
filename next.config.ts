import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Excel imports are uploaded through a Server Action.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
