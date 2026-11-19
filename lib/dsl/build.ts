import { parse } from './parse';
import type { Ast, Body, Edge, Endpoint, Model, Section, SectionAst } from './types';

let nextId = 0;
let count = 0;

// stops runaway templates (e.g. one that nests itself) from locking up the tab
export const MAX_SECTIONS = 20000;

export function buildModel(src: string): Model {
  return build(parse(src));
}

export function build(ast: Ast): Model {
  count = 0;
  const root = instantiate(ast.roots[ast.roots.length - 1], null, ast, {});
  const edges: Edge[] = [];
  (function collect(s: Section) {
    for (const c of s.conns) {
      edges.push({
        a: resolve(s, c.from, c.line),
        b: resolve(s, c.to, c.line),
        arrow: c.arrow,
        tags: c.tags,
        loop: c.loop,
        line: c.line,
      });
    }
    s.children.forEach(collect);
  })(root);
  return { root, edges };
}

function instantiate(a: SectionAst, parent: Section | null, ast: Ast, env: Record<string, string>): Section {
  if (++count > MAX_SECTIONS) throw new Error(`More than ${MAX_SECTIONS} sections. Check for a template that includes itself.`);
  const s: Section = { id: nextId++, name: a.name, parent, children: [], ins: [], outs: [], conns: [], loops: [], tpl: a.tpl };
  const parts: [Body, Record<string, string>][] = [];

  if (a.tpl) {
    const t = ast.templates[a.tpl];
    if (!t) throw new Error(`Unknown template '${a.tpl}' used by section ${a.name}`);
    const e: Record<string, string> = {};
    t.params.forEach((name, i) => (e[name] = a.args[i]));
    parts.push([t.body, e]);
  }
  parts.push([a.body, env]);

  const sub = (v: string | null, e: Record<string, string>) => (v != null && e[v] != null ? e[v] : v);
  for (const [b, e] of parts) {
    b.ins.forEach(x => s.ins.push({ name: x.name, size: Number(sub(x.size, e)) || null }));
    b.outs.forEach(x => s.outs.push({ name: x.name, size: Number(sub(x.size, e)) || null }));
    b.sections.forEach(c => s.children.push(instantiate(c, s, ast, e)));
    b.conns.forEach(c => s.conns.push(c));
    s.loops.push(...b.loops);
  }
  return s;
}

export const hasPort = (s: Section, n: string) => s.ins.some(x => x.name === n) || s.outs.some(x => x.name === n);

function findDesc(s: Section, name: string): Section | null {
  const q = [...s.children];
  while (q.length) {
    const c = q.shift()!;
    if (c.name === name) return c;
    q.push(...c.children);
  }
  return null;
}

// "V1.ff" / "LGN" / "retina", looked up from where the connection was written
function resolve(owner: Section, ref: string, line: number): Endpoint {
  const parts = ref.split('.');
  if (parts.length === 1) {
    if (hasPort(owner, ref)) return { sec: owner, port: ref };
    const d = findDesc(owner, ref);
    if (d) return { sec: d, port: null };
  } else {
    let cur = findDesc(owner, parts[0]);
    for (let i = 1; cur && i < parts.length - 1; i++) cur = cur.children.find(c => c.name === parts[i]) ?? null;
    if (cur) {
      const last = parts[parts.length - 1];
      const child = cur.children.find(c => c.name === last);
      if (child && !hasPort(cur, last)) return { sec: child, port: null };
      return { sec: cur, port: last }; // fine to use a port you didn't declare
    }
  }
  throw new Error(`Line ${line}: can't find '${ref}' inside ${owner.name}`);
}

export function isDescOrSelf(s: Section | null, anc: Section): boolean {
  while (s) {
    if (s === anc) return true;
    s = s.parent;
  }
  return false;
}

// only used for sphere size
export function unitSize(s: Section): number {
  const m = Math.max(0, ...[...s.ins, ...s.outs].map(p => p.size || 0));
  if (m) return m;
  if (s.children.length) return s.children.reduce((t, c) => t + unitSize(c), 0);
  return 64;
}

export function pathTo(s: Section): Section[] {
  const p: Section[] = [];
  let cur: Section | null = s;
  while (cur) { p.unshift(cur); cur = cur.parent; }
  return p;
}
