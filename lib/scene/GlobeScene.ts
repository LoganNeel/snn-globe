import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Model, Section } from '../dsl/types';
import { GLOBE_RADIUS as RG, isUnit, layout, type Layout, type PortNode, type UnitNode, type ViewEdge } from '../layout';
import { LINE_COLORS, groupColor, symLine } from '../symbols';
import { disposeTree, ring, setFade, textSprite } from './helpers';

export type Hit = { type: 'unit'; unit: UnitNode } | { type: 'port'; port: PortNode };

export interface SceneOptions {
  symbols: boolean;
  shells: boolean;
  spin: boolean;
}

interface Handlers {
  onHover: (hit: Hit | null, x: number, y: number) => void;
  onOpen: (sec: Section) => void;
  onUserMove: () => void;
}

type EdgeLike = Pick<ViewEdge, 'from' | 'to' | 'loop'>;

export class GlobeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  private controls: OrbitControls;
  private world = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private downAt: [number, number] | null = null;

  private pick: { mesh: THREE.Object3D; hit: Hit }[] = [];
  private unitObjs: { u: UnitNode; objs: THREE.Object3D[] }[] = [];
  private edgeObjs: { e: EdgeLike; objs: THREE.Object3D[] }[] = [];
  private symbolSprites: THREE.Object3D[] = [];
  private shellObjs: THREE.Object3D[] = [];
  private options: SceneOptions = { symbols: true, shells: true, spin: true };

  constructor(private container: HTMLElement, private handlers: Handlers) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color('#101114');
    this.scene.add(this.world);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(8, 14, 10);
    const fill = new THREE.DirectionalLight(0x8899ff, 1.1);
    fill.position.set(-10, -6, -8);
    this.scene.add(key, fill);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 80;
    this.controls.addEventListener('start', () => handlers.onUserMove());

    const el = this.renderer.domElement;
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerleave', this.onPointerLeave);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.resetCamera();
    this.animate();
  }

  show(root: Section, model: Model): Layout {
    this.scene.remove(this.world);
    disposeTree(this.world);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.pick = [];
    this.unitObjs = [];
    this.edgeObjs = [];
    this.symbolSprites = [];
    this.shellObjs = [];

    const L = layout(root, model.edges);
    this.drawGlobe(L);
    this.drawPorts(L);
    this.drawUnits(L);
    this.drawEdges(L);
    this.drawSelfLoops(L);
    this.applyOptions();
    return L;
  }

  setOptions(o: SceneOptions) {
    this.options = o;
    this.applyOptions();
  }

  // no args = clear
  highlight(unitPred?: (u: UnitNode) => boolean, edgePred?: (e: EdgeLike) => boolean) {
    this.unitObjs.forEach(({ u, objs }) => objs.forEach(o => setFade(o, !unitPred || unitPred(u) ? 1 : 0.12)));
    this.edgeObjs.forEach(({ e, objs }) => objs.forEach(o => setFade(o, !edgePred || edgePred(e) ? 1 : 0.06)));
  }

  resetCamera() {
    this.camera.position.set(0, 13, 27);
    this.controls.target.set(0, 1.5, 0);
    this.controls.update();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    this.controls.dispose();
    disposeTree(this.world);
    this.renderer.dispose();
    el.remove();
  }

  private drawGlobe(L: Layout) {
    const faint = (r: number, opacity: number) =>
      new THREE.Mesh(
        new THREE.SphereGeometry(r, 48, 32),
        new THREE.MeshBasicMaterial({ color: 0x9aa6ff, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }),
      );

    this.world.add(faint(RG, 0.035), ring(RG, 0x3a4560, 0.9));
    [Math.PI / 2, 0].forEach(rz => {
      const m = ring(RG, 0x2a3348, 0.6);
      m.rotation.x = Math.PI / 2;
      m.rotation.z = rz;
      this.world.add(m);
    });

    const shells = new Map<string, { r: number; d: number }>();
    L.units.forEach(u => { if (u.r > 0) shells.set(u.r.toFixed(3), { r: u.r, d: u.depth }); });
    shells.forEach(({ r, d }) => {
      const label = textSprite([`depth ${d}`], { size: 30, color: '#5d6884', scale: 0.9 });
      label.position.set(r * Math.cos(0.6), 0, r * Math.sin(0.6) + 0.1);
      const objs = [faint(r, 0.025), ring(r, 0x46527a, 0.8, true), label];
      this.shellObjs.push(...objs);
      this.world.add(...objs);
    });
    if (L.units.some(u => u.r === 0)) {
      const label = textSprite([`depth ${L.maxD} (core)`], { size: 30, color: '#5d6884', scale: 0.9 });
      label.position.set(0, -1.4, 0);
      this.shellObjs.push(label);
      this.world.add(label);
    }
  }

  private drawPorts(L: Layout) {
    L.ports.forEach(p => {
      const col = p.kind === 'in' ? LINE_COLORS.portIn : LINE_COLORS.portOut;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 20, 16),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, transparent: true, opacity: p.ext ? 0.7 : 1 }),
      );
      m.position.copy(p.pos);
      const tip = p.pos.clone().multiplyScalar(1.12);
      const stalk = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([p.pos, tip]),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.6 }),
      );
      const sub = p.ext ? (p.kind === 'in' ? 'from outside' : 'to outside') : p.kind;
      const label = textSprite([p.label, sub], { size: 38, color: col, scale: 0.85 });
      label.position.copy(tip).add(new THREE.Vector3(0, 0.75 + (p.slot % 2) * 0.9, 0));
      this.world.add(m, stalk, label);
      this.pick.push({ mesh: m, hit: { type: 'port', port: p } });
    });
  }

  private drawUnits(L: Layout) {
    L.units.forEach(u => {
      const col = groupColor(u.sector);
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(u.rad, 32, 24),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.18, roughness: 0.45, metalness: 0.1, transparent: true }),
      );
      m.position.copy(u.pos);
      const objs: THREE.Object3D[] = [m];

      // ring = has children, clickable
      if (u.sec.children.length) {
        const t = new THREE.Mesh(
          new THREE.TorusGeometry(u.rad + 0.22, 0.035, 8, 48),
          new THREE.MeshBasicMaterial({ color: 0xe6eaf2, transparent: true, opacity: 0.85 }),
        );
        t.position.copy(u.pos);
        t.rotation.x = Math.PI / 2;
        objs.push(t);
      }

      const lines = [u.sec.name];
      const inside = symLine(u.internal);
      if (inside) lines.push(inside);
      const label = textSprite(lines, { size: 44, color: '#f1f4fa' });
      label.position.copy(u.pos).add(new THREE.Vector3(0, u.rad + 0.35 + label.scale.y / 2, 0));
      objs.push(label);

      this.world.add(...objs);
      this.unitObjs.push({ u, objs });
      this.pick.push({ mesh: m, hit: { type: 'unit', unit: u } });
    });
  }

  private drawEdges(L: Layout) {
    const pairCount = new Map<string, number>();
    L.edges.forEach(e => {
      const A = L.byKey.get(e.from)!, B = L.byKey.get(e.to)!;
      const ra = isUnit(A) ? A.rad : 0.34;
      const rb = isUnit(B) ? B.rad : 0.34;
      const col = e.broadcast ? LINE_COLORS.broadcast : e.inh ? LINE_COLORS.inh : e.feedback ? LINE_COLORS.feedback : LINE_COLORS.exc;

      // bow outward, and nudge sideways so A->B and B->A don't overlap
      const pk = [e.from, e.to].sort().join('|');
      const n = pairCount.get(pk) || 0;
      pairCount.set(pk, n + 1);
      const mid = A.pos.clone().add(B.pos).multiplyScalar(0.5);
      const dist = A.pos.distanceTo(B.pos);
      const dir = mid.length() > 0.05 ? mid.clone().normalize() : new THREE.Vector3(0, 1, 0);
      const ctrl = mid.clone().addScaledVector(dir, dist * 0.22 + (e.feedback ? 1.8 : 0.4));
      const perp = new THREE.Vector3().crossVectors(dir, B.pos.clone().sub(A.pos)).normalize();
      ctrl.addScaledVector(perp, (e.from < e.to ? 1 : -1) * (0.35 + n * 0.5));
      const p0 = A.pos.clone().add(ctrl.clone().sub(A.pos).normalize().multiplyScalar(ra + 0.05));
      const p2 = B.pos.clone().add(ctrl.clone().sub(B.pos).normalize().multiplyScalar(rb + 0.08));
      const curve = new THREE.QuadraticBezierCurve3(p0, ctrl, p2);
      const objs: THREE.Object3D[] = [];

      if (e.broadcast) {
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)),
          new THREE.LineDashedMaterial({ color: col, dashSize: 0.35, gapSize: 0.25, transparent: true }),
        );
        line.computeLineDistances();
        objs.push(line);
        if (isUnit(B)) {
          const halo = new THREE.Mesh(
            new THREE.SphereGeometry(B.rad * 1.75, 32, 24),
            new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.13, depthWrite: false }),
          );
          halo.position.copy(B.pos);
          objs.push(halo);
        }
      } else {
        objs.push(new THREE.Mesh(
          new THREE.TubeGeometry(curve, 48, 0.045, 6, false),
          new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 }),
        ));
      }

      const tan = curve.getTangent(1).normalize();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.48, 12), new THREE.MeshBasicMaterial({ color: col, transparent: true }));
      cone.position.copy(p2).addScaledVector(tan, -0.24);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
      objs.push(cone);

      const s = symLine(e.tags);
      if (s) {
        const sp = textSprite([s], { size: 34, color: col, bg: 'rgba(11,14,20,0.88)', border: col, scale: 0.8 });
        sp.position.copy(curve.getPoint(0.5));
        objs.push(sp);
        this.symbolSprites.push(sp);
      }
      this.world.add(...objs);
      this.edgeObjs.push({ e, objs });
    });
  }

  private drawSelfLoops(L: Layout) {
    L.selfLoops.forEach(sl => {
      const u = L.byKey.get('u' + sl.unit.id);
      if (!isUnit(u)) return;
      const col = sl.tags.includes('inh') ? LINE_COLORS.inh : LINE_COLORS.exc;
      const out = u.pos.length() > 0.1 ? u.pos.clone().normalize() : new THREE.Vector3(1, 0, 0);
      const t = new THREE.Mesh(new THREE.TorusGeometry(u.rad * 0.75, 0.04, 8, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true }));
      t.position.copy(u.pos).addScaledVector(out, u.rad + 0.2);
      t.lookAt(t.position.clone().add(new THREE.Vector3(0, 1, 0).cross(out).normalize()));
      const objs: THREE.Object3D[] = [t];

      const s = symLine(sl.tags);
      if (s) {
        const sp = textSprite([s], { size: 34, color: col, bg: 'rgba(11,14,20,0.88)', border: col, scale: 0.8 });
        sp.position.copy(u.pos).addScaledVector(out, u.rad * 2 + 0.9);
        objs.push(sp);
        this.symbolSprites.push(sp);
      }
      this.world.add(...objs);
      this.edgeObjs.push({ e: { from: u.key, to: u.key, loop: sl.loop }, objs });
    });
  }

  private applyOptions() {
    this.symbolSprites.forEach(s => (s.visible = this.options.symbols));
    this.shellObjs.forEach(s => (s.visible = this.options.shells));
    this.controls.autoRotate = this.options.spin;
  }

  private hitAt(ev: PointerEvent): Hit | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pick.map(p => p.mesh));
    return hits.length ? this.pick.find(p => p.mesh === hits[0].object)!.hit : null;
  }

  private onPointerMove = (ev: PointerEvent) => {
    const hit = this.hitAt(ev);
    const openable = hit?.type === 'unit' && hit.unit.sec.children.length > 0;
    this.renderer.domElement.style.cursor = openable ? 'pointer' : 'default';
    const r = this.container.getBoundingClientRect();
    this.handlers.onHover(hit, ev.clientX - r.left, ev.clientY - r.top);
  };

  private onPointerLeave = () => this.handlers.onHover(null, 0, 0);

  private onPointerDown = (ev: PointerEvent) => {
    this.downAt = [ev.clientX, ev.clientY];
  };

  private onPointerUp = (ev: PointerEvent) => {
    if (!this.downAt || Math.hypot(ev.clientX - this.downAt[0], ev.clientY - this.downAt[1]) > 5) return;
    const hit = this.hitAt(ev);
    if (hit?.type === 'unit' && hit.unit.sec.children.length) {
      this.handlers.onHover(null, 0, 0);
      this.handlers.onOpen(hit.unit.sec);
    }
  };

  private resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    this.frame = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}
