// Chargement du catalogue au moment du build. Pas de base de données : les
// fichiers YAML de `data/` SONT la source de vérité, et le site n'en est qu'un
// rendu parmi d'autres (l'API JSON et CATALOG.md en sont deux autres).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const DATA = join(process.cwd(), 'data');
// CORE_SCHEMA : garde `updated: 2026-08-25` en chaîne plutôt qu'en objet Date.
const OPTS = { schema: yaml.CORE_SCHEMA };

export type Labelled = { id: string; label_en: string; label_fr: string; flag?: string; summary_en?: string; summary_fr?: string };

export interface Tool {
  slug: string; name: string; editor: string; website: string;
  hq_country: string; markets: string[];
  category: string; also_in?: string[];
  founded?: number;
  positioning: string; description: string; real_estate_use: string;
  features: string[];
  use_cases: { persona: string; job: string }[];
  personas: string[]; segments: string[]; company_sizes: string[];
  pricing: { model: string; public_pricing: boolean; from?: number; currency?: string; unit?: string; url?: string };
  integrations?: string[];
  ai?: { capabilities: string[] };
  product?: { api?: boolean; open_source?: boolean; mobile?: string[]; languages?: string[]; hosting?: string[] };
  logo?: { file: string; source_url: string; fetched_on: string };
  signals?: {
    pricing?: string; api_docs?: string; security?: string; privacy?: string; status?: string;
    site_languages?: string[]; checked_on: string;
  };
  alternatives?: string[];
  reviews: { source: string; url: string; rating: number; scale: number; count: number; sampled_on: string }[];
  sources: { url: string; note?: string }[];
  verification: { status: 'unverified' | 'verified' | 'stale' | 'disputed'; checked_on?: string | null; checked_by?: string | null };
  updated: string;
}

export interface Taxonomy {
  categories: Labelled[]; personas: Labelled[]; segments: Labelled[];
  company_sizes: Labelled[]; markets: Labelled[]; pricing_models: Labelled[];
}

export const taxonomy = yaml.load(readFileSync(join(DATA, 'taxonomy.yaml'), 'utf8'), OPTS) as Taxonomy;

export const tools: Tool[] = readdirSync(join(DATA, 'tools'))
  .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .map((f) => yaml.load(readFileSync(join(DATA, 'tools', f), 'utf8'), OPTS) as Tool)
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

const index = <T extends Labelled>(list: T[]) => Object.fromEntries(list.map((x) => [x.id, x])) as Record<string, T>;
export const byId = {
  category: index(taxonomy.categories),
  persona: index(taxonomy.personas),
  segment: index(taxonomy.segments),
  size: index(taxonomy.company_sizes),
  market: index(taxonomy.markets),
  pricing: index(taxonomy.pricing_models),
};

export const label = (kind: keyof typeof byId, id: string) => byId[kind][id]?.label_en ?? id;
export const bySlug = Object.fromEntries(tools.map((t) => [t.slug, t]));

/** Une catégorie compte un outil s'il y est à titre principal OU secondaire. */
export const toolsInCategory = (id: string) =>
  tools.filter((t) => t.category === id || (t.also_in ?? []).includes(id));

export const counts = {
  tools: tools.length,
  US: tools.filter((t) => t.markets.includes('US')).length,
  FR: tools.filter((t) => t.markets.includes('FR')).length,
  categories: taxonomy.categories.length,
  editors: new Set(tools.map((t) => t.editor)).size,
  verified: tools.filter((t) => t.verification?.status === 'verified').length,
  reviews: tools.reduce((n, t) => n + (t.reviews?.length ?? 0), 0),
};

/** Initiales servant de logo de repli — aucun asset distant, aucune requête tierce. */
export const initials = (name: string) =>
  name.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/**
 * Outils proches, calculés. À distinguer des `alternatives` déclarées dans la
 * fiche : celles-ci sont un jugement humain, celles-là une proximité mesurée
 * (même catégorie, mêmes métiers, mêmes classes d'actifs, même marché). Le site
 * les présente séparément — confondre les deux serait présenter un calcul comme
 * une opinion.
 */
const overlap = (a: string[] = [], b: string[] = []) => a.filter((x) => b.includes(x)).length;

export function related(tool: Tool, limit = 6): Tool[] {
  const declared = new Set(tool.alternatives ?? []);
  return tools
    .filter((t) => t.slug !== tool.slug && !declared.has(t.slug))
    .map((t) => {
      let score = 0;
      if (t.category === tool.category) score += 6;
      score += overlap(t.also_in, [tool.category, ...(tool.also_in ?? [])]) * 2;
      score += overlap(t.personas, tool.personas) * 2;
      score += overlap(t.segments, tool.segments);
      score += overlap(t.markets, tool.markets) * 2;
      score += overlap(t.company_sizes, tool.company_sizes);
      return { t, score };
    })
    .filter((x) => x.score >= 10)
    .sort((a, b) => b.score - a.score || a.t.name.localeCompare(b.t.name))
    .slice(0, limit)
    .map((x) => x.t);
}

export const toolsForPersona = (id: string) => tools.filter((t) => t.personas.includes(id));
export const toolsInMarket = (id: string) => tools.filter((t) => t.markets.includes(id));

/** Chemin absolu tenant compte du `base` GitHub Pages. */
export const url = (path = '') => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const p = path.replace(/^\//, '');
  return p ? `${base}/${p}` : base || '/';
};

export const REPO = 'https://github.com/flowmetrik/proptech-atlas';
