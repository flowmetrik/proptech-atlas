#!/usr/bin/env node
// Balayage d'une source nommée.
//
// La différence avec `discover.mjs` : celui-ci part d'une CATÉGORIE et demande
// au modèle ce qu'il connaît ; celui-là part d'une SOURCE — un annuaire
// d'intégrations, une liste d'exposants, un portefeuille de fonds — et demande
// ce qui s'y trouve. La couverture devient auditable : on sait ce qui a été
// regardé, quand, et ce que ça a rapporté.
//
// Les sources sont rotées par ancienneté de balayage, ce qui évite de repasser
// éternellement sur les trois mêmes annuaires.
//
//   node scripts/enrich/sweep.mjs                    # les N plus anciennes
//   node scripts/enrich/sweep.mjs --n 6
//   node scripts/enrich/sweep.mjs --source rent-paris
//   node scripts/enrich/sweep.mjs --market FR --kind marketplace
import yaml from 'js-yaml';
import {
  MODELS,
  ROOT, join, OPTS, loadTools, loadTaxonomy, ask, pool, today,
  readFileSync, writeFileSync, existsSync,
  slugify, hostOf, cleanName, verifyCandidate, loadQueue, saveQueue,
} from './lib.mjs';

const MODEL = MODELS.default;
const STATE = join(ROOT, 'data', 'sweeps.json');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };

const reg = yaml.load(readFileSync(join(ROOT, 'data', 'sources.yaml'), 'utf8'), OPTS);
const tax = loadTaxonomy();
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};

const N = parseInt(arg('n', String(reg.meta.per_run ?? 4)), 10);
const ONE = arg('source', null);
const MARKET = arg('market', null);
const KIND = arg('kind', null);

const daysSince = (d) => (d ? Math.floor((Date.now() - Date.parse(d)) / 86400000) : 9999);

// Une source vue par un agent qui cherche lui-même (mark-swept.mjs) compte
// autant qu'une source vue par la boucle : les deux voies regardent le même
// terrain, et ignorer l'une fait resservir une source qui vient d'être
// balayée à la main. `lastSwept` prend la plus récente des deux dates.
const lastSwept = (id) => {
  const st = state[id];
  if (!st) return null;
  const dates = [st.last_swept, st.last_swept_manual].filter(Boolean);
  return dates.length ? dates.sort().at(-1) : null;
};

let pool_ = reg.sources
  .filter((s) => (!MARKET || s.market === MARKET) && (!KIND || s.kind === KIND))
  .filter((s) => (ONE ? s.id === ONE : daysSince(lastSwept(s.id)) >= (reg.meta.cooldown_days ?? 21)));

// Les plus anciennement balayées d'abord ; à égalité, celles qui rapportent le plus.
pool_.sort((a, b) =>
  daysSince(lastSwept(b.id)) - daysSince(lastSwept(a.id)) ||
  (state[b.id]?.kept ?? 0) - (state[a.id]?.kept ?? 0));

const picked = ONE ? pool_ : pool_.slice(0, N);
if (!picked.length) {
  console.log(`Aucune source à balayer — toutes vues il y a moins de ${reg.meta.cooldown_days} jours.`);
  process.exit(0);
}

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'editor', 'website', 'category', 'markets', 'why'],
        properties: {
          name: { type: 'string' },
          editor: { type: 'string' },
          website: { type: 'string', description: "Racine du site du PRODUIT, pas la page d'annuaire" },
          category: { type: 'string', enum: tax.categories.map((c) => c.id) },
          markets: { type: 'array', items: { type: 'string', enum: ['US', 'FR'] } },
          why: { type: 'string', description: 'What it is used for in real estate, one sentence' },
        },
      },
    },
  },
};

const SYSTEM = `You extend an open catalogue of real estate software by sweeping one named source at a time.

Hard scope rules, applied before anything else:
- IN: software products, SaaS platforms, portals, marketplaces and data providers used by real estate professionals.
- OUT: brokerages, agencies, asset managers, investment funds, consultancies — any firm whose product is a service performed on a client's behalf. A firm that also publishes software may be listed FOR the software only.
- OUT: anything you cannot tie to a live product website.

Give the product's OWN root website, never the directory page you found it on.
Never invent a product or a URL. A short honest list beats a long plausible one — the pipeline verifies every entry and drops what it cannot confirm, so padding only wastes a check.`;

