#!/usr/bin/env node
// Une passe complète d'enrichissement, dans l'ordre où les étapes se nourrissent.
//
// C'est la boucle de la méthode : elle est ré-exécutable sans état, chaque
// étape ne fait que ce qui manque, et elle se termine par une vérification
// exécutable. Sans crédits LLM, les deux premières étapes s'annoncent bloquées
// et les suivantes tournent quand même — le catalogue continue de s'enrichir.
//
//   node scripts/enrich/loop.mjs                 # une passe
//   node scripts/enrich/loop.mjs --rounds 3      # trois rondes de découverte
//   node scripts/enrich/loop.mjs --no-discover   # sans appel LLM
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, secrets, fetchWithTimeout } from './lib.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const ROUNDS = arg('rounds', '2');
const NO_DISCOVER = process.argv.includes('--no-discover');

const step = (title, cmd, args) => {
  console.log(`\n━━ ${title}`);
  try {
    execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
    return true;
  } catch {
    console.log(`   ↳ étape interrompue, on continue`);
    return false;
  }
};

/** Un appel LLM ne sert à rien sans crédits : autant le dire avant de brûler
 *  vingt minutes à collectionner des erreurs. */
async function llmReady() {
  const key = secrets().OPENROUTER_API_KEY;
  if (!key) return { ok: false, why: 'OPENROUTER_API_KEY absente du coffre' };
  try {
    const r = await fetchWithTimeout('https://openrouter.ai/api/v1/credits', {
      ms: 15000, headers: { authorization: `Bearer ${key}` },
    });
    const d = (await r.json())?.data ?? {};
    const left = (d.total_credits ?? 0) - (d.total_usage ?? 0);
    return left > 0.5
      ? { ok: true, left }
      : { ok: false, why: `crédits OpenRouter épuisés (${left.toFixed(2)} $) — recharger sur openrouter.ai/settings/credits` };
  } catch (e) {
    return { ok: false, why: `OpenRouter injoignable : ${e.message}` };
  }
}

const n = (f) => join(ROOT, 'scripts', f);

const llm = NO_DISCOVER ? { ok: false, why: '--no-discover' } : await llmReady();
if (llm.ok) {
  console.log(`Crédits OpenRouter : ${llm.left.toFixed(2)} $`);
  step('Découverte de produits manquants', 'node', [n('enrich/discover.mjs'), '--rounds', ROUNDS]);
  step('Rédaction des fiches en attente', 'node', [n('enrich/fiche.mjs')]);
} else {
  console.log(`\n━━ Découverte et rédaction — SAUTÉES\n   ${llm.why}`);
}

// Ces trois-là ne coûtent rien et n'appellent aucun modèle.
step('Logos manquants', 'node', [n('enrich/logos.mjs')]);
step('Signaux vérifiés', 'node', [n('enrich/signals.mjs')]);
step('Régénération de l\'API', 'node', [n('emit.mjs')]);

console.log('\n━━ Vérification');
try {
  execFileSync('node', [n('validate.mjs')], { cwd: ROOT, stdio: 'inherit' });
  console.log('\nPasse terminée. Le catalogue est publiable en l\'état.');
} catch {
  console.error('\n✗ Le catalogue ne passe pas le validateur — ne pas publier avant correction.');
  process.exit(1);
}
