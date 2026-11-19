import { SITE } from './site';

// files are read in the browser only; nothing is ever sent to a server
export const MAX_FILE_BYTES = 1024 * 1024;
export const ACCEPT = '.snn,.txt,.html,.htm';

const SOURCE_TAG = /<script[^>]*id=["']snn-source["'][^>]*>([\s\S]*?)<\/script>/i;

// keep "</script>" in the network text from closing the tag early
const escapeForScript = (s: string) => s.replace(/<\//g, '<\\/');
export const unescapeFromScript = (s: string) => s.replace(/<\\\//g, '</');

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export async function readNetworkFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 1 MB.`);
  }
  const text = await file.text();
  if (/\.html?$/i.test(file.name) || /^\s*<!doctype html/i.test(text)) {
    const m = SOURCE_TAG.exec(text);
    if (!m) throw new Error(`${file.name} isn't an SNN Globe export.`);
    return unescapeFromScript(m[1]).trim();
  }
  return text;
}

export function fileBaseName(rootName: string) {
  return rootName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'network';
}

function save(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSnn(source: string, rootName: string) {
  save(`${fileBaseName(rootName)}.snn`, source, 'text/plain');
}

// one self-contained page: viewer + network, opens in any browser offline
export async function downloadHtml(source: string, rootName: string) {
  const res = await fetch('/embed.js');
  if (!res.ok) throw new Error('Viewer bundle missing. Run "npm run embed".');
  const js = (await res.text()).replace(/<\/script/gi, '<\\/script');
  save(`${fileBaseName(rootName)}.html`, standaloneHtml(source, rootName, js), 'text/html');
}

function standaloneHtml(source: string, title: string, js: string) {
  const credit = `© ${SITE.year} ${escapeHtml(SITE.author)} · ${escapeHtml(SITE.email)} · ${escapeHtml(SITE.license)} License`;
  const link = SITE.siteUrl ? ` · <a href="${escapeHtml(SITE.siteUrl)}">open in editor</a>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="${escapeHtml(SITE.name)}">
<title>${escapeHtml(title)} · ${escapeHtml(SITE.name)}</title>
<style>
  html, body { margin: 0; height: 100%; background: #101114; color: #d9dade; font: 13px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; overflow: hidden; }
  #stage { position: fixed; inset: 0; }
  #stage canvas { display: block; }
  #bar { position: fixed; top: 12px; left: 14px; z-index: 2; }
  #bar .name { font-weight: 600; font-size: 14px; }
  #path { font: 12px ui-monospace, Consolas, monospace; margin-top: 4px; }
  #path button { background: none; border: 0; padding: 0; color: #7f828b; cursor: pointer; font: inherit; }
  #path button:hover { color: #d9dade; text-decoration: underline; }
  #path span.sep { color: #7f828b; margin: 0 5px; }
  #err { color: #f08a7e; font: 12px ui-monospace, Consolas, monospace; margin-top: 8px; white-space: pre-wrap; max-width: 60ch; }
  #foot { position: fixed; left: 14px; bottom: 10px; color: #7f828b; font-size: 11px; z-index: 2; }
  #foot a { color: inherit; }
  #tip { position: fixed; pointer-events: none; background: #1a1b20; border: 1px solid #26282e; border-radius: 4px; padding: 6px 9px; font-size: 12px; display: none; z-index: 3; }
  #tip .m { color: #7f828b; }
</style>
</head>
<body>
<script type="text/snn" id="snn-source">
${escapeForScript(source)}
</script>
<div id="stage"></div>
<div id="bar"><div class="name">${escapeHtml(SITE.name)}</div><div id="path"></div><div id="err"></div></div>
<div id="tip"></div>
<div id="foot">${credit}${link}</div>
<script>${js}</script>
</body>
</html>
`;
}
