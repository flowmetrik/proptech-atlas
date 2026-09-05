#!/usr/bin/env node
// Transforme un candidat vérifié en fiche complète.
//
// La rédaction est ANCRÉE : on récupère d'abord le contenu réel du site de
// l'éditeur, et le modèle écrit à partir de lui. Sans cet ancrage il écrirait
// de mémoire, c'est-à-dire à peu près — et « à peu près » est exactement ce que
// ce catalogue existe pour remplacer.
//
//   node scripts/enrich/fiche.mjs                # toute la file
//   node scripts/enrich/fiche.mjs --limit 10
//   node scripts/enrich/fiche.mjs --dry
import { execFileSync } from 'node:child_process';
import {
  MODELS,
  ROOT, TOOLS, join, loadTools, loadTaxonomy, ask, scrape, siteText, pool, today,
  readFileSync, writeFileSync, existsSync,
} from './lib.mjs';

const MODEL = MODELS.smart;
const QUEUE = join(ROOT, 'data', 'candidates.json');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const LIMIT = parseInt(arg('limit', '999'), 10);
const DRY = process.argv.includes('--dry');
const FROM = arg('from', null);

const tax = loadTaxonomy();
const ids = (k) => tax[k].map((x) => x.id);

// ── Rendu YAML maison ─────────────────────────────────────────────────────────
// On n'utilise pas `yaml.dump` : il réordonne, requote et détruit le style des
// 155 fiches écrites à la main. Une fiche générée doit être indiscernable.

const needsQuote = (s) => /^[\s>|*&!%@`]|[:#]\s|\s$|^$|^[-?]\s|,|\[|\]|\{|\}/.test(s);
const q = (s) => (needsQuote(String(s)) ? `"${String(s).replace(/"/g, '\\"')}"` : String(s));
const inline = (a) => `[${(a ?? []).map(q).join(', ')}]`;

function block(text, indent = '  ', width = 86) {
  const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let cur = indent;
  for (const w of words) {
    if (cur.length + w.length + 1 > width && cur.trim()) { lines.push(cur); cur = indent + w; }
    else cur = cur.trim() ? `${cur} ${w}` : indent + w;
  }
  if (cur.trim()) lines.push(cur);
  return lines.join('\n');
}

function toYaml(f) {
  const L = [];
  L.push(`slug: ${f.slug}`);
  L.push(`name: ${q(f.name)}`);
  L.push(`editor: ${q(f.editor)}`);
  L.push(`website: ${f.website}`);
  L.push(`hq_country: ${f.hq_country}`);
  L.push(`markets: ${inline(f.markets)}`);
  L.push(`category: ${f.category}`);
  if (f.also_in?.length) L.push(`also_in: ${inline(f.also_in)}`);
  if (f.founded) L.push(`founded: ${f.founded}`);
  L.push(`positioning: ${q(f.positioning)}`);
  L.push('description: >');
  L.push(block(f.description));
  L.push('real_estate_use: >');
  L.push(block(f.real_estate_use));
  L.push('features:');
  for (const x of f.features) L.push(`  - ${q(x)}`);
  L.push('use_cases:');
  for (const u of f.use_cases) { L.push(`  - persona: ${u.persona}`); L.push(`    job: ${q(u.job)}`); }
  L.push(`personas: ${inline(f.personas)}`);
  L.push(`segments: ${inline(f.segments)}`);
  L.push(`company_sizes: ${inline(f.company_sizes)}`);
  L.push('pricing:');
  L.push(`  model: ${f.pricing.model}`);
  L.push(`  public_pricing: ${f.pricing.public_pricing}`);
  if (f.pricing.from !== undefined && f.pricing.from !== null) L.push(`  from: ${f.pricing.from}`);
  if (f.pricing.currency) L.push(`  currency: ${f.pricing.currency}`);
  if (f.pricing.unit) L.push(`  unit: ${q(f.pricing.unit)}`);
  if (f.pricing.url) L.push(`  url: ${f.pricing.url}`);
  if (f.integrations?.length) L.push(`integrations: ${inline(f.integrations)}`);
  if (f.ai?.capabilities?.length) { L.push('ai:'); L.push(`  capabilities: ${inline(f.ai.capabilities)}`); }
  if (f.product) {
    L.push('product:');
    L.push(`  api: ${!!f.product.api}`);
    L.push(`  open_source: ${!!f.product.open_source}`);
    L.push(`  mobile: ${inline(f.product.mobile)}`);
    L.push(`  languages: ${inline(f.product.languages)}`);
  }
  if (f.alternatives?.length) L.push(`alternatives: ${inline(f.alternatives)}`);
  L.push('reviews: []');
  L.push('sources:');
  for (const s of f.sources) L.push(`  - { url: ${s.url}, note: ${q(s.note)} }`);
  L.push('verification: { status: unverified, checked_on: null, checked_by: null }');
  L.push(`updated: "${today()}"`);
  return L.join('\n') + '\n';
}

// ── Schéma de sortie du modèle ────────────────────────────────────────────────

