#!/usr/bin/env node
// Découverte de produits absents du catalogue, par recherche web.
//
// La boucle est celle de la méthode : on répète des rondes jusqu'à ce que
// DRY_ROUNDS rondes consécutives ne rapportent plus rien de neuf. Chaque
// candidat passe une vérification automatique — le site répond, et le nom du
// produit y figure — avant d'entrer dans la file. Sans cette vérification
// exécutable, la boucle fabriquerait des produits qui n'existent pas.
//
//   node scripts/enrich/discover.mjs                    # une ronde
//   node scripts/enrich/discover.mjs --rounds 4         # quatre rondes
//   node scripts/enrich/discover.mjs --market FR --category syndic-copro
import {
  ROOT, join, loadTools, loadTaxonomy, ask, pool, fetchWithTimeout, today,
  readFileSync, writeFileSync, existsSync,
} from './lib.mjs';

const MODEL = process.env.ATLAS_MODEL ?? 'anthropic/claude-sonnet-5';
const QUEUE = join(ROOT, 'data', 'candidates.json');
const DRY_ROUNDS = 2;

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const ROUNDS = parseInt(arg('rounds', '1'), 10);
const ONE_MARKET = arg('market', null);
const ONE_CAT = arg('category', null);

const tax = loadTaxonomy();
const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } };

// Les annuaires que le modèle doit aller lire plutôt que de puiser dans sa
// mémoire. Le but est la couverture — surtout côté français, où les produits
// sont peu référencés en anglais.
const SOURCES = {
  US: [
    'G2 and Capterra category pages for real estate software',
    'NAR, NARPM, IREM and BOMA vendor and partner directories',
    'MLS and association technology vendor lists',
    'CREtech, HousingWire and Inman vendor coverage and comparison articles',
    'Y Combinator, Fifth Wall and MetaProp portfolio pages',
  ],
  FR: [
    'annuaires et pages partenaires de la FNAIM, du SNPI, de l\'UNIS et de Plurience',
    'French PropTech, l\'annuaire de la French Tech et les cartographies proptech françaises',
    'blogs et comparatifs français de logiciels immobiliers, syndic, gérance et diagnostic',
    'pages partenaires et intégrations des portails et éditeurs français',
    'annuaires de la promotion immobilière, du BTP et du facility management français',
  ],
};

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'editor', 'website', 'category', 'markets', 'why', 'source_url'],
        properties: {
          name: { type: 'string' },
          editor: { type: 'string' },
          website: { type: 'string' },
          category: { type: 'string', enum: tax.categories.map((c) => c.id) },
          markets: { type: 'array', items: { type: 'string', enum: ['US', 'FR'] } },
          why: { type: 'string', description: 'What it is used for in real estate, one sentence' },
          source_url: { type: 'string', description: 'Where you found it — a directory, article or vendor page' },
        },
      },
    },
  },
};

const SYSTEM = `You extend an open catalogue of real estate software.

Hard scope rules, applied before anything else:
- IN: software products, SaaS platforms, portals, marketplaces, and data providers used by real estate professionals.
- OUT: brokerages, agencies, asset managers, investment funds, consultancies and any firm whose product is a service performed on a client's behalf. A firm that also publishes software may be listed FOR the software only.
- OUT: anything that is not verifiably a live product with its own website.

Never invent a product or a URL. If you are not sure a product exists under that exact name, leave it out. A short honest list beats a long plausible one.`;

function prompt(cat, market, known) {
  const label = tax.categories.find((c) => c.id === cat);
  const m = market === 'FR' ? 'France' : 'the United States';
  return `Find real estate software products in the category "${label.label_en}" (${label.summary_en}) that are used in ${m}, and that are MISSING from the list below.

Already catalogued in this category and market — do not return any of these:
${known.length ? known.map((k) => `- ${k}`).join('\n') : '- (none yet)'}

Search these kinds of sources rather than relying on memory:
${SOURCES[market].map((s) => `- ${s}`).join('\n')}

${market === 'FR'
  ? 'Priorité aux éditeurs français peu référencés en anglais : ce sont eux qui manquent le plus. Cherche en français.'
  : 'Prefer products with real market presence over launches with no customers.'}

For each product return its official website, the single category that fits best, and one sentence on what it is actually used for on the ground. Return at most 12. Return an empty list rather than padding it.`;
}

