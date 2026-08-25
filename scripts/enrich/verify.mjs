#!/usr/bin/env node
// Le garde-fou, en ligne de commande.
//
// Un agent qui cherche lui-même — Claude avec sa propre recherche web, un
// contributeur humain — passe ses trouvailles ici AVANT d'écrire quoi que ce
// soit. Le contrôle est le même que celui de la boucle automatique : le site
// répond, et le nom du produit figure sur sa propre page d'accueil.
//
//   node scripts/enrich/verify.mjs "Vilogi" https://www.vilogi.com
//   node scripts/enrich/verify.mjs --json candidats.json     # liste [{name, website}]
//   node scripts/enrich/verify.mjs --queue candidats.json    # vérifie ET met en file
import {
  ROOT, loadTools, pool, today, readFileSync,
  slugify, hostOf, cleanName, verifyCandidate, loadQueue, saveQueue,
} from './lib.mjs';

const args = process.argv.slice(2);
const mode = args[0] === '--json' ? 'json' : args[0] === '--queue' ? 'queue' : 'one';

let input;
if (mode === 'one') {
  const [name, website] = args;
  if (!name || !website) {
    console.error('usage: verify.mjs "<nom>" <url>  |  --json <fichier>  |  --queue <fichier>');
    process.exit(2);
  }
  input = [{ name, website }];
} else {
  input = JSON.parse(readFileSync(args[1], 'utf8'));
  if (!Array.isArray(input)) input = input.candidates ?? [];
}

const tools = loadTools();
const queue = loadQueue(ROOT);
const known = new Set([...tools.map((t) => t.slug), ...queue.candidates.map((c) => c.slug)]);
const hosts = new Set([...tools.map((t) => hostOf(t.website)), ...queue.candidates.map((c) => hostOf(c.website))].filter(Boolean));
const rejected = new Set(queue.rejected.map((r) => r.slug));

const results = await pool(input, 8, async (raw) => {
  const name = cleanName(raw.name);
  const slug = slugify(name);
  const h = hostOf(raw.website);
  if (known.has(slug)) return { name, slug, ok: false, why: 'déjà au catalogue ou en file' };
  if (rejected.has(slug)) return { name, slug, ok: false, why: 'déjà écarté lors d\'une passe précédente' };
  if (h && hosts.has(h)) return { name, slug, ok: false, why: `domaine déjà présent (${h})` };
  const v = await verifyCandidate({ ...raw, name });
  return { ...raw, name, slug, ok: v.ok, why: v.why, website: v.website ?? raw.website };
});

const ok = results.filter((r) => r.ok);
const ko = results.filter((r) => !r.ok);

for (const r of ok) console.log(`✓ ${r.name.padEnd(28)} ${r.website}`);
for (const r of ko) console.log(`✗ ${r.name.padEnd(28)} ${r.why}`);
console.log(`\n${ok.length} vérifié(s) · ${ko.length} écarté(s)`);

if (mode === 'queue' && ok.length) {
  queue.candidates.push(...ok.map((r) => ({
    name: r.name, slug: r.slug, editor: r.editor ?? r.name, website: r.website,
    category: r.category ?? null, markets: r.markets ?? [], why: r.why ?? '',
    source_url: r.source_url ?? r.website,
    found_in: r.found_in ?? 'manuel', verified_on: today(),
  })));
  queue.rejected.push(...ko.map((r) => ({ slug: r.slug, name: r.name, website: r.website, why: r.why })));
  saveQueue(ROOT, queue);
  console.log(`File : ${queue.candidates.length} candidat(s) en attente de fiche.`);
}

process.exit(ok.length ? 0 : 1);
