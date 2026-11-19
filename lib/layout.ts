// Lays out one section as a globe. Depth = hops from the nearest port,
// each depth gets a shell, then a quick force pass spreads things out.

import { Vector3 } from 'three';
import { isDescOrSelf, unitSize } from './dsl/build';
import type { Edge, Section } from './dsl/types';

export const GLOBE_RADIUS = 10;

// the force pass is O(n^2) per step, so cap what one view draws
export const MAX_UNITS_PER_VIEW = 400;

export interface PortNode {
  kind: 'in' | 'out';
  key: string;
  label: string;
  size?: number | null;
  ext?: boolean;
  slot: number;
  pos: Vector3;
}

export interface UnitNode {
  key: string;
  sec: Section;
  depth: number;
  r: number;
  size: number;
  rad: number;
  group: Section | null;
  sector: number;
  pos: Vector3;
  internal: Set<string>;
}

export interface ViewEdge {
  from: string;
  to: string;
  tags: string[];
  broadcast: boolean;
  inh: boolean;
  feedback: boolean;
  loop: string | null;
  line: number;
}

export interface SelfLoop {
  unit: Section;
  tags: string[];
  loop: string | null;
}

export interface Group {
  sec: Section;
  index: number;
  isRegion: boolean;
  units: UnitNode[];
}

export interface Layout {
  root: Section;
  units: UnitNode[];
  ports: PortNode[];
  edges: ViewEdge[];
  selfLoops: SelfLoop[];
  groups: Group[];
  maxD: number;
  byKey: Map<string, UnitNode | PortNode>;
}

export const isUnit = (n: UnitNode | PortNode | undefined): n is UnitNode => !!n && 'sec' in n;

interface NodeRef { key: string; ext?: boolean; port?: boolean }

