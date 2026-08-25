#!/usr/bin/env node
// Les fiches dont le relevé de signaux a vieilli. Un signal de plus de trente
// jours ne dit plus rien de fiable : un éditeur a pu publier ses tarifs, ouvrir
// une page d'état ou fermer sa documentation d'API entre-temps.
//
//   node scripts/enrich/stale.mjs [jours] [max]
import { loadTools } from './lib.mjs';

const days = parseInt(process.argv[2] ?? '30', 10);
const max = parseInt(process.argv[3] ?? '40', 10);

// Les plus vieux relevés d'abord, et par lots : on ne remartèle pas 150 sites
// le même matin pour rafraîchir une donnée qui bouge en mois, pas en heures.
const stale = loadTools()
  .filter((t) => t.signals?.checked_on)
  .map((t) => ({ slug: t.slug, age: (Date.now() - Date.parse(t.signals.checked_on)) / 86400000 }))
  .filter((t) => t.age > days)
  .sort((a, b) => b.age - a.age)
  .slice(0, max)
  .map((t) => t.slug);

process.stdout.write(stale.join(','));
