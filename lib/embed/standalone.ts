// Entry point for downloaded .html files. Bundled into public/embed.js by `npm run embed`.

import { buildModel, pathTo } from '../dsl/build';
import type { Model, Section } from '../dsl/types';
import { unescapeFromScript } from '../files';
import { GlobeScene } from '../scene/GlobeScene';

function start() {
  const $ = (id: string) => document.getElementById(id)!;
  const err = $('err'), path = $('path'), tip = $('tip');

  let model: Model;
  try {
    model = buildModel(unescapeFromScript($('snn-source').textContent ?? ''));
  } catch (e) {
    err.textContent = (e as Error).message;
    return;
  }

  let spin = true;
  const scene = new GlobeScene($('stage'), {
    onHover: (hit, x, y) => {
      if (!hit) { tip.style.display = 'none'; return; }
      const label = hit.type === 'unit'
        ? `<b>${hit.unit.sec.name}</b> <span class="m">depth ${hit.unit.depth}${hit.unit.sec.children.length ? ' · click to open' : ''}</span>`
        : `<b>${hit.port.label}</b> <span class="m">${hit.port.kind}</span>`;
      tip.innerHTML = label;
      tip.style.display = 'block';
      tip.style.left = x + 14 + 'px';
      tip.style.top = y + 14 + 'px';
    },
    onOpen: sec => go(sec),
    onUserMove: () => { if (spin) { spin = false; scene.setOptions({ symbols: true, shells: true, spin }); } },
  });
  scene.setOptions({ symbols: true, shells: true, spin });

  function go(sec: Section) {
    try {
      scene.show(sec, model);
      scene.resetCamera();
      err.textContent = '';
    } catch (e) {
      err.textContent = (e as Error).message;
    }
    path.innerHTML = '';
    pathTo(sec).forEach((s, i, all) => {
      if (i) path.insertAdjacentHTML('beforeend', '<span class="sep">/</span>');
      if (i === all.length - 1) {
        const b = document.createElement('b');
        b.textContent = s.name;
        path.appendChild(b);
      } else {
        const btn = document.createElement('button');
        btn.textContent = s.name;
        btn.onclick = () => go(s);
        path.appendChild(btn);
      }
    });
  }

  go(model.root);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
