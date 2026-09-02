#!/usr/bin/env node
// Récupère le logo de chaque outil depuis son propre site, et l'écrit en PNG
// normalisé dans public/logos/. Aucun service tiers payant : on lit le <head>
// de l'éditeur, ce qu'un navigateur fait de toute façon.
//
//   node scripts/enrich/logos.mjs            # seulement ceux qui manquent
//   node scripts/enrich/logos.mjs --all      # tout refaire
//   node scripts/enrich/logos.mjs --only appfolio,deepki
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { statSync, unlinkSync } from 'node:fs';
import {
  ROOT, join, loadTools, pool, fetchWithTimeout, ensureDir, today, imagemagick,
  readFileSync, writeFileSync, existsSync, upsertBlock, dropBlock, scrapeHtml,
} from './lib.mjs';

const run = promisify(execFile);
const IM = imagemagick();
if (!IM) {
  console.error("ImageMagick est absent : ni `magick` ni `convert` sur le PATH.");
  console.error('  macOS  : brew install imagemagick');
  console.error('  Ubuntu : sudo apt-get install -y imagemagick');
  process.exit(1);
}
/** Lance ImageMagick, quelle que soit la génération installée. */
const im = (kind, args) => run(IM[kind][0], [...IM[kind].slice(1), ...args]);
const OUT = ensureDir(join(ROOT, 'public', 'logos'));

// Les logos qu'un humain a regardés et refusés. Sans cette liste, la passe
// suivante réadopte exactement la même image : `grab()` prend la meilleure
// candidate du site, et « meilleure » ne veut pas dire « c'est un logo ». Sur
// `poliris`, c'était un export de diapositive du repreneur. Un jugement humain
// doit survivre à la passe qui l'a motivé — donc `--all` ne le contourne pas.
const REFUSED = (() => {
  const f = join(ROOT, 'data', 'logos-refuses.json');
  if (!existsSync(f)) return new Map();
  const { refuses = [] } = JSON.parse(readFileSync(f, 'utf8'));
  return new Map(refuses.map((r) => [r.slug, r]));
})();
const args = process.argv.slice(2);
const ALL = args.includes('--all');
const ONLY = (args.find((a) => a.startsWith('--only'))?.split('=')[1] ??
  (args.includes('--only') ? args[args.indexOf('--only') + 1] : '') ?? '')
  .split(',').filter(Boolean);

/** Les candidats d'un <head>, du meilleur au pire. */
function candidates(html, base) {
  const abs = (u) => { try { return new URL(u, base).href; } catch { return null; } };
  const found = [];
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of links) {
    const rel = (tag.match(/rel=["']([^"']+)["']/i)?.[1] ?? '').toLowerCase();
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href || !/icon/.test(rel)) continue;
    const size = parseInt(tag.match(/sizes=["'](\d+)/i)?.[1] ?? '0', 10);
    // Un apple-touch-icon est presque toujours le logo propre en 180 px.
    const rank = rel.includes('apple-touch') ? 1000 + size
      : /\.svg($|\?)/i.test(href) ? 900
      : size || (/\.ico($|\?)/i.test(href) ? 1 : 40);
    const u = abs(href);
    if (u) found.push({ url: u, rank });
  }
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  // og:image est souvent une bannière, pas une marque : dernier recours.
  if (og && abs(og)) found.push({ url: abs(og), rank: 5 });
  found.push({ url: abs('/favicon.ico'), rank: 1 });
  const seen = new Set();
  return found
    .filter((c) => c.url && !seen.has(c.url) && seen.add(c.url))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 6);
}

async function html(website, { viaFirecrawl = false } = {}) {
  if (viaFirecrawl) {
    const raw = await scrapeHtml(website);
    return raw ? { text: raw, base: website } : null;
  }
  const u = new URL(website);
  const tries = [website, `${u.protocol}//www.${u.hostname.replace(/^www\./, '')}${u.pathname}`,
                 `${u.protocol}//${u.hostname.replace(/^www\./, '')}/`];
  for (const t of [...new Set(tries)]) {
    try {
      const r = await fetchWithTimeout(t, { ms: 20000 });
      if (!r.ok) continue;
      const text = await r.text();
      if (text.length > 200) return { text, base: r.url };
    } catch { /* domaine muet : on essaie la variante suivante */ }
  }
  return null;
}

/** Une image dont TOUT le contenu visible est d'une seule couleur ne porte aucune
 *  forme : c'est un carré plein, pas un logo. Le cas arrive sans un mot dès que
 *  la source est un SVG et que le délégué `rsvg-convert` manque — ImageMagick
 *  rend alors un aplat au lieu d'échouer, à la bonne taille et au bon poids, si
 *  bien que ni le contrôle de dimensions ni celui de taille de fichier ne le
 *  voient. On rogne le transparent, puis on compte les couleurs restantes : un
 *  glyphe monochrome sur fond transparent en garde deux, un aplat une seule.
 *  Mesuré sur les 198 logos du catalogue : deux positifs, tous deux réellement
 *  blancs, aucun faux. */
async function isBlank(png) {
  try {
    const { stdout } = await im('convert', [png, '-trim', '+repage', '-format', '%k', 'info:']);
    return parseInt(stdout.trim(), 10) <= 1;
  } catch {
    return false;   // rognage impossible : on ne condamne pas sur un doute
  }
}

