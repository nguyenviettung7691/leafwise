
import type {NextConfig} from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  clientsClaim: true, // Ensure new SW takes control immediately
  swSrc: 'public/sw.js', // Specify your custom service worker
  // buildExcludes: ["app-build-manifest.json"], // Already default for app router
  // disable: process.env.NODE_ENV === "development", // Keep enabled for testing
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/placehold\.co\/.*/i,
      handler: "CacheFirst", // Strategy: try cache first, then network.
      options: {
        cacheName: "placeholder-images",
        expiration: {
          maxEntries: 50, // Max number of images to cache
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
        cacheableResponse: {
          statuses: [0, 200], // Cache opaque responses and successful responses
        },
      },
    },
    // You can add more runtimeCaching rules here for other origins or strategies
  ],
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA(nextConfig);

