#!/usr/bin/env node
// Le test hors ligne du blocage par domaine sur la file `rejected`.
//
// `courtisia` avait été écarté le 25/08 pour `courtisia.fr` (mort) alors que
// le produit vit à `courtisia.com` — bloquer par slug seul interdisait cette
// seconde chance pour toujours (voir docs/ameliorations.md, 08/09). Ce
// fichier fige le comportement attendu : un domaine nouveau lève le blocage,
// un domaine déjà essayé ou un refus sans domaine ne le lève pas.
//
//   node scripts/enrich/rejected.test.mjs
import { isStillRejected } from './lib.mjs';

const REJECTED = [
  { slug: 'courtisia', name: 'Courtisia', website: 'https://courtisia.fr', why: 'site injoignable' },
  { slug: 'siana', name: 'Siana', website: 'https://siana.ai', why: 'homonyme' },
  { slug: 'previsite', name: 'Previsite', why: 'déjà au catalogue ou en file' }, // pas de website
];

const cas = [
  ['domaine nouveau lève le blocage', 'courtisia', 'https://courtisia.com', false],
  ['même domaine, toujours bloqué', 'courtisia', 'https://courtisia.fr', true],
  ['même domaine avec www, toujours bloqué', 'courtisia', 'https://www.courtisia.fr', true],
  ['refus sans domaine, toujours bloqué', 'previsite', 'https://previsite.io', true],
  ['slug jamais écarté, jamais bloqué', 'kazaki', 'https://kazaki.fr', false],
];

let echecs = 0;
for (const [nom, slug, website, attendu] of cas) {
  const r = isStillRejected(REJECTED, slug, website);
  const ok = r === attendu;
  if (!ok) echecs += 1;
  console.log(`${ok ? '✓' : '✗'} ${nom.padEnd(40)} attendu=${attendu} obtenu=${r}`);
}

console.log(`\n${cas.length - echecs}/${cas.length} cas conformes`);
process.exit(echecs ? 1 : 0);
