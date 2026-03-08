import type {NextConfig} from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      const stubPath = path.resolve(__dirname, 'src/ai/genkit-stub.js');
      config.resolve.alias = {
        ...config.resolve.alias,
        'genkit': stubPath,
        '@genkit-ai/googleai': stubPath,
        '@genkit-ai/core': stubPath,
      };
    }
    return config;
  },
};

export default nextConfig;