const strArr = (min = 0) => ({ type: 'array', items: { type: 'string' }, minItems: min });
const enumArr = (vals, min = 1) => ({ type: 'array', minItems: min, items: { type: 'string', enum: vals } });

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'editor', 'hq_country', 'markets', 'category', 'also_in', 'founded',
    'positioning', 'description', 'real_estate_use', 'features', 'use_cases',
    'personas', 'segments', 'company_sizes', 'pricing', 'integrations', 'ai', 'product'],
  properties: {
    name: { type: 'string' },
    editor: { type: 'string' },
    hq_country: { type: 'string', description: 'ISO 3166-1 alpha-2, uppercase' },
    markets: enumArr(['US', 'FR']),
    category: { type: 'string', enum: ids('categories') },
    also_in: { type: 'array', items: { type: 'string', enum: ids('categories') } },
    founded: { type: ['integer', 'null'], description: 'Only if stated on the site; null otherwise' },
    positioning: { type: 'string', description: 'One sentence, max 195 characters' },
    description: { type: 'string' },
    real_estate_use: { type: 'string' },
    features: { ...strArr(3), maxItems: 6 },
    use_cases: {
      type: 'array', minItems: 2, maxItems: 2,
      items: {
        type: 'object', additionalProperties: false, required: ['persona', 'job'],
        properties: { persona: { type: 'string', enum: ids('personas') }, job: { type: 'string' } },
      },
    },
    personas: enumArr(ids('personas')),
    segments: enumArr(ids('segments')),
    company_sizes: enumArr(ids('company_sizes')),
    pricing: {
      type: 'object', additionalProperties: false, required: ['model', 'public_pricing', 'url'],
      properties: {
        model: { type: 'string', enum: ids('pricing_models') },
        public_pricing: { type: 'boolean' },
        url: { type: ['string', 'null'] },
      },
    },
    integrations: strArr(),
    ai: {
      type: 'object', additionalProperties: false, required: ['capabilities'],
      properties: { capabilities: strArr() },
    },
    product: {
      type: 'object', additionalProperties: false, required: ['api', 'open_source', 'mobile', 'languages'],
      properties: {
        api: { type: 'boolean' }, open_source: { type: 'boolean' },
        mobile: { type: 'array', items: { type: 'string', enum: ['ios', 'android'] } },
        languages: strArr(),
      },
    },
  },
};

const SYSTEM = `You write entries for an open catalogue of real estate software. You are given the actual content of the vendor's website; write from THAT, not from memory.

House rules, in order of importance:
- \`real_estate_use\` is the field the catalogue exists for. Describe the concrete working situation: who reaches for this, at what moment, to solve what. Two to four sentences. Never a feature list, never marketing.
- \`description\` says what the product IS, factually. \`positioning\` carries the claim it makes about itself. Keep them apart.
- Features are named capabilities, never adjectives. "Per-building accounting with tantième allocation", not "powerful and flexible".
- Do not copy sentences from the site. Paraphrase.
- If the site does not state something — a founding year, a price, an integration — leave it out or set it null. A missing field is a known gap; an invented one is damage.
- Write in English, plain and specific. No superlatives, no "leading", no "innovative", no em dashes as decoration.
- If the content shows this is a brokerage, an agency, an asset manager or a consultancy rather than a software product, set positioning to exactly "OUT_OF_SCOPE".`;

// ── Fiches rédigées ailleurs ──────────────────────────────────────────────────
//
// `--from fiches.json` prend un tableau d'objets au même schéma que celui que
// produit le modèle, et les passe par le même rendu et la même validation.
// C'est la porte d'entrée d'un agent qui a cherché lui-même.

if (FROM) {
  const incoming = JSON.parse(readFileSync(FROM, 'utf8'));
  const list = Array.isArray(incoming) ? incoming : [incoming];
  const done = [];
  for (const f of list) {
    if (!f.slug || !f.website) { console.log(`  ✗ fiche sans slug ni website, ignorée`); continue; }
    const fiche = {
      ...f,
      features: (f.features ?? []).slice(0, 6),
      use_cases: (f.use_cases ?? []).slice(0, 3),
      founded: f.founded || undefined,
      hq_country: String(f.hq_country || '').toUpperCase().slice(0, 2),
      pricing: { ...f.pricing, url: f.pricing?.url || undefined },
      sources: f.sources?.length ? f.sources : [{ url: f.website, note: 'site éditeur' }],
    };
    if (fiche.positioning?.length > 195) {
      fiche.positioning = fiche.positioning.slice(0, 192).replace(/\s+\S*$/, '') + '…';
    }
    writeFileSync(join(TOOLS, `${f.slug}.yaml`), toYaml(fiche));
    done.push(f.slug);
  }
  try {
    execFileSync('node', [join(ROOT, 'scripts', 'validate.mjs')], { cwd: ROOT, stdio: 'inherit' });
    console.log(`✓ ${done.length} fiche(s) écrites : ${done.join(', ')}`);
  } catch {
    console.error('\n✗ Le validateur refuse. Les fiches restent sur le disque : corriger, puis relancer.');
    process.exit(1);
  }
  process.exit(0);
}

