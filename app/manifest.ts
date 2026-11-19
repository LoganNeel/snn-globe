import type { MetadataRoute } from 'next';
import { DESCRIPTION } from '@/lib/seo';
import { SITE } from '@/lib/site';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#101114',
    theme_color: '#101114',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
