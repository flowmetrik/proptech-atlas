#!/usr/bin/env node
// Signaux vérifiés — la contrepartie factuelle de la prose.
//
// Le reste d'une fiche est rédigé : utile, mais non recoupé, et marqué comme
// tel. Ce script écrit la seule partie qu'une machine peut établir seule, en
// allant regarder le site de l'éditeur : est-ce que les tarifs sont publiés ?
// une documentation d'API existe-t-elle ? une page sécurité, une politique de
// confidentialité, une page d'état de service ? dans quelles langues le produit
// se présente-t-il ?
//
// Chaque signal porte l'URL qui l'établit et la date du relevé. Un signal
// absent veut dire « pas trouvé à cette date », jamais « n'existe pas ».
//
//   node scripts/enrich/signals.mjs                # ceux qui n'en ont pas
//   node scripts/enrich/signals.mjs --all
//   node scripts/enrich/signals.mjs --only deepki,appfolio
import {
  loadTools, pool, fetchWithTimeout, today, readFileSync, writeFileSync, upsertBlock,
} from './lib.mjs';

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const ONLY = (args.includes('--only') ? args[args.indexOf('--only') + 1] : '').split(',').filter(Boolean);

const PROBES = [
  {
    key: 'pricing',
    paths: ['/pricing', '/tarifs', '/prix', '/plans', '/tarification', '/pricing/'],
    // Une page « tarifs » qui n'affiche aucun montant est une page « contactez-nous ».
    test: (t) => /(?:[$€£]\s?\d|\d[\d\s.,]*\s?(?:€|\$|EUR|USD))/.test(t)
      && /(per month|\/mo\b|monthly|par mois|\/mois|per user|par utilisateur|per unit|par lot)/i.test(t),
  },
  {
    key: 'api_docs',
    paths: ['/api', '/developers', '/developer', '/api-docs', '/docs/api', '/developpeurs', '/api/docs'],
    test: (t) => /\bAPI\b/.test(t) && /(endpoint|REST|GraphQL|webhook|api key|clé d'api|token|swagger|openapi)/i.test(t),
  },
  {
    key: 'security',
    paths: ['/security', '/securite', '/sécurité', '/trust', '/trust-center', '/security/'],
    test: (t) => /(SOC\s?2|ISO\s?27001|penetration test|chiffrement|encryption|HDS|ANSSI|SecNumCloud)/i.test(t),
  },
  {
    key: 'privacy',
    paths: ['/privacy', '/privacy-policy', '/rgpd', '/gdpr', '/confidentialite',
            '/politique-de-confidentialite', '/legal/privacy', '/mentions-legales'],
    test: (t) => /(GDPR|RGPD|données personnelles|personal data|privacy policy|politique de confidentialité)/i.test(t),
  },
  {
    key: 'status',
    paths: ['/status', '/statut'],
    subdomains: ['status', 'statut'],
    test: (t) => /(operational|opérationnel|incident|uptime|disponibilité|degraded performance)/i.test(t),
  },
];

async function body(url) {
  try {
    const r = await fetchWithTimeout(url, { ms: 15000 });
    if (!r.ok) return null;
    const ct = (r.headers.get('content-type') ?? '').toLowerCase();
    if (!ct.includes('html')) return null;
    const html = (await r.text()).slice(0, 300000);
    return { url: r.url, html };
  } catch {
    return null;
  }
}

const strip = (html) =>
  html.replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ');

/** Les langues que le site déclare lui-même : <html lang> et les hreflang. */
function languages(html) {
  const out = new Set();
  const lang = html.match(/<html[^>]+lang=["']([a-zA-Z-]{2,5})["']/i)?.[1];
  if (lang) out.add(lang.slice(0, 2).toLowerCase());
  for (const m of html.matchAll(/hreflang=["']([a-zA-Z-]{2,5})["']/gi)) {
    const v = m[1].slice(0, 2).toLowerCase();
    if (v !== 'x-') out.add(v);
  }
  return [...out].filter((x) => /^[a-z]{2}$/.test(x)).sort();
}

async function probeTool(tool) {
  const u = new URL(tool.website);
  const bare = u.hostname.replace(/^www\./, '');
  const home = (await body(`https://www.${bare}/`)) ?? (await body(`https://${bare}/`));
  if (!home) return { slug: tool.slug, status: 'site injoignable' };

  const origin = new URL(home.url).origin;
  const found = {};

  for (const probe of PROBES) {
    const urls = [
      ...(probe.subdomains ?? []).map((s) => `https://${s}.${bare}/`),
      ...probe.paths.map((p) => `${origin}${p}`),
    ];
    for (const url of urls) {
      const page = await body(url);
      if (!page) continue;
      const text = strip(page.html);
      if (text.length < 300) continue;
      if (probe.test(text)) {
        found[probe.key] = page.url.replace(/\/$/, '');
        break;
      }
    }
  }

  return {
    slug: tool.slug,
    status: 'relevé',
    signals: {
      ...found,
      languages: languages(home.html),
      checked_on: today(),
    },
  };
}

function toBlock(s) {
  const L = ['signals:'];
  for (const k of ['pricing', 'api_docs', 'security', 'privacy', 'status']) {
    if (s[k]) L.push(`  ${k}: ${s[k]}`);
  }
  if (s.languages?.length) L.push(`  site_languages: [${s.languages.join(', ')}]`);
  L.push(`  checked_on: "${s.checked_on}"`);
  return L.join('\n');
}

const tools = loadTools().filter((t) => {
  if (ONLY.length) return ONLY.includes(t.slug);
  return ALL || !t.signals?.checked_on;
});
console.log(`Signaux — ${tools.length} outils à sonder`);

const res = await pool(tools, 5, probeTool);
let written = 0;
const tally = { pricing: 0, api_docs: 0, security: 0, privacy: 0, status: 0 };

for (const r of res) {
  if (r?.status !== 'relevé') continue;
  const t = tools.find((x) => x.slug === r.slug);
  writeFileSync(t.file, upsertBlock(readFileSync(t.file, 'utf8'), 'signals', toBlock(r.signals)));
  written++;
  for (const k of Object.keys(tally)) if (r.signals[k]) tally[k]++;
}

const unreachable = res.filter((r) => r?.status === 'site injoignable').length;
console.log(`  ${written} fiche(s) enrichies · ${unreachable} site(s) injoignable(s)`);
console.log(Object.entries(tally).map(([k, v]) => `  ${String(v).padStart(4)}  ${k}`).join('\n'));