// ── Traitement ────────────────────────────────────────────────────────────────

const queue = existsSync(QUEUE) ? JSON.parse(readFileSync(QUEUE, 'utf8')) : { candidates: [], rejected: [] };
const existing = new Set(loadTools().map((t) => t.slug));
const pending = queue.candidates.filter((c) => !existing.has(c.slug)).slice(0, LIMIT);
console.log(`Fiches — ${pending.length} candidat(s) à rédiger`);

const written = [], failed = [];

await pool(pending, 3, async (c) => {
  // Trois niveaux d'ancrage, du plus contrôlé au moins contrôlé. Celui qui a
  // servi est enregistré dans la fiche : un lecteur doit pouvoir savoir si la
  // description vient du site lui-même ou d'une recherche.
  const md = (await siteText(c.website)) || (await scrape(c.website)) || '';
  const grounded = md.length >= 400;
  if (!grounded) console.log(`  ~ ${c.slug} — site illisible, ancrage par recherche web`);

  const catLabel = tax.categories.find((x) => x.id === c.category);
  const head = `Product: ${c.name}
Website: ${c.website}
Markets it serves: ${c.markets.join(', ')}
Suggested category: ${c.category} (${catLabel?.label_en})
Why it was picked up: ${c.why}`;

  const f = await ask({
    model: MODEL, system: SYSTEM, schema: SCHEMA, maxTokens: 4000, web: !grounded,
    prompt: grounded
      ? `${head}

--- CONTENT OF ${c.website} ---
${md.slice(0, 22000)}
--- END ---

Write the catalogue entry. Choose the single best category even if it differs from the suggestion.`
      : `${head}

Its website could not be read directly. Search the web for this exact product and write the entry from what you find on the vendor's own pages and on reliable coverage of it. If you cannot confirm the product exists as described, set positioning to exactly "OUT_OF_SCOPE".

Write the catalogue entry. Choose the single best category even if it differs from the suggestion.`,
  });

  if (f.positioning === 'OUT_OF_SCOPE') {
    failed.push({ ...c, why: 'hors périmètre : société de service, pas un produit logiciel' });
    return;
  }

  // Les bornes du schéma ne sont pas toujours honorées par le routeur : on
  // écrête ici pour tenir le style de la maison — quelques capacités nommées,
  // pas un inventaire.
  const fiche = {
    ...f,
    features: f.features.slice(0, 6),
    use_cases: f.use_cases.slice(0, 3),
    slug: c.slug,
    website: c.website,
    founded: f.founded || undefined,
    hq_country: String(f.hq_country || '').toUpperCase().slice(0, 2),
    pricing: { ...f.pricing, url: f.pricing.url || undefined },
    sources: [
      { url: c.website, note: grounded ? 'site éditeur' : 'site éditeur, non lisible automatiquement' },
      ...(c.source_url && c.source_url !== c.website ? [{ url: c.source_url, note: 'source de découverte' }] : []),
    ],
  };
  if (fiche.positioning.length > 195) fiche.positioning = fiche.positioning.slice(0, 192).replace(/\s+\S*$/, '') + '…';

  const path = join(TOOLS, `${c.slug}.yaml`);
  if (DRY) { console.log(`\n--- ${c.slug} ---\n${toYaml(fiche)}`); return; }
  writeFileSync(path, toYaml(fiche));
  written.push(c.slug);
});

if (DRY) process.exit(0);

// Vérification exécutable : une fiche qui ne passe pas le validateur est retirée
// plutôt que laissée à pourrir dans le dépôt.
let bad = [];
try {
  execFileSync('node', [join(ROOT, 'scripts', 'validate.mjs')], { cwd: ROOT, stdio: 'pipe' });
} catch (e) {
  const out = (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '');
  bad = [...new Set([...out.matchAll(/^\s*([a-z0-9-]+)\.yaml:/gm)].map((m) => m[1]))]
    .filter((s) => written.includes(s));
  for (const s of bad) {
    const { unlinkSync } = await import('node:fs');
    unlinkSync(join(TOOLS, `${s}.yaml`));
    failed.push({ slug: s, why: 'fiche générée invalide, retirée' });
  }
  console.log(`  ${bad.length} fiche(s) invalides retirées`);
}

const ok = written.filter((s) => !bad.includes(s));
const done = new Set(ok);
queue.candidates = queue.candidates.filter((c) => !done.has(c.slug) && !failed.some((f) => f.slug === c.slug));
queue.rejected.push(...failed.map((f) => ({ slug: f.slug, name: f.name, website: f.website, why: f.why })));
writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + '\n');

console.log(`  ${ok.length} fiche(s) écrites : ${ok.join(', ') || '—'}`);
if (failed.length) console.log(`  ${failed.length} écartée(s) : ${failed.map((f) => `${f.slug} (${f.why})`).join(', ')}`);
console.log(`  file restante : ${queue.candidates.length}`);
