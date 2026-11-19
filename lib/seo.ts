import { SITE } from './site';

// placeholder so builds work before a domain is set; adds https:// if it was left off
const raw = (SITE.siteUrl || 'https://example.com').trim().replace(/\/+$/, '');
export const BASE_URL = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;

export const TITLE = 'SNN Globe: 3D Spiking Neural Network Visualizer';

export const DESCRIPTION =
  'Free online tool to design and visualize spiking neural networks (SNNs) in 3D. Describe brain regions, layers and connection patterns in a simple text format and explore them as an interactive globe. Runs in your browser.';

export const KEYWORDS = [
  'spiking neural network',
  'spiking neural network visualization',
  'SNN visualizer',
  'SNN diagram',
  '3D neural network visualization',
  'neural network diagram tool',
  'neural network architecture diagram',
  'neural network description language',
  'brain network visualization',
  'brain region diagram',
  'connectome visualization',
  'neuromorphic computing',
  'computational neuroscience tool',
  'cortical column model',
  'STDP',
  'winner-take-all network',
  'topographic map neural network',
  'neural network DSL',
  'interactive neural network viewer',
  'free neural network visualizer online',
];

// JSON-LD has to be inlined as a script tag
export function jsonLd(data: object) {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') };
}

export const author = {
  '@type': 'Person',
  name: SITE.author,
  ...(SITE.authorUrl ? { url: SITE.authorUrl } : {}),
};
