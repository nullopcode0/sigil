import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sigil.bond';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/admin/', '/api/cron/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
