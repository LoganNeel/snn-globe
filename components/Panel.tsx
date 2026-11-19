import { useRef } from 'react';
import { Download, FileCode2, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { pathTo } from '@/lib/dsl/build';
import type { Section } from '@/lib/dsl/types';
import { EXAMPLES } from '@/lib/examples';
import { ACCEPT } from '@/lib/files';
import type { Layout, UnitNode, ViewEdge } from '@/lib/layout';
import type { SceneOptions } from '@/lib/scene/GlobeScene';
import { SITE } from '@/lib/site';
import { LINE_COLORS, SYM, SYM_DESC, groupColor } from '@/lib/symbols';

type EdgeLike = Pick<ViewEdge, 'from' | 'to' | 'loop'>;

interface Props {
  layout: Layout | null;
  root: Section | null;
  onNavigate: (s: Section) => void;
  highlight: (u?: (u: UnitNode) => boolean, e?: (e: EdgeLike) => boolean) => void;
  source: string;
  onSourceChange: (s: string) => void;
  onRender: () => void;
  onLoadExample: (src: string) => void;
  onOpenFile: (f: File) => void;
  onDownload: (kind: 'snn' | 'html') => void;
  error: string;
  options: SceneOptions;
  onOptionsChange: (o: SceneOptions) => void;
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1.5 text-xs font-semibold text-foreground">{children}</h3>;
}

export default function Panel(p: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const L = p.layout;
  const path = p.root ? pathTo(p.root) : [];
  const loops = L ? [...new Set([...L.edges, ...L.selfLoops].map(e => e.loop).filter((x): x is string => !!x))] : [];
  const setOpt = (k: keyof SceneOptions, v: boolean) => p.onOptionsChange({ ...p.options, [k]: v });
  const inGroup = (i: number, key: string) => {
    const n = L?.byKey.get(key);
    return !!n && 'sector' in n && n.sector === i;
  };

  return (
    <aside className="flex h-full w-[300px] flex-none flex-col border-r bg-card max-[820px]:h-[45vh] max-[820px]:w-auto max-[820px]:border-r-0 max-[820px]:border-t">
      <div className="px-3.5 pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{SITE.name}</span>
          <div className="flex gap-1">
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) p.onOpenFile(f); e.target.value = ''; }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => fileInput.current?.click()} aria-label="Open file">
                  <Upload />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open .snn or .html (or drop it anywhere)</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Download">
                      <Download />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Download</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => p.onDownload('html')}>
                  <FileCode2 />
                  <div className="flex flex-col">
                    <span>Viewer page (.html)</span>
                    <span className="text-xs text-muted-foreground">Opens in any browser, no install</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => p.onDownload('snn')}>
                  <FileText />
                  <div className="flex flex-col">
                    <span>Network file (.snn)</span>
                    <span className="text-xs text-muted-foreground">Plain text source</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <nav className="mt-2 font-mono text-xs">
          {path.map((s, i) => (
            <span key={s.id}>
              {i > 0 && <span className="mx-1.5 text-muted-foreground">/</span>}
              {i === path.length - 1
                ? <span className="font-medium">{s.name}</span>
                : <button className="text-muted-foreground hover:text-foreground hover:underline" onClick={() => p.onNavigate(s)}>{s.name}</button>}
            </span>
          ))}
        </nav>
        {L && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {L.units.length} sections, {L.maxD} {L.maxD === 1 ? 'level' : 'levels'}, {L.edges.length + L.selfLoops.length} links
          </p>
        )}
        {p.error && <p className="mt-2 whitespace-pre-wrap font-mono text-xs text-destructive">{p.error}</p>}
      </div>

      <Tabs defaultValue="explore" className="mt-3 min-h-0 flex-1 gap-0">
        <div className="px-3.5">
          <TabsList className="w-full">
            <TabsTrigger value="explore">Explore</TabsTrigger>
            <TabsTrigger value="source">Source</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="explore" className="min-h-0 overflow-y-auto px-3.5 pb-4">
          <section className="py-3">
            <Heading>Regions</Heading>
            {L?.groups.map(g => {
              const openable = g.isRegion || g.sec.children.length > 0;
              return (
                <div
                  key={g.sec.id}
                  className={'-mx-1.5 flex items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-accent' + (openable ? ' cursor-pointer' : '')}
                  onMouseEnter={() => p.highlight(u => u.sector === g.index, e => inGroup(g.index, e.from) || inGroup(g.index, e.to))}
                  onMouseLeave={() => p.highlight()}
                  onClick={() => openable && p.onNavigate(g.sec)}
                >
                  <span className="size-2.5 flex-none rounded-[2px]" style={{ background: groupColor(g.index) }} />
                  {g.sec.name}
                  {g.isRegion && <span className="ml-auto font-mono text-xs text-muted-foreground">{g.units.length}</span>}
                </div>
              );
            })}
          </section>

          {loops.length > 0 && (
            <>
              <Separator />
              <section className="py-3">
                <Heading>Loops</Heading>
                {loops.map(n => (
                  <div
                    key={n}
                    className="-mx-1.5 flex items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-accent"
                    onMouseEnter={() => {
                      const keys = new Set<string>();
                      L!.edges.filter(e => e.loop === n).forEach(e => { keys.add(e.from); keys.add(e.to); });
                      p.highlight(u => keys.has(u.key), e => e.loop === n);
                    }}
                    onMouseLeave={() => p.highlight()}
                  >
                    <span className="size-2.5 flex-none rounded-full border-[1.5px] border-muted-foreground" />
                    {n}
                  </div>
                ))}
              </section>
            </>
          )}

          <Separator />
          <section className="py-3">
            <Heading>Patterns</Heading>
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-0.5">
              {Object.keys(SYM).map(k => (
                <Tooltip key={k}>
                  <TooltipTrigger asChild>
                    <div className="flex cursor-default items-center gap-1.5 text-sm">
                      <span className="w-7 text-center">{SYM[k]}</span>
                      <code className="font-mono text-xs text-muted-foreground">{k}</code>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{SYM_DESC[k]}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </section>

          <Separator />
          <section className="py-3">
            <Heading>Lines</Heading>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4" style={{ background: LINE_COLORS.exc }} />exc</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4" style={{ background: LINE_COLORS.inh }} />inh</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4" style={{ background: LINE_COLORS.feedback }} />feedback</span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-0.5 w-4" style={{ background: `repeating-linear-gradient(90deg, ${LINE_COLORS.broadcast} 0 4px, transparent 4px 7px)` }} />broadcast
              </span>
              <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: LINE_COLORS.portIn }} />in</span>
              <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: LINE_COLORS.portOut }} />out</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Sections with a ring have more inside. Click to open.</p>
          </section>

          <Separator />
          <section className="flex gap-4 py-3">
            {(['symbols', 'shells', 'spin'] as const).map(k => (
              <div key={k} className="flex items-center gap-1.5">
                <Checkbox id={`opt-${k}`} checked={p.options[k]} onCheckedChange={v => setOpt(k, v === true)} />
                <Label htmlFor={`opt-${k}`} className="text-sm font-normal capitalize">{k}</Label>
              </div>
            ))}
          </section>
        </TabsContent>

        <TabsContent value="source" className="flex min-h-0 flex-col px-3.5 pt-3 pb-4">
          <div className="mb-2 flex gap-2">
            <Select value="" onValueChange={id => { const ex = EXAMPLES.find(x => x.id === id); if (ex) p.onLoadExample(ex.source); }}>
              <SelectTrigger size="sm" className="flex-1">
                <SelectValue placeholder="Load example…" />
              </SelectTrigger>
              <SelectContent>
                {EXAMPLES.map(ex => <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" onClick={p.onRender}>Render</Button>
              </TooltipTrigger>
              <TooltipContent>Ctrl+Enter</TooltipContent>
            </Tooltip>
          </div>
          <textarea
            value={p.source}
            onChange={e => p.onSourceChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); p.onRender(); } }}
            spellCheck={false}
            className="min-h-[300px] w-full flex-1 resize-none whitespace-pre rounded-md border bg-background px-2.5 py-2 font-mono text-xs leading-relaxed outline-none [tab-size:2] focus-visible:border-ring"
          />
        </TabsContent>
      </Tabs>

      <footer className="border-t px-3.5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        © {SITE.year} {SITE.authorUrl ? <a className="hover:text-foreground" href={SITE.authorUrl} target="_blank" rel="noreferrer">{SITE.author}</a> : SITE.author}
        {' · '}
        <a className="hover:text-foreground" href={`mailto:${SITE.email}`}>{SITE.email}</a>
        <br />
        Released under the {SITE.license} License.
        {SITE.repoUrl && <> <a className="underline hover:text-foreground" href={SITE.repoUrl} target="_blank" rel="noreferrer">Source on GitHub</a>.</>}
      </footer>
    </aside>
  );
}
