import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://leafwise.nvtung.com'; // Replace with your actual domain if different
  const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

  return [
    {
      url: `${baseUrl}/`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/diagnose`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/calendar`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/profile`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/plants/new`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // Note: Dynamic routes like /plants/[id] cannot be listed statically here.
    // You would typically fetch dynamic routes from your data source
    // and include them in the returned array if they are meant to be indexed.
    // Example (requires fetching data):
    /*
    ...plants.map(plant => ({
      url: `${baseUrl}/plants/${plant.id}`,
      lastModified: plant.updatedAt, // Use actual last updated date
      changeFrequency: 'weekly',
      priority: 0.9,
    })),
    */
  ];
}