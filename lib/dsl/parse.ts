import type { Arrow, Ast, Body, Conn, SectionAst, Template } from './types';

interface Token {
  t: string;
  v: string;
  line: number;
}

export function tokenize(src: string): Token[] {
  const toks: Token[] = [];
  let i = 0;
  let line = 1;
  const word = /^[A-Za-z_][A-Za-z0-9_.]*/;
  const num = /^[0-9]+(\.[0-9]+)?/;

  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { toks.push({ t: 'nl', v: '', line }); line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (src.startsWith('<->', i)) { toks.push({ t: 'arrow', v: '<->', line }); i += 3; continue; }
    if (src.startsWith('->', i) || src.startsWith('~>', i)) { toks.push({ t: 'arrow', v: src.slice(i, i + 2), line }); i += 2; continue; }
    if ('{}[]():,'.includes(c)) { toks.push({ t: c, v: c, line }); i++; continue; }

    const rest = src.slice(i, i + 200);
    let m = word.exec(rest);
    if (m) { toks.push({ t: 'id', v: m[0], line }); i += m[0].length; continue; }
    m = num.exec(rest);
    if (m) { toks.push({ t: 'num', v: m[0], line }); i += m[0].length; continue; }
    throw new Error(`Line ${line}: unexpected character '${c}'`);
  }
  toks.push({ t: 'eof', v: '', line });
  return toks;
}

const KEYWORDS = ['section', 'in', 'out', 'loop', 'template'];
const emptyBody = (): Body => ({ sections: [], ins: [], outs: [], conns: [], loops: [] });

export function parse(src: string): Ast {
  const T = tokenize(src);
  let p = 0;
  const peek = (k = 0) => T[Math.min(p + k, T.length - 1)];
  const next = () => T[p++];
  const skipNl = () => { while (peek().t === 'nl') p++; };
  const expect = (t: string) => {
    const k = next();
    if (k.t !== t) throw new Error(`Line ${k.line}: expected ${t === 'id' ? 'a name' : `'${t}'`} but found '${k.v || k.t}'`);
    return k;
  };
  const templates: Record<string, Template> = {};

  function body(): Body {
    const b = emptyBody();
    for (;;) {
      skipNl();
      const k = peek();
      if (k.t === '}') { p++; return b; }
      if (k.t === 'eof') throw new Error(`Missing a closing '}'`);
      if (k.t === 'id' && k.v === 'section') { b.sections.push(section()); continue; }
      if (k.t === 'id' && (k.v === 'in' || k.v === 'out')) {
        p++;
        const name = expect('id').v;
        let size: string | null = null;
        if (peek().t === '[') { p++; size = next().v; expect(']'); }
        (k.v === 'in' ? b.ins : b.outs).push({ name, size });
        continue;
      }
      if (k.t === 'id' && k.v === 'loop') {
        p++;
        const name = expect('id').v;
        expect('{');
        const inner = body();
        inner.conns.forEach(c => (c.loop = name));
        b.conns.push(...inner.conns);
        b.loops.push(name);
        continue;
      }
      if (k.t === 'id' && peek(1).t === 'arrow') { b.conns.push(conn()); continue; }
      throw new Error(`Line ${k.line}: didn't understand '${k.v || k.t}'`);
    }
  }

  // A -> B : tag tag(arg)
  function conn(): Conn {
    const f = next();
    const arrow = next().v as Arrow;
    const to = expect('id').v;
    const tags: string[] = [];
    if (peek().t === ':') {
      p++;
      for (;;) {
        const k = peek();
        if (k.t !== 'id' || peek(1).t === 'arrow' || KEYWORDS.includes(k.v)) break;
        p++;
        let tag = k.v;
        if (peek().t === '(') {
          p++;
          let a = '';
          while (peek().t !== ')') {
            const x = next();
            if (x.t === 'eof' || x.t === 'nl') throw new Error(`Line ${k.line}: missing ')'`);
            a += x.v;
          }
          p++;
          tag += `(${a})`;
        }
        tags.push(tag);
      }
    }
    return { from: f.v, arrow, to, tags, line: f.line, loop: null };
  }

  // section Name [: Template(args)] [{ ... }]
  function section(): SectionAst {
    p++;
    const name = expect('id').v;
    let tpl: string | null = null;
    const args: string[] = [];
    if (peek().t === ':') {
      p++;
      tpl = expect('id').v;
      if (peek().t === '(') {
        p++;
        while (peek().t !== ')') {
          const x = next();
          if (x.t === 'eof') throw new Error(`Missing ')'`);
          if (x.t !== ',') args.push(x.v);
        }
        p++;
      }
    }
    let b = emptyBody();
    if (peek().t === '{') { p++; b = body(); }
    return { name, tpl, args, body: b };
  }

  const roots: SectionAst[] = [];
  for (;;) {
    skipNl();
    const k = peek();
    if (k.t === 'eof') break;
    if (k.v === 'template') {
      p++;
      const name = expect('id').v;
      const params: string[] = [];
      if (peek().t === '(') {
        p++;
        while (peek().t !== ')') {
          const x = next();
          if (x.t === 'eof') throw new Error(`Missing ')'`);
          if (x.t === 'id') params.push(x.v);
        }
        p++;
      }
      expect('{');
      templates[name] = { params, body: body() };
      continue;
    }
    if (k.v === 'section') { roots.push(section()); continue; }
    throw new Error(`Line ${k.line}: expected 'section' or 'template', found '${k.v || k.t}'`);
  }
  if (!roots.length) throw new Error('No section found');
  return { templates, roots };
}
