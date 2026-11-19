import type { Metadata } from 'next';
import Link from 'next/link';
import PatternDiagram, { PATTERN_NOTES } from '@/components/PatternDiagram';
import { BASE_URL, author, jsonLd } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { SYM, SYM_DESC } from '@/lib/symbols';

const TITLE = 'How to visualize a spiking neural network in 3D';
const DESC =
  'Guide to the SNN Globe syntax: describe spiking neural network sections, ports and connection patterns (sparse, topographic, recurrent, winner-take-all, STDP) and view them as an interactive 3D diagram.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: '/docs' },
  openGraph: { type: 'article', url: '/docs', title: TITLE, description: DESC, images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC, images: ['/twitter-image.png'] },
};

const FAQ: [string, string][] = [
  [
    'What is a spiking neural network?',
    'A spiking neural network (SNN) is a kind of neural network where neurons communicate with short pulses, or spikes, over time, the way biological neurons do. They are used in computational neuroscience and in neuromorphic hardware because they can be very energy efficient.',
  ],
  [
    'How do I visualize a spiking neural network?',
    'Write the network in SNN Globe as sections with in and out ports and connections between them, then press Render. The viewer places inputs and outputs on top of a 3D globe and puts deeper processing closer to the center. Click any section to open the layer inside it.',
  ],
  [
    'Can I model brain regions with it?',
    'Yes. The built-in example models a simplified brain with the thalamus, a layered cortical column template reused for V1, V2, A1, S1, M1 and prefrontal cortex, the hippocampus, the basal ganglia, the cerebellum and dopamine from the SNc.',
  ],
  [
    'Is SNN Globe free?',
    'Yes. It is free to use and open source under the MIT license.',
  ],
  [
    'Are my files uploaded anywhere?',
    'No. Everything runs in your browser. Files you open are read locally and never sent to a server.',
  ],
  [
    'Can I share a network with someone who does not have the tool?',
    'Download it as a viewer page (.html). It is a single file with the viewer and your network inside. Anyone can double-click it to open it in a browser, even offline.',
  ],
];

const schema = [
  {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: TITLE,
    description: DESC,
    url: `${BASE_URL}/docs`,
    author,
    about: ['Spiking neural network', 'Neural network visualization', 'Computational neuroscience'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
];

const EXAMPLE = `section Vision {
  in  retina[784]
  out features[64]

  section Edges   { in x[784] out y[256] }
  section Memory  { in x[256] out y[256] }

  retina   -> Edges.x  : local(3x3)
  Edges.y  -> Memory.x : sparse(0.1) stdp
  Memory.y -> Memory.x : recurrent inh delay(2ms)
  Memory.y -> features : all
}`;

const TEMPLATE = `template CorticalArea(n) {
  in  ff[n]
  in  fb[n]
  out up[n]
  out down[n]

  section L4  { in x out y }
  section L23 { in x out y }

  ff    -> L4.x  : topo
  L4.y  -> L23.x : local(5)
  L23.y -> L23.x : recurrent wta
  L23.y -> up    : one2one
}

section Cortex {
  section V1 : CorticalArea(4096)
  section V2 : CorticalArea(2048)
  V1.up -> V2.ff : topo
}`;

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-md border bg-card p-4 font-mono text-[13px] leading-relaxed">{children}</pre>;
}

const H2 = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="mt-14 mb-4 scroll-mt-6 text-xl font-semibold">{children}</h2>
);

