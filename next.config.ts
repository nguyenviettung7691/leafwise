
import type {NextConfig} from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  clientsClaim: true, // Ensure new SW takes control immediately
  swSrc: 'public/sw.js', // Specify your custom service worker
  buildExcludes: [ // Explicitly exclude these Next.js internal files from precaching
    // Matches files like /app-build-manifest.json at the root of the build output
    /app-build-manifest\.json$/,
    /app-route-manifest\.json$/,
    // Matches /_next/static/<buildID>/_buildManifest.js
    // Using a more specific regex for the build ID part
    /\/_next\/static\/[a-zA-Z0-9_-]+\/_buildManifest\.js$/,
    // Matches /_next/static/<buildID>/_ssgManifest.js
    /\/_next\/static\/[a-zA-Z0-9_-]+\/_ssgManifest\.js$/,
    // Exclude all source maps
    /\.map$/,
    // Exclude middleware manifest
    /middleware-manifest\.json$/,
    // Exclude next font manifests
    /next-font-manifest\.(js|json)$/,
    // A more general exclusion as a fallback, though the above should be preferred
    // /_buildManifest\.js$/, 
    // /_ssgManifest\.js$/,
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
