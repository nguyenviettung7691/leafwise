import type { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/profile/',
    },
    sitemap: 'https://leafwise.nguyenviettung.id.vn/sitemap.xml',
  }
}