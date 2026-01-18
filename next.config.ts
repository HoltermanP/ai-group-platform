import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Force dynamic rendering voor pagina's die problemen veroorzaken
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
};

export default nextConfig;
