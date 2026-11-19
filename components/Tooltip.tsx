import { isUnit, type Layout } from '@/lib/layout';
import { SYM, SYM_DESC, tagBase } from '@/lib/symbols';
import type { HoverState } from './GlobeViewer';

export default function Tooltip({ hover, layout }: { hover: HoverState; layout: Layout }) {
  const { hit, x, y } = hover;
  const nameOf = (key: string) => {
    const n = layout.byKey.get(key);
    return isUnit(n) ? n.sec.name : n?.label ?? key;
  };

  // keep it on screen
  const style: React.CSSProperties = { left: x + 14, top: y + 14 };
  const transforms: string[] = [];
  if (typeof window !== 'undefined') {
    if (x > window.innerWidth - 700) { style.left = x - 14; transforms.push('translateX(-100%)'); }
    if (y > window.innerHeight - 260) { style.top = y - 14; transforms.push('translateY(-100%)'); }
  }
  if (transforms.length) style.transform = transforms.join(' ');

  if (hit.type === 'port') {
    const p = hit.port;
    const what = p.ext ? (p.kind === 'in' ? 'signal coming from outside this section' : 'signal leaving this section') : `${p.kind}-port`;
    return (
      <div className="tip" style={style}>
        <b>{p.label}</b> <span className="muted">{what}{p.size ? ` · ${p.size} neurons` : ''}</span>
      </div>
    );
  }

  const u = hit.unit;
  const s = u.sec;
  const incoming = layout.edges.filter(e => e.to === u.key);
  const outgoing = layout.edges.filter(e => e.from === u.key);
  const self = layout.selfLoops.filter(l => l.unit === s);
  const inside = [...u.internal].filter(t => tagBase(t) !== 'exc');

  return (
    <div className="tip" style={style}>
      <b>{s.name}</b>
      {s.tpl && <span className="muted"> ({s.tpl})</span>}
      <div className="muted">
        depth {u.depth} · ~{u.size} neurons
        {s.children.length > 0 && ` · ${s.children.length} sections inside, click to open`}
      </div>
      {inside.length > 0 && (
        <div className="tip-block">
          <div className="muted">Patterns inside:</div>
          {inside.map(t => (
            <div key={t}>{SYM[tagBase(t)] ?? ''} {SYM_DESC[tagBase(t)] ?? t}</div>
          ))}
        </div>
      )}
      {incoming.length + outgoing.length + self.length > 0 && (
        <div className="tip-block">
          {incoming.map((e, i) => (
            <div key={'i' + i}>← {nameOf(e.from)} <span className="muted">{e.tags.join(' ') || (e.broadcast ? 'broadcast' : '')}</span></div>
          ))}
          {outgoing.map((e, i) => (
            <div key={'o' + i}>→ {nameOf(e.to)} <span className="muted">{e.tags.join(' ')}</span></div>
          ))}
          {self.map((l, i) => (
            <div key={'s' + i}>↻ itself <span className="muted">{l.tags.join(' ')}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}
