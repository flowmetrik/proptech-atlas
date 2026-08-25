#!/usr/bin/env node
// Le seul gardien du catalogue. Pas de base, pas d'admin : un fichier qui passe
// ici est publiable, un fichier qui échoue bloque le build et la pull request.
import { loadTaxonomy, loadTools } from './lib.mjs';

const tax = loadTaxonomy();
const ids = (k) => new Set(tax[k].map((x) => x.id));
const CATEGORIES = ids('categories');
const PERSONAS = ids('personas');
const SEGMENTS = ids('segments');
const SIZES = ids('company_sizes');
const MARKETS = ids('markets');
const PRICING = ids('pricing_models');
const VERIF = new Set(['unverified', 'verified', 'stale', 'disputed']);

const tools = loadTools();
const seen = new Set();
const errors = [];

for (const t of tools) {
  const at = (msg) => errors.push(`${t.file}: ${msg}`);
  const req = (k) => {
    if (t[k] === undefined || t[k] === null || t[k] === '') at(`champ obligatoire manquant: ${k}`);
  };
  ['slug', 'name', 'editor', 'website', 'hq_country', 'markets', 'category',
   'positioning', 'description', 'real_estate_use', 'features', 'use_cases',
   'personas', 'segments', 'company_sizes', 'pricing', 'sources', 'verification',
   'updated'].forEach(req);

  if (t.slug && t.file !== `${t.slug}.yaml`) at(`le nom du fichier doit être ${t.slug}.yaml`);
  if (t.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.slug)) at('slug non kebab-case');
  if (t.slug && seen.has(t.slug)) at(`slug dupliqué: ${t.slug}`);
  seen.add(t.slug);

  if (t.website && !/^https:\/\//.test(t.website)) at('website doit être en https');
  if (t.hq_country && !/^[A-Z]{2}$/.test(t.hq_country)) at('hq_country doit être ISO alpha-2');
  if (t.positioning && t.positioning.length > 200) at(`positioning trop long (${t.positioning.length} > 200)`);
  if (t.updated && !/^\d{4}-\d{2}-\d{2}$/.test(t.updated)) at('updated doit être YYYY-MM-DD');

  const inSet = (key, set, label) => {
    const v = t[key];
    if (v === undefined) return;
    for (const x of Array.isArray(v) ? v : [v]) {
      if (!set.has(x)) at(`${label} inconnu dans la taxonomie: ${x}`);
    }
  };
  inSet('category', CATEGORIES, 'category');
  inSet('also_in', CATEGORIES, 'also_in');
  inSet('markets', MARKETS, 'market');
  inSet('personas', PERSONAS, 'persona');
  inSet('segments', SEGMENTS, 'segment');
  inSet('company_sizes', SIZES, 'company_size');

  const minLen = (k, n) => {
    if (Array.isArray(t[k]) && t[k].length < n) at(`${k}: au moins ${n} entrée(s) attendue(s)`);
    else if (t[k] !== undefined && !Array.isArray(t[k])) at(`${k} doit être une liste`);
  };
  minLen('features', 3);
  minLen('use_cases', 1);
  minLen('markets', 1);
  minLen('personas', 1);
  minLen('segments', 1);
  minLen('company_sizes', 1);
  minLen('sources', 1);

  for (const uc of t.use_cases ?? []) {
    if (!uc || typeof uc !== 'object') { at('use_case mal formé'); continue; }
    if (!PERSONAS.has(uc.persona)) at(`use_case.persona inconnu: ${uc.persona}`);
    if (!uc.job) at('use_case.job manquant');
  }

  if (t.pricing) {
    if (!PRICING.has(t.pricing.model)) at(`pricing.model inconnu: ${t.pricing.model}`);
    if (typeof t.pricing.public_pricing !== 'boolean') at('pricing.public_pricing doit être un booléen');
  }

  if (t.verification && !VERIF.has(t.verification.status)) {
    at(`verification.status inconnu: ${t.verification.status}`);
  }

  // Les avis sont des agrégats externes datés, jamais du texte inventé.
  for (const r of t.reviews ?? []) {
    for (const k of ['source', 'url', 'rating', 'scale', 'count', 'sampled_on']) {
      if (r[k] === undefined) at(`review.${k} manquant — un avis sans source datée n'est pas publiable`);
    }
    if (r.rating !== undefined && r.scale !== undefined && r.rating > r.scale) {
      at('review.rating supérieur à review.scale');
    }
  }

  for (const s of t.sources ?? []) {
    if (!s || !s.url) at('source.url manquant');
  }
}

// Les alternatives doivent pointer sur des fiches qui existent.
for (const t of tools) {
  for (const a of t.alternatives ?? []) {
    if (!seen.has(a)) errors.push(`${t.file}: alternative inconnue au catalogue: ${a}`);
  }
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} erreur(s) de validation\n`);
  for (const e of errors) console.error('  ' + e);
  console.error('');
  process.exit(1);
}

const byMarket = (m) => tools.filter((t) => t.markets.includes(m)).length;
console.log(
  `✓ ${tools.length} fiches valides — ${byMarket('US')} US, ${byMarket('FR')} FR, ` +
  `${new Set(tools.map((t) => t.category)).size}/${CATEGORIES.size} catégories peuplées`
);
