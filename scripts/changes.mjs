#!/usr/bin/env node
// Le flux des nouveautés : quels produits ont été ajoutés ou modifiés
// récemment, pour qu'un consommateur de l'API n'ait pas à retélécharger tout
// `tools.json` pour savoir ce qui a bougé.
//
// La source est l'historique git de `data/tools/` — pas un champ écrit à la
// main, qui dérive toujours de la mise à jour réelle du dépôt. Piège déjà
// rencontré (voir docs/ameliorations.md, 2026-09-07) : les workflows GitHub
// Actions utilisent `actions/checkout@v4` sans `fetch-depth: 0` par défaut, ce
// qui ne récupère qu'un seul commit — chaque fichier daterait alors comme
// « ajouté aujourd'hui ». Les trois workflows du dépôt posent maintenant
// `fetch-depth: 0` ; ce script vérifie lui-même la profondeur et prévient
// plutôt que de produire un artefact silencieusement faux.
//
//   node scripts/changes.mjs [jours]      # défaut : 90
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadTools } from './lib.mjs';

const WINDOW_DAYS = parseInt(process.argv[2] ?? '90', 10);
const API = join(ROOT, 'public', 'api');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

// Une profondeur de clone insuffisante fausserait chaque date en « aujourd'hui »
// sans qu'aucune erreur ne le signale — préférer échouer bruyamment.
const shallow = existsSync(join(ROOT, '.git', 'shallow'));
if (shallow) {
  console.error(
    'changes.mjs : clone superficiel détecté (.git/shallow) — ' +
      'les dates seraient fausses. Ajouter `fetch-depth: 0` au checkout.'
  );
  process.exit(1);
}

// Un seul appel git pour tout l'historique de data/tools/, plutôt qu'un par
// fichier (245 fiches) : `git log` construit déjà la liste triée par commit.
// SOH (code 1) sépare les commits : aucune chance de collision avec un
// message de commit ou un chemin de fichier.
const SEP = String.fromCharCode(1);
const raw = git([
  'log',
  `--format=${SEP}%H|%aI`,
  '--name-status',
  '--diff-filter=AM',
  '--',
  'data/tools',
]);

// added : la plus ANCIENNE date où le fichier apparaît en statut A (premier
// commit qui l'introduit). lastModified : la plus RÉCENTE date, tous statuts
// confondus. `git log` sort du plus récent au plus ancien, donc on écrase
// `added` à chaque rencontre (on garde la dernière écriture, forcément la plus
// ancienne dans l'ordre de parcours) et on ne pose `lastModified` qu'une fois
// (la première rencontre est la plus récente).
const added = new Map();
const lastModified = new Map();

for (const block of raw.split(SEP).slice(1)) {
  const [header, ...lines] = block.split('\n');
  const [, iso] = header.split('|');
  const date = iso.slice(0, 10);
  for (const line of lines) {
    const m = line.match(/^([AM])\t(data\/tools\/([^\t]+\.yaml))$/);
    if (!m) continue;
    const [, status, , file] = m;
    if (file.startsWith('_')) continue; // gabarit
    if (!lastModified.has(file)) lastModified.set(file, date);
    if (status === 'A') added.set(file, date);
  }
}

const tools = loadTools();
const bySlugFile = new Map(tools.map((t) => [t.file, t]));

const cutoff = Date.now() - WINDOW_DAYS * 86400000;
const changes = [];
for (const [file, tool] of bySlugFile) {
  const addedOn = added.get(file);
  const modifiedOn = lastModified.get(file);
  if (!addedOn || !modifiedOn) continue; // fichier non versionné (ne devrait pas arriver)
  if (Date.parse(addedOn) >= cutoff) {
    changes.push({ slug: tool.slug, name: tool.name, action: 'added', date: addedOn });
  } else if (Date.parse(modifiedOn) >= cutoff) {
    changes.push({ slug: tool.slug, name: tool.name, action: 'updated', date: modifiedOn });
  }
}
changes.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));

mkdirSync(API, { recursive: true });
writeFileSync(
  join(API, 'changes.json'),
  JSON.stringify(
    {
      generated: new Date().toISOString().slice(0, 10),
      window_days: WINDOW_DAYS,
      note:
        "Fenêtre glissante dérivée de l'historique git de data/tools/. " +
        "'added' = première apparition du fichier, 'updated' = commit le plus " +
        "récent qui l'a modifié depuis. Un produit hors fenêtre n'apparaît pas ici.",
      count: changes.length,
      changes,
    },
    null,
    2
  ) + '\n'
);

console.log(`changes.json : ${changes.length} entrée(s) sur ${WINDOW_DAYS} jours`);
