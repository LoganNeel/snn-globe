'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buildModel, pathTo } from '@/lib/dsl/build';
import type { Model, Section } from '@/lib/dsl/types';
import { EXAMPLES } from '@/lib/examples';
import { downloadHtml, downloadSnn, readNetworkFile } from '@/lib/files';
import type { Layout, UnitNode, ViewEdge } from '@/lib/layout';
import { GlobeScene, type Hit, type SceneOptions } from '@/lib/scene/GlobeScene';
import Panel from './Panel';
import Tooltip from './Tooltip';

const STORAGE_KEY = 'snn-globe:source';

export interface HoverState {
  hit: Hit;
  x: number;
  y: number;
}

export default function GlobeViewer() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GlobeScene | null>(null);
  const [source, setSource] = useState(EXAMPLES[0].source);
  const [model, setModel] = useState<Model | null>(null);
  const [root, setRoot] = useState<Section | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [error, setError] = useState('');
  const [options, setOptions] = useState<SceneOptions>({ symbols: true, shells: true, spin: true });
  const [hover, setHover] = useState<HoverState | null>(null);
  const [dragging, setDragging] = useState(false);

  // try to stay in the same section after a re-render
  const render = useCallback((text: string, keepPath: string[] | null) => {
    try {
      const m = buildModel(text);
      let target = m.root;
      if (keepPath) {
        for (const name of keepPath.slice(1)) {
          const c = target.children.find(x => x.name === name);
          if (!c) break;
          target = c;
        }
      }
      setModel(m);
      setRoot(target);
      setError('');
      try { localStorage.setItem(STORAGE_KEY, text); } catch {}
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const scene = new GlobeScene(stageRef.current!, {
      onHover: (hit, x, y) => setHover(hit ? { hit, x, y } : null),
      onOpen: sec => setRoot(sec),
      onUserMove: () => setOptions(o => (o.spin ? { ...o, spin: false } : o)),
    });
    sceneRef.current = scene;

    let initial = EXAMPLES[0].source;
    try { initial = localStorage.getItem(STORAGE_KEY) || initial; } catch {}
    setSource(initial);
    render(initial, null);

    return () => { scene.dispose(); sceneRef.current = null; };
  }, [render]);

  useEffect(() => {
    if (!model || !root || !sceneRef.current) return;
    try {
      setLayout(sceneRef.current.show(root, model));
      sceneRef.current.resetCamera();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [model, root]);

  useEffect(() => { sceneRef.current?.setOptions(options); }, [options]);

  const openFile = useCallback(async (file: File) => {
    try {
      const text = await readNetworkFile(file);
      setSource(text);
      render(text, null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [render]);

  const download = async (kind: 'snn' | 'html') => {
    const name = model?.root.name ?? 'network';
    try {
      if (kind === 'snn') downloadSnn(source, name);
      else await downloadHtml(source, name);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // drop a file anywhere on the page
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth++; setDragging(true); } };
    const leave = (e: DragEvent) => { if (hasFiles(e) && --depth <= 0) { depth = 0; setDragging(false); } };
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const f = e.dataTransfer?.files[0];
      if (f) openFile(f);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [openFile]);

  const highlight = useCallback((u?: (u: UnitNode) => boolean, e?: (e: Pick<ViewEdge, 'from' | 'to' | 'loop'>) => boolean) => {
    sceneRef.current?.highlight(u, e);
  }, []);

  return (
    <div className="flex h-screen max-[820px]:flex-col-reverse">
      <Panel
        layout={layout}
        root={root}
        onNavigate={setRoot}
        highlight={highlight}
        source={source}
        onSourceChange={setSource}
        onRender={() => render(source, root ? pathTo(root).map(s => s.name) : null)}
        onLoadExample={text => { setSource(text); render(text, null); }}
        onOpenFile={openFile}
        onDownload={download}
        error={error}
        options={options}
        onOptionsChange={setOptions}
      />
      <div className="stage relative min-w-0 flex-1 overflow-hidden" ref={stageRef}>
        {hover && layout && <Tooltip hover={hover} layout={layout} />}
        <div className="pointer-events-none absolute right-3 bottom-2.5 text-[11px] text-muted-foreground">drag to orbit · scroll to zoom</div>
      </div>
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-[2px]">
          <div className="rounded-lg border-2 border-dashed border-primary px-8 py-6 text-center">
            <p className="text-sm font-medium">Drop to open</p>
            <p className="mt-1 text-xs text-muted-foreground">.snn, .txt or an exported .html · read locally, never uploaded</p>
          </div>
        </div>
      )}
    </div>
  );
}
