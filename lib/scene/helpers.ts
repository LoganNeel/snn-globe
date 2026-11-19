import * as THREE from 'three';

const FONT = 'Inter, "Segoe UI", "Segoe UI Symbol", system-ui, sans-serif';

interface SpriteOpts {
  size?: number;
  color?: string;
  sub?: string;
  bg?: string | null;
  border?: string | null;
  scale?: number;
}

export function textSprite(lines: string[], { size = 44, color = '#e6eaf2', sub = '#9aa6b8', bg = null, border = null, scale = 1 }: SpriteOpts = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const f0 = `600 ${size}px ${FONT}`;
  const f1 = `400 ${Math.round(size * 0.82)}px ${FONT}`;
  const widths = lines.map((l, i) => { ctx.font = i ? f1 : f0; return ctx.measureText(l).width; });
  const lh = size * 1.25;
  c.width = Math.ceil(Math.max(...widths) + size * (bg ? 0.9 : 0.4));
  c.height = Math.ceil(lines.length * lh + size * 0.35);

  if (bg) {
    const r = c.height / 2, w = c.width, h = c.height;
    ctx.fillStyle = bg;
    ctx.strokeStyle = border || bg;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r, 1.5);
    ctx.lineTo(w - r, 1.5);
    ctx.arc(w - r, r, r - 1.5, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(r, h - 1.5);
    ctx.arc(r, r, r - 1.5, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    ctx.font = i ? f1 : f0;
    ctx.fillStyle = i ? sub : color;
    ctx.fillText(l, c.width / 2, size * 0.18 + lh * (i + 0.5));
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  const k = scale * 0.0115;
  s.scale.set(c.width * k, c.height * k, 1);
  s.renderOrder = 10;
  return s;
}

export function ring(r: number, color: number, opacity: number, dashed = false) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.35, gapSize: 0.3 })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const l = new THREE.Line(g, m);
  if (dashed) l.computeLineDistances();
  return l;
}

export function disposeTree(o: THREE.Object3D) {
  o.traverse(x => {
    const mesh = x as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
    mats.forEach(m => {
      const map = (m as THREE.SpriteMaterial).map;
      if (map) map.dispose();
      m.dispose();
    });
  });
}

export function setFade(o: THREE.Object3D, amount: number) {
  const m = (o as THREE.Mesh).material as THREE.Material | undefined;
  if (!m || Array.isArray(m)) return;
  if (m.userData.base === undefined) m.userData.base = m.opacity;
  m.opacity = m.userData.base * amount;
}
