import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Verhoog timeout voor API routes (vooral voor AI calls die lang kunnen duren)
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
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