function prompt(src, known) {
  const kind = reg.kinds[src.kind]?.replace(/\s+/g, ' ').trim();
  return `Sweep this specific source and list the real estate software products it references.

SOURCE: ${src.label}
URL: ${src.url}
Market of interest: ${src.market === 'FR' ? 'France' : 'the United States'}
What this kind of source is: ${kind}
What we expect to find here that other sources miss: ${src.finds}

Go and look at this source — its directory pages, its exhibitor or partner lists, its recent articles, its portfolio pages — and extract the software products it names.

Do NOT return any of these, they are already catalogued:
${known.join(', ')}

${src.market === 'FR'
  ? 'Cherche en français. Les éditeurs français peu référencés en anglais sont exactement ce qui manque au catalogue.'
  : 'Prefer products with real market presence over launches with no customers.'}

Return at most 15. Return an empty list rather than padding it.`;
}

const tools = loadTools();
const queue = loadQueue(ROOT);
const knownNames = tools.map((t) => t.name);
const knownSlugs = new Set([...tools.map((t) => t.slug), ...queue.candidates.map((c) => c.slug)]);
const knownHosts = new Set([...tools.map((t) => hostOf(t.website)), ...queue.candidates.map((c) => hostOf(c.website))].filter(Boolean));
const rejected = new Set(queue.rejected.map((r) => r.slug));

console.log(`Balayage — ${picked.length} source(s) : ${picked.map((s) => s.id).join(', ')}\n`);

const results = await pool(picked, 3, async (src) => {
  // On ne peut pas envoyer 158 noms à chaque appel : on donne ceux du marché
  // de la source, qui sont les seuls que le modèle risque de reproposer.
  const known = tools.filter((t) => t.markets.includes(src.market)).map((t) => t.name);
  try {
    const r = await ask({
      model: MODEL, system: SYSTEM, prompt: prompt(src, known), schema: SCHEMA, web: true, maxTokens: 6000,
    });
    return { src, found: r.candidates ?? [] };
  } catch (e) {
    console.log(`  ! ${src.id} — ${e.message?.slice(0, 100)}`);
    return { src, found: [], error: e.message };
  }
});

let totalKept = 0;
for (const { src, found, error } of results) {
  const fresh = [];
  for (const c of found) {
    c.name = cleanName(c.name);
    const slug = slugify(c.name);
    const h = hostOf(c.website);
    if (!slug || knownSlugs.has(slug) || rejected.has(slug) || (h && knownHosts.has(h))) continue;
    knownSlugs.add(slug);
    if (h) knownHosts.add(h);
    fresh.push({ ...c, slug, found_in: `source:${src.id}`, source_url: src.url });
  }

  const checked = await pool(fresh, 8, async (c) => ({ c, v: await verifyCandidate(c) }));
  const kept = [], dropped = [];
  for (const { c, v } of checked) {
    if (v.ok) kept.push({ ...c, website: v.website, verified_on: today() });
    else dropped.push({ slug: c.slug, name: c.name, website: c.website, why: v.why, source: src.id });
  }

  queue.candidates.push(...kept);
  queue.rejected.push(...dropped);
  totalKept += kept.length;

  const st = state[src.id] ?? { runs: 0, found: 0, kept: 0 };
  state[src.id] = {
    last_swept: today(),
    runs: st.runs + 1,
    found: st.found + found.length,
    kept: st.kept + kept.length,
    last_error: error ?? null,
  };

  console.log(`  ${src.id.padEnd(26)} ${String(found.length).padStart(3)} proposés · ${String(fresh.length).padStart(3)} inédits · ${String(kept.length).padStart(3)} vérifiés`);
  for (const k of kept) console.log(`      + ${k.name} — ${k.website}`);
  for (const d of dropped.slice(0, 3)) console.log(`      ✗ ${d.name} — ${d.why}`);
}

saveQueue(ROOT, queue);
writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n');

// Le rendement mesuré : c'est lui qui dit où revenir, et où ne plus perdre de temps.
const ranked = Object.entries(state)
  .filter(([, v]) => v.runs)
  .sort((a, b) => b[1].kept / b[1].runs - a[1].kept / a[1].runs)
  .slice(0, 5);
console.log(`\n${totalKept} candidat(s) ajouté(s) · file : ${queue.candidates.length}`);
if (ranked.length) {
  console.log('Meilleur rendement à ce jour :');
  for (const [id, v] of ranked) console.log(`  ${(v.kept / v.runs).toFixed(1).padStart(4)} par passe  ${id}`);
}
