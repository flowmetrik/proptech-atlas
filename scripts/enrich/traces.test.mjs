#!/usr/bin/env node
// Le test hors ligne du contrôle « domaine reconverti ».
//
// Il n'appelle aucun réseau : les trois formes qui comptent tiennent dans des
// fragments de HTML. Le premier jet de ce contrôle passait le contrôle de forme
// et se trompait sur le fond — il alertait sur des produits vivants et laissait
// passer `cowork.io`, le cas pour lequel il avait été écrit. D'où ce fichier :
// ce qui se juge sur le contenu se teste sur le contenu.
//
//   node scripts/enrich/traces.test.mjs
import { missingProductTraces } from './lib.mjs';

// Un blog servi sur l'ancien domaine d'un SaaS mort. Aucune navigation produit ;
// le mot « prix » n'apparaît que dans un titre d'article, et c'est un piège.
const BLOG = `
<a href="https://www.cowork.io/">Accueil</a>
<a href="https://www.cowork.io/category/coworking/">Coworking</a>
<a href="https://www.cowork.io/category/innovation/">Innovation</a>
<a href="https://www.cowork.io/2025/11/03/la-carte-des-prix-de-meilleursagents/">La carte des prix</a>
<a href="https://www.cowork.io/2025/11/10/investissement-immobilier/">Investir</a>
<a href="https://www.cowork.io/a-propos-de-cowork-io/">À propos</a>
<a href="https://www.cowork.io/contactez-nous/">Contactez-nous</a>
<a href="https://www.cowork.io/mentions-legales/">Mentions légales</a>`;

// Un éditeur : la navigation porte le produit, les tarifs et l'espace client.
const PRODUIT = `
<a href="/coworking-software/">Software</a>
<a href="/coworking-pricing/">Pricing</a>
<a href="/integrations/">Integrations</a>
<a href="/support/">Support</a>
<a href="https://app.nexudus.com/login">Sign in</a>
<a href="/wp-content/themes/x/main.min.css">x</a>`;

// Une coquille rendue en JavaScript : elle ne dit rien, et se taire est la
// seule réponse juste. Zumper rend 3 ko et zéro lien.
const COQUILLE = '<div id="root"></div><a href="/">Home</a>';

const cas = [
  ['blog sur domaine reconverti', BLOG, (m) => m && m.length === 3],
  ['site produit', PRODUIT, (m) => m && m.length === 0],
  ['coquille JavaScript', COQUILLE, (m) => m === null],
];

let echecs = 0;
for (const [nom, html, attendu] of cas) {
  const m = missingProductTraces(html);
  const ok = attendu(m);
  if (!ok) echecs += 1;
  console.log(`${ok ? '✓' : '✗'} ${nom.padEnd(32)} ${m === null ? 'indécidable' : `manque: [${m.join(', ')}]`}`);
}

console.log(`\n${cas.length - echecs}/${cas.length} cas conformes`);
process.exit(echecs ? 1 : 0);
