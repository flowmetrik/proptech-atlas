#!/usr/bin/env node
// Deux pièges de `candidates()`/`imgLogoCandidates()` trouvés le 17/09 sur des
// fiches réelles (voir docs/ameliorations.md, entrée « fait » du 18/09) :
//
// 1. `higharc` — un logo client tiers dans un carrousel de témoignages porte
//    une classe contenant « logo » mais un `alt` vide. Il ne doit plus battre
//    un vrai apple-touch-icon.
// 2. `loftely` — le vrai `<img alt="Loftely">` a une URL de proxy Nuxt
//    (`_ipx/...`) dont la query contient `&amp;` non décodé ; l'URL construite
//    doit décoder l'entité pour rester valide.
//
//   node scripts/enrich/logos.test.mjs
import { candidates } from './lib.mjs';

let echecs = 0;
const verifie = (nom, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${nom}`);
  if (!cond) echecs += 1;
};

// Cas 1 — higharc : logo client tiers (classe "logo", alt vide) dans un
// carrousel, plus un apple-touch-icon réel sans `alt` à lire.
{
  const html = `
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <img src="/case-studies/signature-homes.png" class="case-study-tab-logo" alt="">
  `;
  const top = candidates(html, 'https://higharc.com/', 'Higharc')[0];
  verifie(
    "higharc : l'apple-touch-icon passe devant le logo client sans alt",
    top?.url === 'https://higharc.com/apple-touch-icon.png',
  );
}

// Cas 2 — loftely : le vrai logo porte l'alt attendu, mais son URL passe par
// un proxy Nuxt dont la query contient une entité HTML non décodée.
{
  const html = `
    <img src="/_ipx/w_256/https%3A%2F%2Floftely.fr%2Flogo.svg?url=%2Flogo.svg&amp;w=256" alt="Loftely">
  `;
  const top = candidates(html, 'https://loftely.fr/', 'Loftely')[0];
  verifie(
    "loftely : l'entité &amp; est décodée avant construction de l'URL",
    top?.url?.includes('&w=256') && !top.url.includes('&amp;'),
  );
}

// Cas 3 — un alt qui nomme la marque ET une classe "logo" ensemble restent le
// signal le plus fort, au-dessus de tout le reste.
{
  const html = `
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <img src="/logo.svg" class="site-logo" alt="Poliris">
  `;
  const top = candidates(html, 'https://poliris.com/', 'Poliris')[0];
  verifie(
    "poliris : alt + classe concordants restent devant l'apple-touch-icon",
    top?.url === 'https://poliris.com/logo.svg',
  );
}

console.log(`\n${3 - echecs}/3 cas conformes`);
process.exit(echecs ? 1 : 0);
