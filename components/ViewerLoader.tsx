'use client';

// webgl needs the browser, so skip SSR
import dynamic from 'next/dynamic';

const GlobeViewer = dynamic(() => import('./GlobeViewer'), {
  ssr: false,
  loading: () => <div className="grid h-screen place-items-center text-sm text-muted-foreground">Loading…</div>,
});

export default function ViewerLoader() {
  return <GlobeViewer />;
}
