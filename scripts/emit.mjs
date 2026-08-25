#!/usr/bin/env node
// Transforme le catalogue YAML en artefacts consommables :
//   public/api/**.json  — l'API statique, lisible par une IA comme par un script
//   public/llms.txt     — l'index en clair pour un agent qui découvre le site
//   CATALOG.md          — la version GitHub, lisible sans lancer le site
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadTaxonomy, loadTools } from './lib.mjs';

const SITE = process.env.PUBLIC_SITE_URL ?? 'https://flowmetrik.github.io/proptech-atlas';
const API = join(ROOT, 'public', 'api');
rmSync(API, { recursive: true, force: true });
mkdirSync(join(API, 'tools'), { recursive: true });
mkdirSync(join(API, 'categories'), { recursive: true });

const tax = loadTaxonomy();
const tools = loadTools().map(({ file, ...t }) => t);
const label = (kind, id) => tax[kind].find((x) => x.id === id) ?? { id, label_en: id, label_fr: id };
const write = (p, obj) => writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');

const generated = new Date().toISOString().slice(0, 10);
const meta = {
  name: 'PropTech Atlas',
  description: 'Open Product Knowledge Graph of real estate software — United States & France.',
  license: 'CC-BY-4.0 (data) / MIT (code)',
  homepage: SITE,
  repository: 'https://github.com/flowmetrik/proptech-atlas',
  generated,
  counts: {
    tools: tools.length,
    US: tools.filter((t) => t.markets.includes('US')).length,
    FR: tools.filter((t) => t.markets.includes('FR')).length,
    categories: tax.categories.length,
    editors: new Set(tools.map((t) => t.editor)).size,
    verified: tools.filter((t) => t.verification?.status === 'verified').length,
    reviews: tools.reduce((n, t) => n + (t.reviews?.length ?? 0), 0),
    logos: tools.filter((t) => t.logo?.file).length,
    // Les signaux sont la partie machine-vérifiée du catalogue : on publie leur
    // couverture, pour qu'un consommateur sache sur quoi il peut s'appuyer.
    signals: {
      probed: tools.filter((t) => t.signals?.checked_on).length,
      public_pricing: tools.filter((t) => t.signals?.pricing).length,
      api_docs: tools.filter((t) => t.signals?.api_docs).length,
      security_page: tools.filter((t) => t.signals?.security).length,
      privacy_page: tools.filter((t) => t.signals?.privacy).length,
      status_page: tools.filter((t) => t.signals?.status).length,
    },
  },
};

write(join(API, 'index.json'), {
  ...meta,
  endpoints: {
    tools: `${SITE}/api/tools.json`,
    tool: `${SITE}/api/tools/{slug}.json`,
    category: `${SITE}/api/categories/{id}.json`,
    taxonomy: `${SITE}/api/taxonomy.json`,
    graph: `${SITE}/api/graph.json`,
  },
});
write(join(API, 'taxonomy.json'), tax);
write(join(API, 'tools.json'), { ...meta, tools });
for (const t of tools) write(join(API, 'tools', `${t.slug}.json`), t);
for (const c of tax.categories) {
  const inCat = tools.filter((t) => t.category === c.id || (t.also_in ?? []).includes(c.id));
  write(join(API, 'categories', `${c.id}.json`), { ...c, count: inCat.length, tools: inCat });
}

// Le graphe : ce qui fait de ce catalogue autre chose qu'une liste. Les arêtes
// sont les relations qu'une IA doit pouvoir suivre pour recommander un outil.
const nodes = [
  ...tools.map((t) => ({ id: `tool:${t.slug}`, type: 'tool', label: t.name })),
  ...tax.categories.map((c) => ({ id: `category:${c.id}`, type: 'category', label: c.label_en })),
  ...tax.personas.map((p) => ({ id: `persona:${p.id}`, type: 'persona', label: p.label_en })),
  ...tax.segments.map((s) => ({ id: `segment:${s.id}`, type: 'segment', label: s.label_en })),
  ...tax.markets.map((m) => ({ id: `market:${m.id}`, type: 'market', label: m.label_en })),
  ...[...new Set(tools.map((t) => t.editor))].map((e) => ({ id: `editor:${e}`, type: 'editor', label: e })),
];
const edges = [];
for (const t of tools) {
  const from = `tool:${t.slug}`;
  edges.push({ from, rel: 'published_by', to: `editor:${t.editor}` });
  edges.push({ from, rel: 'belongs_to', to: `category:${t.category}` });
  for (const c of t.also_in ?? []) edges.push({ from, rel: 'also_serves', to: `category:${c}` });
  for (const p of t.personas) edges.push({ from, rel: 'serves_persona', to: `persona:${p}` });
  for (const s of t.segments) edges.push({ from, rel: 'covers_segment', to: `segment:${s}` });
  for (const m of t.markets) edges.push({ from, rel: 'available_in', to: `market:${m}` });
  for (const a of t.alternatives ?? []) edges.push({ from, rel: 'alternative_to', to: `tool:${a}` });
}
write(join(API, 'graph.json'), { ...meta, nodes, edges });

