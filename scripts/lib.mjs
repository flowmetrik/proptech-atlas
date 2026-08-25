import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

// CORE_SCHEMA : sans lui, js-yaml convertit `2026-08-25` en objet Date et la
// valeur cesse d'être la chaîne datée que le schéma décrit.
const OPTS = { schema: yaml.CORE_SCHEMA };

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = join(ROOT, 'data');

export function loadTaxonomy() {
  return yaml.load(readFileSync(join(DATA, 'taxonomy.yaml'), 'utf8'), OPTS);
}

export function loadTools() {
  const dir = join(DATA, 'tools');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
    .sort()
    .map((f) => ({ file: f, ...yaml.load(readFileSync(join(dir, f), 'utf8'), OPTS) }));
}
