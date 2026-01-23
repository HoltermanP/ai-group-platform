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
  // Webpack configuratie voor Clerk keyless modules (preventie voor het geval dat)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude Clerk keyless modules die problemen kunnen veroorzaken
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          '@clerk/nextjs/dist/esm/server/keyless-custom-headers': 'commonjs @clerk/nextjs',
          '@clerk/nextjs/dist/esm/server/keyless-node': 'commonjs @clerk/nextjs',
          '@clerk/nextjs/dist/esm/app-router/keyless-actions': 'commonjs @clerk/nextjs',
        });
      }
    }
    return config;
  },
};

export default nextConfig;