// ── Vérification automatique ──────────────────────────────────────────────────

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/** Un nom commercial, débarrassé des gloses que le modèle ajoute. */
function cleanName(raw) {
  return raw
    .replace(/\s*\((?:ex-|formerly |anciennement )[^)]*\)/gi, '')
    .replace(/\s*\(module[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function verify(c) {
  if (!/^https?:\/\//.test(c.website)) return { ok: false, why: 'URL mal formée' };
  // Une page de recherche, un article de blog ou une fiche d'annuaire n'est pas
  // le site du produit : c'est là que le modèle l'a trouvé, pas là qu'il vit.
  const url = new URL(c.website);
  if (url.search) return { ok: false, why: 'URL de recherche, pas un site produit' };
  if (/\/(recherche|search|blog|annuaire|directory|article|news|produits?)\//i.test(url.pathname)) {
    return { ok: false, why: 'URL de page d\'annuaire, pas un site produit' };
  }
  const u = new URL(c.website);
  const tries = [...new Set([c.website, `https://${u.hostname}/`, `https://www.${u.hostname.replace(/^www\./, '')}/`])];
  for (const t of tries) {
    try {
      const r = await fetchWithTimeout(t, { ms: 20000 });
      if (!r.ok) continue;
      const text = (await r.text()).slice(0, 400000);
      const n = norm(text);
      // Le nom du produit doit apparaître sur sa propre page d'accueil.
      const name = norm(c.name);
      const short = norm(c.name.split(/[\s·—-]/)[0]);
      if (n.includes(name) || (short.length >= 4 && n.includes(short))) {
        return { ok: true, website: r.url.replace(/\/$/, '') || t };
      }
      return { ok: false, why: 'le nom du produit ne figure pas sur la page' };
    } catch { /* variante suivante */ }
  }
  return { ok: false, why: 'site injoignable' };
}

// ── Boucle ────────────────────────────────────────────────────────────────────

function loadQueue() {
  return existsSync(QUEUE) ? JSON.parse(readFileSync(QUEUE, 'utf8')) : { generated: today(), candidates: [], rejected: [] };
}

async function round(n) {
  const tools = loadTools();
  const queue = loadQueue();
  const knownSlugs = new Set([...tools.map((t) => t.slug), ...queue.candidates.map((c) => c.slug)]);
  const knownHosts = new Set([...tools.map((t) => host(t.website)), ...queue.candidates.map((c) => host(c.website))].filter(Boolean));
  const rejected = new Set(queue.rejected.map((r) => r.slug));

  const pairs = [];
  for (const c of tax.categories) {
    if (ONE_CAT && c.id !== ONE_CAT) continue;
    for (const m of ['US', 'FR']) {
      if (ONE_MARKET && m !== ONE_MARKET) continue;
      pairs.push({ cat: c.id, market: m });
    }
  }

  console.log(`\n── ronde ${n} — ${pairs.length} couples catégorie × marché`);
  const found = await pool(pairs, 4, async ({ cat, market }) => {
    const known = tools
      .filter((t) => (t.category === cat || (t.also_in ?? []).includes(cat)) && t.markets.includes(market))
      .map((t) => `${t.name} (${t.editor})`);
    try {
      const r = await ask({ model: MODEL, system: SYSTEM, prompt: prompt(cat, market, known), schema: SCHEMA, web: true });
      return (r.candidates ?? []).map((c) => ({ ...c, found_in: `${cat}/${market}` }));
    } catch (e) {
      console.log(`  ! ${cat}/${market} — ${e.message?.slice(0, 90)}`);
      return [];
    }
  });

  const flat = found.flat().filter(Boolean);
  const fresh = [];
  for (const c of flat) {
    c.name = cleanName(c.name);
    const slug = slugify(c.name);
    const h = host(c.website);
    if (!slug || knownSlugs.has(slug) || rejected.has(slug) || (h && knownHosts.has(h))) continue;
    knownSlugs.add(slug);
    if (h) knownHosts.add(h);
    fresh.push({ ...c, slug });
  }
  console.log(`  ${flat.length} propositions · ${fresh.length} inédites après déduplication`);
  if (!fresh.length) return 0;

  const checked = await pool(fresh, 8, async (c) => ({ c, v: await verify(c) }));
  const kept = [], dropped = [];
  for (const { c, v } of checked) {
    if (v.ok) kept.push({ ...c, website: v.website, verified_on: today() });
    else dropped.push({ slug: c.slug, name: c.name, website: c.website, why: v.why, round: n });
  }
  console.log(`  ${kept.length} vérifiées · ${dropped.length} écartées`);
  for (const d of dropped.slice(0, 6)) console.log(`     ✗ ${d.name} — ${d.why}`);

  queue.candidates.push(...kept);
  queue.rejected.push(...dropped);
  queue.generated = today();
  writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + '\n');
  return kept.length;
}

let dry = 0;
for (let n = 1; n <= ROUNDS && dry < DRY_ROUNDS; n++) {
  const got = await round(n);
  dry = got === 0 ? dry + 1 : 0;
  if (dry >= DRY_ROUNDS) console.log(`\nTari : ${DRY_ROUNDS} rondes consécutives sans rien de neuf.`);
}
const q = loadQueue();
console.log(`\nFile : ${q.candidates.length} candidat(s) en attente de fiche · ${q.rejected.length} écarté(s) au total`);