// llms.txt — la convention qu'un agent lit en premier.
const llms = [
  '# PropTech Atlas',
  '',
  `> ${meta.description} ${tools.length} produits documentés, ${meta.counts.US} disponibles aux États-Unis, ${meta.counts.FR} en France.`,
  '',
  'Les données sont statiques, versionnées et publiques. Aucun compte, aucune clé.',
  'Chaque fiche décrit un produit ET son usage métier en immobilier, avec ses sources.',
  '',
  '## API',
  '',
  `- [Index et compteurs](${SITE}/api/index.json)`,
  `- [Catalogue complet](${SITE}/api/tools.json)`,
  `- [Une fiche](${SITE}/api/tools/{slug}.json)`,
  `- [Une catégorie](${SITE}/api/categories/{id}.json)`,
  `- [Taxonomie](${SITE}/api/taxonomy.json)`,
  `- [Graphe de connaissance](${SITE}/api/graph.json)`,
  '',
  '## Catégories',
  '',
  ...tax.categories.map((c) => {
    const n = tools.filter((t) => t.category === c.id).length;
    return `- [${c.label_en}](${SITE}/categories/${c.id}) — ${c.summary_en} (${n})`;
  }),
  '',
  '## Deux niveaux de fiabilité, à ne pas confondre',
  '',
  '**La prose est rédigée, non recoupée.** `description`, `real_estate_use`, `features` et',
  '`use_cases` sont écrits à partir du contenu public de l\'éditeur. Chaque fiche porte',
  '`verification.status` ; tant qu\'il vaut `unverified`, ne pas présenter son contenu comme un',
  `fait établi. Actuellement vérifiées : ${meta.counts.verified} / ${tools.length}.`,
  '',
  '**Les signaux sont machine-vérifiés.** Le bloc `signals` de chaque fiche a été établi en',
  'allant lire le site de l\'éditeur à la date `checked_on`, et chaque signal porte l\'URL qui',
  'l\'établit. Un signal absent signifie « pas trouvé à cette date », jamais « n\'existe pas ».',
  `Relevés : ${meta.counts.signals.probed} outils · tarifs publics ${meta.counts.signals.public_pricing}` +
  ` · doc d'API ${meta.counts.signals.api_docs} · page sécurité ${meta.counts.signals.security_page}` +
  ` · page confidentialité ${meta.counts.signals.privacy_page} · page d'état ${meta.counts.signals.status_page}.`,
  '',
  `**Les avis ne sont jamais inventés.** ${meta.counts.reviews} agrégat(s) externe(s) daté(s) au`,
  'catalogue. Une note sans URL de source et sans date de relevé est refusée par le validateur.',
  '',
  `**Les logos** viennent du site de l\'éditeur (${meta.counts.logos} / ${tools.length}), avec leur`,
  'URL d\'origine et la date du relevé. Marques et logos appartiennent à leurs détenteurs.',
  '',
].join('\n');
writeFileSync(join(ROOT, 'public', 'llms.txt'), llms);

// CATALOG.md — la version GitHub : lisible dans le dépôt, sans build.
const md = [
  '# Catalogue',
  '',
  `<!-- Généré par \`npm run data:emit\`. Ne pas éditer à la main : éditer \`data/tools/*.yaml\`. -->`,
  '',
  `${tools.length} produits · ${meta.counts.US} 🇺🇸 · ${meta.counts.FR} 🇫🇷 · mis à jour le ${generated}`,
  '',
  `Version navigable : ${SITE}/explore`,
  '',
];
for (const c of tax.categories) {
  const inCat = tools.filter((t) => t.category === c.id).sort((a, b) => a.name.localeCompare(b.name));
  if (!inCat.length) continue;
  md.push(`## ${c.label_fr} · ${c.label_en}`, '', `_${c.summary_fr}_`, '');
  md.push('| Produit | Éditeur | Marchés | Usage en immobilier |', '|---|---|---|---|');
  for (const t of inCat) {
    const flags = t.markets.map((m) => label('markets', m).flag).join(' ');
    const use = (t.real_estate_use ?? '').replace(/\s+/g, ' ').trim();
    const short = use.length > 190 ? use.slice(0, 187).replace(/[,;:\s]+\S*$/, '') + '…' : use;
    md.push(`| [${t.name}](data/tools/${t.slug}.yaml) | ${t.editor} | ${flags} | ${short} |`);
  }
  md.push('');
}
writeFileSync(join(ROOT, 'CATALOG.md'), md.join('\n'));

console.log(
  `✓ API émise — ${tools.length} fiches, ${nodes.length} nœuds, ${edges.length} arêtes, ` +
  `llms.txt et CATALOG.md régénérés`
);
