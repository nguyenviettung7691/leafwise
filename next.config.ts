
import type {NextConfig} from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  clientsClaim: true, // Ensure new SW takes control immediately
  swSrc: 'public/sw.js', // Specify your custom service worker
  buildExcludes: [ // Explicitly exclude these Next.js internal files from precaching
    /app-build-manifest\.json$/,
    /app-route-manifest\.json$/,
    /_next\/static\/.*\/_buildManifest\.js/, // Regex to match build ID in path
    /_next\/static\/.*\/_ssgManifest\.js/,   // Regex to match build ID in path
    /\.map$/, // Exclude all source maps
    /middleware-manifest\.json$/,
    /next-font-manifest\.(js|json)$/,
    // /react-loadable-manifest\.json$/, // Usually for Pages Router, might not be needed
  ],
  // disable: process.env.NODE_ENV === "development", // Keep enabled for testing
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/placehold\.co\/.*/i,
      handler: "CacheFirst", // Strategy: try cache first, then network.
      options: {
        cacheName: "placeholder-images",
        // Temporarily removed expiration to diagnose the _ref error
        // expiration: {
        //   maxEntries: 50, // Max number of images to cache
        //   maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        // },
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
