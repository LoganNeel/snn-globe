import ViewerLoader from '@/components/ViewerLoader';
import { BASE_URL, DESCRIPTION, author, jsonLd } from '@/lib/seo';
import { SITE } from '@/lib/site';

const schema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE.name,
  url: BASE_URL,
  description: DESCRIPTION,
  applicationCategory: 'EducationalApplication',
  applicationSubCategory: 'Neural network visualization',
  operatingSystem: 'Any (web browser)',
  browserRequirements: 'Requires WebGL',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  license: 'https://opensource.org/licenses/MIT',
  author,
  ...(SITE.repoUrl ? { sameAs: [SITE.repoUrl] } : {}),
  featureList: [
    'Describe spiking neural networks as text',
    'Interactive 3D globe layout by processing depth',
    'Nested sections you can click into',
    'Connection patterns: all-to-all, sparse, local, topographic, recurrent, winner-take-all, STDP',
    'Export a network as a self-contained HTML page',
    'Runs fully in the browser, nothing is uploaded',
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
      {/* screen readers and crawlers get a summary, the viewer itself is canvas */}
      <div className="sr-only">
        <h1>SNN Globe: a 3D spiking neural network visualizer</h1>
        <p>{DESCRIPTION}</p>
        <a href="/docs">How to write networks and what the connection patterns mean</a>
      </div>
      <ViewerLoader />
    </>
  );
}
