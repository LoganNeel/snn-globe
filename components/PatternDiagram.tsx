import { LINE_COLORS } from '@/lib/symbols';

// Tiny abstract picture of each connection pattern, shown on hover in the legend.

const W = 200;
const H = 110;
const R = 5;
const SRC = LINE_COLORS.portIn;
const DST = LINE_COLORS.portOut;
const DIM = '#4a4d55';

type P = [number, number];

const column = (x: number, n: number): P[] =>
  Array.from({ length: n }, (_, i) => [x, n === 1 ? H / 2 : 18 + (i * (H - 36)) / (n - 1)]);

const grid = (x0: number, size = 3, step = 20): P[] =>
  Array.from({ length: size * size }, (_, i) => [x0 + (i % size) * step, H / 2 - step + Math.floor(i / size) * step]);

// stop the line at the edge of the target dot so the arrowhead shows
function trim([x1, y1]: P, [x2, y2]: P, a = R + 1, b = R + 3): [P, P] {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  return [[x1 + (dx / len) * a, y1 + (dy / len) * a], [x2 - (dx / len) * b, y2 - (dy / len) * b]];
}

function Line({ from, to, color = LINE_COLORS.exc, width = 1.2, opacity = 0.85, marker = 'arrow', id }: {
  from: P; to: P; color?: string; width?: number; opacity?: number; marker?: 'arrow' | 'bar' | 'none'; id: string;
}) {
  const [a, b] = trim(from, to);
  return (
    <line
      x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
      stroke={color} strokeWidth={width} opacity={opacity}
      markerEnd={marker === 'none' ? undefined : `url(#${id}-${marker})`}
    />
  );
}

const Dots = ({ pts, color }: { pts: P[]; color: string | ((i: number) => string) }) => (
  <>{pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={R} fill={typeof color === 'string' ? color : color(i)} />)}</>
);