export default function Docs() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />

      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-semibold">{SITE.name}</Link>
          <Link href="/" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Open the editor
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-12 pb-20 leading-relaxed text-foreground/90">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{TITLE}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {SITE.name} is a free spiking neural network visualizer. You describe a network as text, at the level of regions and
          layers instead of single neurons, and it lays the whole thing out as an interactive 3D globe.
        </p>

        <img
          src="/opengraph-image.png"
          alt="A simplified brain model shown as a 3D globe in SNN Globe, with thalamus, cortex, hippocampus and basal ganglia"
          width={1200}
          height={630}
          className="mt-8 w-full rounded-md border"
        />

        <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <a href="#layout" className="hover:text-foreground">How the globe works</a>
          <a href="#syntax" className="hover:text-foreground">Syntax</a>
          <a href="#patterns" className="hover:text-foreground">Connection patterns</a>
          <a href="#templates" className="hover:text-foreground">Templates</a>
          <a href="#brain" className="hover:text-foreground">Modeling the brain</a>
          <a href="#sharing" className="hover:text-foreground">Sharing</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>

        <H2 id="layout">How the globe layout works</H2>
        <p>
          Big spiking networks get hard to picture fast. Instead of drawing every neuron, {SITE.name} draws <em>sections</em>:
          groups of neurons with ports where signals come in and go out.
        </p>
        <p className="mt-3">
          The inputs and outputs sit on the top of the globe. Every other section is placed on a shell based on how many steps
          it is from them, so early sensory processing stays near the surface and the deepest processing ends up in the center.
          Sections can contain other sections, and clicking one opens its own globe, one layer down.
        </p>

        <H2 id="syntax">Writing a network</H2>
        <p className="mb-4">Here is a small vision pipeline with a recurrent memory section:</p>
        <Code>{EXAMPLE}</Code>
        <ul className="mt-5 list-disc space-y-1.5 pl-5">
          <li><code className="font-mono text-sm">section Name {'{ ... }'}</code> is a group of neurons. Sections can be nested.</li>
          <li><code className="font-mono text-sm">in name[size]</code> and <code className="font-mono text-sm">out name[size]</code> are ports. Size is optional.</li>
          <li><code className="font-mono text-sm">A -&gt; B : tags</code> connects two ports or sections. <code className="font-mono text-sm">A &lt;-&gt; B</code> goes both ways.</li>
          <li><code className="font-mono text-sm">A ~&gt; B</code> is a broadcast, like dopamine or acetylcholine reaching a whole region. It shows up as a glow.</li>
          <li><code className="font-mono text-sm">loop name {'{ ... }'}</code> names a group of connections so you can highlight the loop.</li>
          <li><code className="font-mono text-sm">template Name(n) {'{ ... }'}</code> defines a reusable block.</li>
        </ul>

        <H2 id="patterns">Connection patterns</H2>
        <p className="mb-6">
          Each connection can be tagged with how the neurons are wired. Tags show up as symbols on the lines in the viewer.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.keys(SYM).map(k => (
            <section key={k} className="rounded-md border bg-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-medium">
                  <span className="mr-2">{SYM[k]}</span>
                  {SYM_DESC[k].split(' (')[0]}
                </h3>
                <code className="font-mono text-xs text-muted-foreground">{k}</code>
              </div>
              <div className="mt-3 flex justify-center rounded-sm border bg-background p-1">
                <PatternDiagram kind={k} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{PATTERN_NOTES[k]}</p>
            </section>
          ))}
        </div>

        <H2 id="templates">Templates for repeated structure</H2>
        <p className="mb-4">
          The cortex reuses the same layered column everywhere, and lots of SNN models repeat blocks. Define it once and
          reuse it with different sizes:
        </p>
        <Code>{TEMPLATE}</Code>

        <H2 id="brain">Modeling brain regions</H2>
        <p>
          The built-in example is a simplified brain: sensory input through the thalamus (LGN, MGN, VPL), cortical areas built
          from one column template, a hippocampus (dentate gyrus, CA3, CA1), a basal ganglia action loop back through the
          thalamus, the cerebellum, and dopamine from the substantia nigra broadcast onto the striatum.
        </p>
        <p className="mt-3">
          Laid out on the globe, the relays end up near the surface, primary sensory and motor cortex one shell in, and the
          hippocampus and prefrontal cortex near the core. It is not anatomically placed, it is placed by how far each region
          is from the senses and muscles.
        </p>

        <H2 id="sharing">Saving and sharing</H2>
        <p>
          Download a network as a <strong>viewer page (.html)</strong> and you get one file with the viewer and the network
          inside. Anyone can double-click it to open it in their browser, no install and no internet needed. You can also
          download the plain <strong>.snn</strong> text, and open either kind of file again by dropping it on the page.
        </p>
        <p className="mt-3">Everything runs locally in your browser. Nothing you open is uploaded.</p>

        <H2 id="faq">FAQ</H2>
        <div className="space-y-6">
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <h3 className="font-medium text-foreground">{q}</h3>
              <p className="mt-1.5 text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-md border bg-card p-6 text-center">
          <p className="font-medium">Ready to sketch your own network?</p>
          <Link href="/" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Open {SITE.name}
          </Link>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-3xl px-6 py-6 text-xs text-muted-foreground">
          © {SITE.year} {SITE.author} · <a href={`mailto:${SITE.email}`} className="hover:text-foreground">{SITE.email}</a> · Released under the {SITE.license} License
          {SITE.repoUrl && <> · <a href={SITE.repoUrl} className="hover:text-foreground">Source on GitHub</a></>}
        </div>
      </footer>
    </div>
  );
}
