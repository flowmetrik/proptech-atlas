#!/usr/bin/env node
// Enregistre une passe MANUELLE — un agent qui cherche lui-même, sans passer
// par sweep.mjs ni OpenRouter — dans data/sweeps.json.
//
// Pourquoi ce script existe : sweep.mjs est le seul à écrire data/sweeps.json,
// donc une source réellement balayée à la main (la voie recommandée depuis que
// la découverte par modèle coûte, cf. references/agent-workflow.md) reste
// « jamais vue » pour toujours. Deux conséquences fausses : le rendement
// mesuré ne parle que de la moitié du travail, et sweep.mjs représente cette
// source comme prioritaire alors qu'elle vient d'être regardée.
//
// Ce script ne fait AUCUN appel réseau ni LLM : il se contente de dater et de
// compter ce qu'un agent déclare avoir fait. C'est une mesure honnête, pas une
// intention — au même titre que sweep.mjs, mais sous des champs distincts
// (`manual_*`) pour ne jamais mélanger les deux voies dans une même statistique.
//
//   node scripts/enrich/mark-swept.mjs --source rent-paris --found 6 --kept 2
//   node scripts/enrich/mark-swept.mjs --source rent-paris --found 0 --kept 0 --note "aucun exposant nouveau"
import yaml from 'js-yaml';
import { ROOT, join, OPTS, readFileSync, writeFileSync, existsSync, today } from './lib.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };

const SOURCE = arg('source', null);
const FOUND = parseInt(arg('found', '0'), 10);
const KEPT = parseInt(arg('kept', '0'), 10);
const NOTE = arg('note', null);

if (!SOURCE) {
  console.error('usage: mark-swept.mjs --source <id> --found <n> --kept <n> [--note "..."]');
  process.exit(2);
}

const reg = yaml.load(readFileSync(join(ROOT, 'data', 'sources.yaml'), 'utf8'), OPTS);
if (!reg.sources.some((s) => s.id === SOURCE)) {
  console.error(`Source inconnue dans data/sources.yaml : ${SOURCE}`);
  process.exit(2);
}

const STATE = join(ROOT, 'data', 'sweeps.json');
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};

const st = state[SOURCE] ?? {};
state[SOURCE] = {
  ...st,
  // Champs automatiques (sweep.mjs) intacts, jamais touchés ici.
  last_swept_manual: today(),
  manual_runs: (st.manual_runs ?? 0) + 1,
  manual_found: (st.manual_found ?? 0) + FOUND,
  manual_kept: (st.manual_kept ?? 0) + KEPT,
  ...(NOTE ? { last_manual_note: NOTE } : {}),
};

writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n');
console.log(`${SOURCE} — passe manuelle enregistrée : ${FOUND} proposé(s) · ${KEPT} vérifié(s)`);