function body(kind: string, id: string) {
  const L = (n: number) => column(36, n);
  const Rt = (n: number) => column(164, n);

  switch (kind) {
    case 'all': {
      const a = L(4), b = Rt(4);
      return <>{a.flatMap((p, i) => b.map((q, j) => <Line key={`${i}${j}`} id={id} from={p} to={q} opacity={0.45} />))}<Dots pts={a} color={SRC} /><Dots pts={b} color={DST} /></>;
    }
    case 'one2one': {
      const a = L(5), b = Rt(5);
      return <>{a.map((p, i) => <Line key={i} id={id} from={p} to={b[i]} />)}<Dots pts={a} color={SRC} /><Dots pts={b} color={DST} /></>;
    }
    case 'sparse': {
      const a = L(6), b = Rt(6);
      const pairs = [[0, 2], [1, 5], [3, 0], [4, 3], [5, 1], [2, 4]];
      return <>{pairs.map(([i, j]) => <Line key={`${i}${j}`} id={id} from={a[i]} to={b[j]} />)}<Dots pts={a} color={SRC} /><Dots pts={b} color={DST} /></>;
    }
    case 'local': {
      const a = L(6), b = Rt(6);
      const lines = a.flatMap((p, i) => [i - 1, i, i + 1].filter(j => j >= 0 && j < 6).map(j => <Line key={`${i}${j}`} id={id} from={p} to={b[j]} opacity={j === i ? 0.9 : 0.4} />));
      return <>{lines}<Dots pts={a} color={SRC} /><Dots pts={b} color={DST} /></>;
    }
    case 'topo': {
      const a = grid(26, 3, 24), b = grid(126, 3, 24);
      const hue = (i: number) => `hsl(${40 + i * 30} 70% 62%)`;
      return <>{a.map((p, i) => <Line key={i} id={id} from={p} to={b[i]} opacity={0.3} marker="none" />)}<Dots pts={a} color={hue} /><Dots pts={b} color={hue} /></>;
    }
    case 'recurrent': {
      const ring: P[] = Array.from({ length: 6 }, (_, i) => [100 + 34 * Math.cos((i / 6) * Math.PI * 2 - Math.PI / 2), H / 2 + 34 * Math.sin((i / 6) * Math.PI * 2 - Math.PI / 2)]);
      return <>{ring.map((p, i) => <Line key={i} id={id} from={p} to={ring[(i + 2) % 6]} opacity={0.6} />)}<Dots pts={ring} color={SRC} /></>;
    }
    case 'wta': {
      const row: P[] = Array.from({ length: 5 }, (_, i) => [28 + i * 36, H / 2 + 8]);
      return (
        <>
          {row.map((p, i) => i !== 2 && (
            <path key={i} d={`M100 ${H / 2 + 1} Q ${(100 + p[0]) / 2} 18 ${p[0]} ${p[1] - R - 3}`} fill="none" stroke={LINE_COLORS.inh} strokeWidth={1.2} opacity={0.85} markerEnd={`url(#${id}-bar)`} />
          ))}
          <Dots pts={row} color={i => (i === 2 ? '#e2b45a' : DIM)} />
          <circle cx={100} cy={H / 2 + 8} r={R + 3} fill="none" stroke="#e2b45a" strokeWidth={1} />
        </>
      );
    }
    case 'converge': {
      const a = L(6), b = Rt(2);
      return <>{a.map((p, i) => <Line key={i} id={id} from={p} to={b[i < 3 ? 0 : 1]} />)}<Dots pts={a} color={SRC} /><Dots pts={b} color={DST} /></>;
    }
    case 'expand': {
      const a = L(2), b = Rt(6);
      return <>{b.map((q, j) => <Line key={j} id={id} from={a[j < 3 ? 0 : 1]} to={q} />)}<Dots pts={a} color={SRC} /><Dots pts={b} color={DST} /></>;
    }
    case 'stdp': {
      const a = L(4), b = Rt(4);
      const w = [[2.6, 0.4, 0.3, 1.2], [0.3, 2.2, 0.8, 0.3], [1.4, 0.3, 2.8, 0.5], [0.4, 0.9, 0.3, 2.4]];
      return <>{a.flatMap((p, i) => b.map((q, j) => <Line key={`${i}${j}`} id={id} from={p} to={q} width={w[i][j]} opacity={0.25 + w[i][j] / 4} marker="none" />))}<Dots pts={a} color={SRC} /><Dots pts={b} color={DST} /></>;
    }
    case 'inh': {
      const a = L(4), b = Rt(4);
      return <>{a.map((p, i) => <Line key={i} id={id} from={p} to={b[i]} color={LINE_COLORS.inh} marker="bar" />)}<Dots pts={a} color={SRC} /><Dots pts={b} color={DST} /></>;
    }
    case 'delay': {
      const a: P = [36, H / 2], b: P = [164, H / 2];
      return (
        <>
          <Line id={id} from={a} to={b} />
          <circle r={3} fill="#e2b45a">
            <animateMotion dur="1.6s" repeatCount="indefinite" path={`M${a[0] + R} ${a[1]} L${b[0] - R - 4} ${b[1]}`} />
          </circle>
          <Dots pts={[a]} color={SRC} />
          <Dots pts={[b]} color={DST} />
          <text x={a[0]} y={a[1] + 22} textAnchor="middle" fontSize={10} fill="#7f828b">t</text>
          <text x={b[0]} y={b[1] + 22} textAnchor="middle" fontSize={10} fill="#7f828b">t + Δ</text>
        </>
      );
    }
    default:
      return null;
  }
}

export const PATTERN_NOTES: Record<string, string> = {
  all: 'Every neuron on one side connects to every neuron on the other.',
  one2one: 'Neuron i only talks to neuron i.',
  sparse: 'A random handful of connections. sparse(0.1) means about 10% of all possible pairs.',
  local: 'Each neuron only reaches its neighbors on the other side.',
  topo: 'Neighbors stay neighbors, so the spatial map (like an image) is kept.',
  recurrent: 'The section feeds back into itself, which lets activity linger.',
  wta: 'The most active neuron shuts the others down.',
  converge: 'Lots of neurons funnel into a few.',
  expand: 'A few neurons fan out to many.',
  stdp: 'Weights change with spike timing, so some links get strong and others fade.',
  inh: 'Spikes push the target away from firing instead of toward it.',
  delay: 'Spikes take a while to arrive.',
};

export default function PatternDiagram({ kind }: { kind: string }) {
  const id = `pd-${kind}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" aria-hidden>
      <defs>
        <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M1 1L9 5L1 9z" fill={LINE_COLORS.exc} />
        </marker>
        <marker id={`${id}-bar`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M5 0V10" stroke={LINE_COLORS.inh} strokeWidth="2.5" />
        </marker>
      </defs>
      {body(kind, id)}
    </svg>
  );
}
