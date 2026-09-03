#!/usr/bin/env node
// Rassemble et lance tous les `*.test.mjs` du dépôt.
//
// Chaque fichier de test est un script autonome qui s'exécute avec `node` et
// sort en 0 (conforme) ou 1 (échec) — voir scripts/enrich/traces.test.mjs.
// Avant ce fichier, un test ajouté ne protégeait que celui qui pensait à le
// relancer à la main (docs/ameliorations.md, entrée « Le dépôt n'a pas de
// harnais de test »). Ce script ne réinvente rien : il trouve les fichiers,
// les lance chacun dans un process séparé, et fait échouer le sien si un seul
// échoue.
//
//   npm test
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function findTests(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...findTests(full));
    } else if (entry.endsWith('.test.mjs')) {
      found.push(full);
    }
  }
  return found;
}

const tests = findTests(root).sort();

if (tests.length === 0) {
  console.log('Aucun fichier *.test.mjs trouvé.');
  process.exit(0);
}

let echecs = 0;
for (const test of tests) {
  const label = relative(root, test);
  console.log(`\n— ${label}`);
  const res = spawnSync(process.execPath, [test], { stdio: 'inherit' });
  if (res.status !== 0) echecs += 1;
}

console.log(`\n${tests.length - echecs}/${tests.length} fichiers de test conformes`);
process.exit(echecs ? 1 : 0);
