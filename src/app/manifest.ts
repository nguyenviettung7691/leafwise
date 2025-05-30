// src/app/manifest.ts
import { type MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LeafWise - Plant Care',
    short_name: 'LeafWise',
    description: 'Your personal plant care assistant.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F5F5',
    theme_color: '#32CD32',
    orientation: 'portrait-primary',
    id: "0.2.0-sapling-kodama",
    icons: [
        {
            "purpose": "maskable",
            "sizes": "512x512",
            "src": "/maskable-icon.png",
            "type": "image/png"
        },
        {
            "purpose": "any",
            "sizes": "512x512",
            "src": "/maskable-icon.png",
            "type": "image/png"
        },
    ],
    shortcuts: [
      {
        name: 'Add New Plant',
        short_name: 'New Plant',
        description: 'Manually add a new plant to your collection.',
        url: '/plants/new',
        icons: [
          { src: '/sprout.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      {
        name: 'Diagnose Plant',
        short_name: 'Diagnose',
        description: 'Identify a plant and diagnose its health using AI.',
        url: '/diagnose',
        icons: [
          { src: '/stethoscope.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      {
        name: 'View Care Calendar',
        short_name: 'Calendar',
        description: 'Check your upcoming plant care tasks.',
        url: '/calendar',
        icons: [
          { src: '/calendar-days.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
    ],
    "screenshots": [
        {
          "src": "/screenshot-1.png",
          "sizes": "1603x832",
          "type": "image/png",
          "form_factor": "wide",
          "label": "My Plants"
        },
        {
          "src": "/screenshot-2.png",
          "sizes": "802x1227",
          "type": "image/png",
          "form_factor": "narrow",
          "label": "Plant Diagnose"
        }
    ],
    // The following are not standard manifest fields, but you can add them as extensions if needed
    // permissions: ['notifications', 'push'],
    // gcm_sender_id: 'LeafWise',
  };
}
