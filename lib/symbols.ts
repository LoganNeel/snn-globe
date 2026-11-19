export const PALETTE = ['#8b9bff', '#34d399', '#fb923c', '#f472b6', '#facc15', '#38bdf8', '#a78bfa', '#4ade80', '#f87171', '#2dd4bf'];

export const SYM: Record<string, string> = {
  all: '⊞', one2one: '═', sparse: '∴', local: '◎', topo: '▦', recurrent: '↻',
  wta: 'WTA', converge: '▽', expand: '△', stdp: '✦', inh: '⊣', delay: '⧗',
};

export const SYM_DESC: Record<string, string> = {
  all: 'All-to-all',
  one2one: 'One-to-one',
  sparse: 'Sparse random',
  local: 'Local neighbourhood',
  topo: 'Topographic (keeps the spatial map)',
  recurrent: 'Recurrent (feeds back into itself)',
  wta: 'Winner-take-all',
  converge: 'Converge (many to few)',
  expand: 'Expand (few to many)',
  stdp: 'Learns (STDP)',
  inh: 'Inhibitory',
  delay: 'Delay',
};

export const LINE_COLORS = {
  exc: '#60a5fa',
  inh: '#f87171',
  feedback: '#c084fc',
  broadcast: '#fbbf24',
  portIn: '#2dd4bf',
  portOut: '#fb7185',
};

export const tagBase = (t: string) => t.split('(')[0];
export const tagSym = (t: string) => (tagBase(t) === 'exc' ? null : SYM[tagBase(t)] || t);
export const symLine = (tags: Iterable<string>) => [...new Set([...tags].map(tagSym).filter(Boolean))].join(' ');
export const groupColor = (index: number) => PALETTE[index % PALETTE.length];