export function layout(R: Section, allEdges: Edge[]): Layout {
  const RG = GLOBE_RADIUS;

  // sections with no ports that only hold other sections get flattened into regions
  const units: Section[] = [];
  const containers: Section[] = [];
  const groupOf = new Map<Section, Section | null>();
  (function walk(sec: Section, g: Section | null) {
    for (const c of sec.children) {
      const isContainer = c.children.length > 0 && !c.ins.length && !c.outs.length;
      if (isContainer) { containers.push(c); walk(c, g || c); }
      else { units.push(c); groupOf.set(c, g); }
    }
  })(R, null);
  if (units.length > MAX_UNITS_PER_VIEW) {
    throw new Error(`${R.name} has ${units.length} sections at one level (max ${MAX_UNITS_PER_VIEW}). Group them into sub-sections.`);
  }
  const unitSet = new Set(units);
  const directUnit = (sec: Section): Section | null => {
    let s: Section | null = sec;
    while (s && s !== R) { if (unitSet.has(s)) return s; s = s.parent; }
    return null;
  };

  // entry/exit sections of a portless group
  const ioCache = new Map<Section, { src: Section[]; snk: Section[] }>();
  function io(cont: Section) {
    const cached = ioCache.get(cont);
    if (cached) return cached;
    const inside = cont === R ? units : units.filter(u => isDescOrSelf(u, cont));
    const hasIn = new Set<Section>(), hasOut = new Set<Section>();
    for (const e of allEdges) {
      const a = directUnit(e.a.sec), b = directUnit(e.b.sec);
      if (a && b && a !== b && inside.includes(a) && inside.includes(b)) {
        hasOut.add(a); hasIn.add(b);
        if (e.arrow === '<->') { hasOut.add(b); hasIn.add(a); }
      }
    }
    let src = inside.filter(u => !hasIn.has(u));
    let snk = inside.filter(u => !hasOut.has(u));
    if (!src.length) src = inside;
    if (!snk.length) snk = inside;
    const r = { src, snk };
    ioCache.set(cont, r);
    return r;
  }

  const ports = new Map<string, PortNode>();
  const addPort = (key: string, label: string, kind: 'in' | 'out', extra: Partial<PortNode> = {}) => {
    if (!ports.has(key)) ports.set(key, { key, label, kind, slot: 0, pos: new Vector3(), ...extra });
  };
  R.ins.forEach(p => addPort('port:' + p.name, p.name, 'in', { size: p.size }));
  R.outs.forEach(p => addPort('port:' + p.name, p.name, 'out', { size: p.size }));

  function nodes(ep: Edge['a'], role: 'src' | 'dst'): NodeRef[] | null {
    if (!isDescOrSelf(ep.sec, R)) {
      const label = isDescOrSelf(R, ep.sec) && ep.port ? ep.port : ep.sec.name;
      const kind = role === 'src' ? 'in' : 'out';
      const key = `ext-${kind}:${label}`;
      addPort(key, label, kind, { ext: true });
      return [{ key, ext: true }];
    }
    if (ep.sec === R) {
      if (!ep.port) { const c = io(R); return (role === 'dst' ? c.src : c.snk).map(u => ({ key: 'u' + u.id })); }
      const key = 'port:' + ep.port;
      addPort(key, ep.port, role === 'src' ? 'in' : 'out');
      return [{ key, port: true }];
    }
    if (containers.includes(ep.sec)) {
      const c = io(ep.sec);
      return (role === 'dst' ? c.src : c.snk).map(u => ({ key: 'u' + u.id }));
    }
    const u = directUnit(ep.sec);
    return u ? [{ key: 'u' + u.id }] : null;
  }

  const edges: ViewEdge[] = [];
  const selfLoops: SelfLoop[] = [];
  const internal = new Map<Section, Set<string>>(units.map(u => [u, new Set<string>()]));

  for (const e of allEdges) {
    const pairs = e.arrow === '<->' ? [[e.a, e.b], [e.b, e.a]] : [[e.a, e.b]];
    pairs.forEach(([x, y], pi) => {
      const inX = isDescOrSelf(x.sec, R), inY = isDescOrSelf(y.sec, R);
      if (!inX && !inY) return;
      if ((!inX && y.sec === R && y.port) || (!inY && x.sec === R && x.port)) return; // parent's problem
      if (x.sec === R && y.sec === R) return;

      const ux = directUnit(x.sec), uy = directUnit(y.sec);
      if (ux && ux === uy) {
        if (x.sec === ux && y.sec === ux) { if (pi === 0) selfLoops.push({ unit: ux, tags: e.tags, loop: e.loop }); }
        else e.tags.forEach(t => internal.get(ux)!.add(t));
        return;
      }
      const xs = nodes(x, 'src'), ys = nodes(y, 'dst');
      if (!xs || !ys) return;
      for (const a of xs) for (const b of ys) {
        if (a.key === b.key || ((a.ext || a.port) && (b.ext || b.port))) continue;
        edges.push({
          from: a.key, to: b.key, tags: e.tags, broadcast: e.arrow === '~>', inh: e.tags.includes('inh'),
          feedback: /^fb/.test(y.port || ''), loop: e.loop, line: e.line,
        });
      }
    });
  }

  // BFS out from the ports
  const adj = new Map<string, string[]>();
  const link = (a: string, b: string) => { if (!adj.has(a)) adj.set(a, []); adj.get(a)!.push(b); };
  edges.forEach(e => { link(e.from, e.to); link(e.to, e.from); });
  const depth = new Map<string, number>();
  let q = [...ports.keys()];
  q.forEach(k => depth.set(k, 0));
  if (!q.length) {
    const hasIn = new Set(edges.map(e => e.to));
    q = units.filter(u => !hasIn.has('u' + u.id)).map(u => 'u' + u.id);
    if (!q.length && units.length) q = ['u' + units[0].id];
    q.forEach(k => depth.set(k, 1));
  }
  while (q.length) {
    const k = q.shift()!;
    for (const n of adj.get(k) || []) if (!depth.has(n)) { depth.set(n, depth.get(k)! + 1); q.push(n); }
  }
  let reached = 1;
  units.forEach(u => { const d = depth.get('u' + u.id); if (d != null) reached = Math.max(reached, d); });
  units.forEach(u => { if (!depth.has('u' + u.id)) depth.set('u' + u.id, reached + 1); });
  const maxD = Math.max(1, ...units.map(u => depth.get('u' + u.id)!));
  const rOf = (d: number) => RG * (0.85 - 0.7 * (d - 1) / Math.max(1, maxD - 1));
  const byDepth: Record<number, Section[]> = {};
  units.forEach(u => { const d = depth.get('u' + u.id)!; (byDepth[d] = byDepth[d] || []).push(u); });

  // ins on the west side of the cap, outs on the east
  const pl = [...ports.values()];
  const arc = (arr: PortNode[], phi0: number) => arr.forEach((p, i) => {
    const phi = phi0 + (i - (arr.length - 1) / 2) * Math.min(0.85, 3 / arr.length);
    const th = 0.5;
    p.slot = i;
    p.pos = new Vector3(RG * Math.sin(th) * Math.cos(phi), RG * Math.cos(th), RG * Math.sin(th) * Math.sin(phi));
  });
  arc(pl.filter(p => p.kind === 'in'), Math.PI);
  arc(pl.filter(p => p.kind === 'out'), 0);

  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const sectors: Section[] = [];
  units.forEach(u => { const g = groupOf.get(u) || u; if (!sectors.includes(g)) sectors.push(g); });

  const U: UnitNode[] = units.map(u => {
    const d = depth.get('u' + u.id)!;
    const g = groupOf.get(u) || u;
    const si = sectors.indexOf(g);
    const members = units.filter(v => (groupOf.get(v) || v) === g);
    const mi = members.indexOf(u);
    const phi = 2 * Math.PI * si / sectors.length + (mi - (members.length - 1) / 2) * 0.35 + (rnd() - 0.5) * 0.1;
    const th = Math.min(2.6, 0.6 + 0.4 * (d - 1));
    let r = rOf(d);
    if (maxD >= 3 && d === maxD && byDepth[d].length === 1) r = 0; // lone deepest one goes in the middle
    const size = unitSize(u);
    return {
      key: 'u' + u.id, sec: u, depth: d, r, size, rad: 0.32 + 0.17 * Math.log10(size + 1),
      group: groupOf.get(u) || null, sector: si,
      pos: new Vector3(r * Math.sin(th) * Math.cos(phi), r * Math.cos(th), r * Math.sin(th) * Math.sin(phi)),
      internal: internal.get(u)!,
    };
  });
  const byKey = new Map<string, UnitNode | PortNode>();
  U.forEach(u => byKey.set(u.key, u));
  pl.forEach(p => byKey.set(p.key, p));

  // force pass, but everything stays on its own shell
  const tmp = new Vector3();
  const N = 500;
  for (let it = 0; it < N; it++) {
    const cool = 1 - it / N;
    const cent = new Map<Section, { v: Vector3; n: number }>();
    U.forEach(u => {
      if (!u.group) return;
      const c = cent.get(u.group) || { v: new Vector3(), n: 0 };
      c.v.add(u.pos); c.n++;
      cent.set(u.group, c);
    });
    for (const u of U) {
      if (u.r === 0) continue;
      const f = new Vector3();
      for (const k of adj.get(u.key) || []) { tmp.copy(byKey.get(k)!.pos).sub(u.pos); f.addScaledVector(tmp, 0.03); }
      if (u.group) { const c = cent.get(u.group)!; tmp.copy(c.v).divideScalar(c.n).sub(u.pos); f.addScaledVector(tmp, 0.04); }
      for (const v of U) {
        if (v === u) continue;
        tmp.copy(u.pos).sub(v.pos);
        let d = tmp.length();
        if (d < 1e-3) { tmp.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5); d = 0.01; }
        const sep = u.rad + v.rad + 1.4;
        if (d < sep * 3) f.addScaledVector(tmp.normalize(), 0.5 * sep * sep / (d * d + 0.2));
      }
      pl.forEach(p => {
        tmp.copy(u.pos).sub(p.pos);
        const d = Math.max(0.3, tmp.length());
        if (d < 3.5) f.addScaledVector(tmp.normalize(), 0.8 / (d * d));
      });
      const m = f.length(), cap = 0.5 * cool + 0.04;
      if (m > cap) f.multiplyScalar(cap / m);
      u.pos.add(f);
      u.pos.setLength(u.r);
    }
  }

  const groups: Group[] = sectors.map((g, i) => ({ sec: g, index: i, isRegion: containers.includes(g), units: U.filter(u => u.sector === i) }));
  return { root: R, units: U, ports: pl, edges, selfLoops, groups, maxD, byKey };
}
