import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Verhoog timeout voor API routes (vooral voor AI calls die lang kunnen duren)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
