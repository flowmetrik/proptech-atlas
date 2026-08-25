// Socle commun des scripts d'enrichissement : accès réseau, OpenRouter,
// Firecrawl, et lecture-écriture des fiches YAML sans passer par un parseur
// qui reformaterait tout le fichier.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TOOLS = join(ROOT, 'data', 'tools');
export const OPTS = { schema: yaml.CORE_SCHEMA };
export const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const today = () => new Date().toISOString().slice(0, 10);

export function loadTools() {
  return readdirSync(TOOLS)
    .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
    .sort()
    .map((f) => ({ file: join(TOOLS, f), ...yaml.load(readFileSync(join(TOOLS, f), 'utf8'), OPTS) }));
}

export const loadTaxonomy = () =>
  yaml.load(readFileSync(join(ROOT, 'data', 'taxonomy.yaml'), 'utf8'), OPTS);

/** Charge le coffre du cowork sans l'écrire nulle part. */
export function secrets() {
  const p = join(process.env.HOME, 'projects', 'flowmetrik-cowork', '.env');
  const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

export async function fetchWithTimeout(url, { ms = 20000, ...init } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, {
      redirect: 'follow',
      ...init,
      signal: ac.signal,
      headers: { 'user-agent': UA, ...(init.headers ?? {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

/** Exécute `n` tâches au plus en parallèle. Politesse autant que prudence. */
export async function pool(items, n, worker) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        try {
          out[k] = await worker(items[k], k);
        } catch (e) {
          out[k] = { error: e?.message ?? String(e) };
        }
      }
    })
  );
  return out;
}

// ── OpenRouter ────────────────────────────────────────────────────────────────

const KEY = () => secrets().OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY;

/**
 * Un appel OpenRouter renvoyant du JSON validé par un schéma.
 * `web` active la recherche web du routeur — c'est ce qui permet d'aller
 * chercher des annuaires, des blogs et des sites d'association plutôt que de
 * s'en remettre à la mémoire du modèle.
 */
export async function ask({ model, system, prompt, schema, web = false, maxTokens = 8000, retries = 3 }) {
  const body = {
    model: web ? `${model}:online` : model,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.2,
    ...(schema
      ? { response_format: { type: 'json_schema', json_schema: { name: 'result', strict: true, schema } } }
      : {}),
  };
  let last;
  for (let a = 0; a < retries; a++) {
    try {
      const r = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        ms: 180000,
        method: 'POST',
        headers: {
          authorization: `Bearer ${KEY()}`,
          'content-type': 'application/json',
          'http-referer': 'https://flowmetrik.github.io/proptech-atlas',
          'x-title': 'PropTech Atlas',
        },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message ?? JSON.stringify(j.error));
      const txt = j.choices?.[0]?.message?.content ?? '';
      if (!txt) throw new Error('réponse vide');
      return schema ? JSON.parse(txt) : txt;
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 2000 * (a + 1)));
    }
  }
  throw last;
}

// ── Firecrawl ─────────────────────────────────────────────────────────────────

/** Le texte lisible d'une page, obtenu par un simple fetch. C'est la voie
 *  principale : gratuite, et suffisante pour ancrer une rédaction. */
export async function pageText(url, { ms = 20000 } = {}) {
  const u = new URL(url);
  const tries = [...new Set([
    url,
    `${u.protocol}//www.${u.hostname.replace(/^www\./, '')}${u.pathname}`,
    `${u.protocol}//${u.hostname.replace(/^www\./, '')}/`,
  ])];
  for (const t of tries) {
    try {
      const r = await fetchWithTimeout(t, { ms });
      if (!r.ok) continue;
      const html = await r.text();
      const text = html
        .replace(/<(script|style|noscript|svg|head)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'")
        .replace(/&quot;/g, '"').replace(/&[a-z]+;/gi, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim();
      if (text.length > 200) return text;
    } catch { /* variante suivante */ }
  }
  return null;
}

/** Plusieurs pages d'un même site, concaténées — l'accueil dit ce qu'est le
 *  produit, /pricing et /features disent comment il se vend. */
export async function siteText(website, { pages = ['', '/pricing', '/tarifs', '/features', '/fonctionnalites', '/produit', '/product'], cap = 26000 } = {}) {
  const base = new URL(website);
  const out = [];
  for (const p of pages) {
    if (out.join('').length > cap) break;
    const t = await pageText(new URL(p || base.pathname || '/', base).href);
    if (t) out.push(`## ${p || '/'}\n${t.slice(0, 12000)}`);
  }
  return out.join('\n\n').slice(0, cap);
}

/** Récupère une page en markdown via Firecrawl. Renvoie null plutôt que de
 *  jeter : une page inaccessible est un fait, pas une erreur de pipeline. */
export async function scrape(url, { ms = 90000 } = {}) {
  const key = secrets().FIRECRAWL_API ?? process.env.FIRECRAWL_API;
  if (!key) return null;
  try {
    const r = await fetchWithTimeout('https://api.firecrawl.dev/v2/scrape', {
      ms,
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, timeout: 45000 }),
    });
    const j = await r.json();
    return j?.data?.markdown ?? null;
  } catch {
    return null;
  }
}

/** Le HTML brut d'une page, via Firecrawl — pour les sites qui bloquent un
 *  simple fetch (Cloudflare, bot management). */
export async function scrapeHtml(url, { ms = 90000 } = {}) {
  const key = secrets().FIRECRAWL_API ?? process.env.FIRECRAWL_API;
  if (!key) return null;
  try {
    const r = await fetchWithTimeout('https://api.firecrawl.dev/v2/scrape', {
      ms,
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ url, formats: ['rawHtml'], onlyMainContent: false, timeout: 45000 }),
    });
    const j = await r.json();
    return j?.data?.rawHtml ?? null;
  } catch {
    return null;
  }
}

// ── Écriture des fiches ───────────────────────────────────────────────────────

/**
 * Insère ou remplace un bloc de premier niveau dans un YAML, en laissant tout
 * le reste du fichier intact — commentaires et ordre des clés compris. Un
 * `yaml.dump` réécrirait 155 fichiers à chaque passe et rendrait les diffs
 * illisibles.
 */
export function upsertBlock(text, key, block) {
  const re = new RegExp(`^${key}:.*(?:\\n(?:[ \\t]+.*|)$)*`, 'm');
  const clean = block.replace(/\n+$/, '');
  if (re.test(text)) return text.replace(re, clean);
  // Placé juste avant `sources:`, qui clôt toujours la partie descriptive.
  if (/^sources:/m.test(text)) return text.replace(/^sources:/m, `${clean}\nsources:`);
  return `${text.replace(/\n+$/, '')}\n${clean}\n`;
}

export function bumpUpdated(text) {
  return /^updated:/m.test(text)
    ? text.replace(/^updated:.*$/m, `updated: "${today()}"`)
    : `${text.replace(/\n+$/, '')}\nupdated: "${today()}"\n`;
}

export function ensureDir(p) {
  mkdirSync(p, { recursive: true });
  return p;
}

export { readFileSync, writeFileSync, existsSync, join };
