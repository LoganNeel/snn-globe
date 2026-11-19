export type Arrow = '->' | '<->' | '~>';

export interface PortDecl {
  name: string;
  size: string | null;
}

export interface Conn {
  from: string;
  arrow: Arrow;
  to: string;
  tags: string[];
  line: number;
  loop: string | null;
}

export interface Body {
  sections: SectionAst[];
  ins: PortDecl[];
  outs: PortDecl[];
  conns: Conn[];
  loops: string[];
}

export interface SectionAst {
  name: string;
  tpl: string | null;
  args: string[];
  body: Body;
}

export interface Template {
  params: string[];
  body: Body;
}

export interface Ast {
  templates: Record<string, Template>;
  roots: SectionAst[];
}

export interface Port {
  name: string;
  size: number | null;
}

export interface Section {
  id: number;
  name: string;
  parent: Section | null;
  children: Section[];
  ins: Port[];
  outs: Port[];
  conns: Conn[];
  loops: string[];
  tpl: string | null;
}

export interface Endpoint {
  sec: Section;
  port: string | null;
}

export interface Edge {
  a: Endpoint;
  b: Endpoint;
  arrow: Arrow;
  tags: string[];
  loop: string | null;
  line: number;
}

export interface Model {
  root: Section;
  edges: Edge[];
}