/** Normalise en PNG 256 px, fond transparent conservé, et refuse le minuscule. */
async function normalise(buf, slug, ext) {
  const tmp = join(OUT, `.tmp-${slug}${ext}`);
  const out = join(OUT, `${slug}.png`);
  writeFileSync(tmp, buf);
  try {
    await im('convert', [
      `${ext === '.ico' ? 'ico:' : ''}${tmp}${ext === '.ico' ? '[0]' : ''}`,
      '-background', 'none', '-alpha', 'on',
      '-resize', '256x256>', '-gravity', 'center', '-extent', '256x256',
      '-strip', `PNG32:${out}`,
    ]);
    const { stdout } = await im('identify', ['-format', '%[fx:w]x%[fx:h] %[opaque]', out]);
    return { out, dims: stdout.trim() };
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

/** Dernier recours : les proxys d'icônes publics. Moins bon qu'un logo pris
 *  chez l'éditeur, mais la provenance est enregistrée telle quelle. */
function proxies(website) {
  const h = new URL(website).hostname.replace(/^www\./, '');
  return [
    { url: `https://icons.duckduckgo.com/ip3/${h}.ico`, rank: 3 },
    { url: `https://www.google.com/s2/favicons?domain=${h}&sz=256`, rank: 2 },
  ];
}

async function grab(tool) {
  if (REFUSED.has(tool.slug)) {
    const dest = join(OUT, `${tool.slug}.png`);
    if (existsSync(dest)) unlinkSync(dest);
    // Effacer le PNG sans retirer le bloc `logo` de la fiche laisserait une
    // référence pendante : le validateur refuse le catalogue entier, et le
    // refus humain se lit comme une panne. Le geste doit être complet.
    if (tool.logo?.file) return { slug: tool.slug, status: 'refusé à la relecture', dropLogo: true };
    return { slug: tool.slug, status: 'refusé à la relecture' };
  }
  const dest = join(OUT, `${tool.slug}.png`);
  // Un PNG présent dont la fiche ne dit rien est un orphelin : le fichier a été
  // récupéré lors d'une passe dont l'écriture du bloc `logo` ne s'est pas faite.
  // Le site ne l'affichera jamais, et sans provenance on ne peut pas l'adopter —
  // le validateur exige `source_url`. Il faut donc le reprendre, pas le sauter.
  const orphan = existsSync(dest) && !tool.logo?.file;
  if (!ALL && !orphan && existsSync(dest) && statSync(dest).size > 400) {
    return { slug: tool.slug, status: 'déjà là' };
  }

  let page = await html(tool.website);
  let list = page ? candidates(page.text, page.base) : [];
  if (!list.length) {
    // Le site refuse un fetch direct : on repasse par Firecrawl, qui se
    // présente comme un navigateur.
    page = await html(tool.website, { viaFirecrawl: true });
    list = page ? candidates(page.text, page.base) : [];
  }
  list = [...list, ...proxies(tool.website)];

  for (const c of list) {
    try {
      const r = await fetchWithTimeout(c.url, { ms: 20000 });
      if (!r.ok) continue;
      const type = (r.headers.get('content-type') ?? '').toLowerCase();
      if (!/image|octet-stream/.test(type)) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 200) continue;
      const ext = /svg/.test(type) ? '.svg' : /x-icon|vnd\.microsoft/.test(type) ? '.ico'
        : /png/.test(type) ? '.png' : /jpe?g/.test(type) ? '.jpg' : /webp/.test(type) ? '.webp' : '.png';
      const { out } = await normalise(buf, tool.slug, ext);
      if (statSync(out).size < 400) continue;   // une icône vide ne vaut rien
      if (await isBlank(out)) continue;         // un aplat n'est pas un logo
      return { slug: tool.slug, status: 'récupéré', source: c.url, file: out };
    } catch { /* candidat suivant */ }
  }
  // Reprise impossible : le fichier reste sur le disque mais n'a pas de
  // provenance, donc pas de fiche. On le dit, plutôt que de le laisser dormir.
  return { slug: tool.slug, status: orphan ? 'orphelin sans provenance' : 'aucun logo exploitable' };
}

const tools = loadTools().filter((t) => !ONLY.length || ONLY.includes(t.slug));
console.log(`Logos — ${tools.length} outils à examiner`);
const res = await pool(tools, 6, grab);

// La provenance vit dans la fiche : d'où vient l'image, et quand on l'a prise.
let written = 0, dropped = 0;
for (const r of res) {
  const t = tools.find((x) => x.slug === r?.slug);
  if (r?.dropLogo) {
    // Le bloc part avec le fichier. `dropBlock` laisse le reste de la fiche
    // intact, commentaires et ordre des clés compris.
    writeFileSync(t.file, dropBlock(readFileSync(t.file, 'utf8'), 'logo'));
    dropped++;
    continue;
  }
  if (r?.status !== 'récupéré') continue;
  const text = readFileSync(t.file, 'utf8');
  const block = `logo:\n  file: logos/${r.slug}.png\n  source_url: ${r.source}\n  fetched_on: "${today()}"`;
  writeFileSync(t.file, upsertBlock(text, 'logo', block));
  written++;
}

const by = res.reduce((a, r) => ((a[r?.status ?? 'erreur'] = (a[r?.status ?? 'erreur'] ?? 0) + 1), a), {});
console.log(Object.entries(by).map(([k, v]) => `  ${v.toString().padStart(4)}  ${k}`).join('\n'));
console.log(`  ${written} fiche(s) mises à jour${dropped ? ` · ${dropped} bloc(s) logo retiré(s)` : ''}`);
const failed = res.filter((r) => r?.status && r.status !== 'récupéré' && r.status !== 'déjà là');
if (failed.length) console.log('\nSans logo : ' + failed.map((r) => r.slug).join(', '));
