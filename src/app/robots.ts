import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/seller/', '/admin/', '/checkout/', '/cart/'],
      },
    ],
    sitemap: 'https://duukaafrica.com/sitemap.xml',
  }
}
