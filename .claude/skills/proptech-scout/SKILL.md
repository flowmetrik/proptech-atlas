---
name: proptech-scout
description: >
  Chercheur de logiciels immobiliers pour PropTech Atlas. À charger dès qu'il
  s'agit d'ajouter, de vérifier, de corriger ou d'enrichir une fiche du
  catalogue, de balayer une source (annuaire, salon, presse, portefeuille de
  fonds, marketplace d'intégrations), de faire tourner la boucle
  d'enrichissement, ou de traiter le rapport de la routine quotidienne.
  Déclencheurs : « cherche des logiciels », « nouveaux outils immobilier »,
  « balaie <source> », « enrichis le catalogue », « fiche pour <produit> »,
  « routine PropTech Atlas », proptech-atlas, sweep, scout.
---

# Le chercheur de logiciels

Tu tiens un catalogue ouvert des logiciels de l'immobilier aux États-Unis et en
France. Ton travail n'est pas de « trouver des outils » : c'est de **produire
une entrée dont un autre agent pourra se servir sans la revérifier**. Une fiche
juste et modeste vaut mieux que dix fiches plausibles.

Le dépôt est le produit. `data/tools/<slug>.yaml` fait foi ; le site, l'API
JSON, le graphe, `llms.txt` et `CATALOG.md` en sont des rendus générés. Il n'y a
ni base de données, ni admin, ni login.

## Le périmètre, avant tout le reste

| Dedans | Dehors |
|---|---|
| Logiciels et plateformes SaaS utilisés par des professionnels de l'immobilier | Agences, réseaux, brokers |
| Portails et places de marché | Asset managers, foncières, fonds |
| Fournisseurs de données immobilières | Cabinets de conseil, syndics et gestionnaires en tant que sociétés |

La règle qui tranche : **on catalogue des produits, pas des sociétés qui
transigent ou gèrent pour compte de tiers.** Une société de service qui édite
aussi un logiciel entre au catalogue **pour le logiciel**, jamais pour elle-même.

Arbitré par Mehdi le 2026-08-25, après un premier passage qui avait exclu les
portails à tort. Ne pas le redéfaire.

## Deux façons de chercher

**Si tu as ta propre recherche web** — c'est le cas d'un agent Claude — tu n'as
besoin d'aucune clé tierce : tu cherches, tu fais passer tes trouvailles par le
vérificateur du dépôt, tu lis les sites, tu écris. C'est la voie de la routine
quotidienne, et elle marche même quand le solde OpenRouter est à zéro.
Marche à suivre, geste par geste : [`references/agent-workflow.md`](references/agent-workflow.md).

**Si tu veux du volume**, la boucle automatique fait la même chose en série via
OpenRouter. Elle coûte, et elle est décrite ci-dessous.

## La boucle

```bash
node scripts/enrich/loop.mjs                 # la passe complète
node scripts/enrich/loop.mjs --no-discover   # sans appel LLM, donc sans coût
node scripts/enrich/sweep.mjs --n 4          # balayer 4 sources
node scripts/enrich/sweep.mjs --source rent-paris
node scripts/enrich/fiche.mjs --limit 10     # vider la file
npm run data:validate && npm run data:emit
```

Deux utilitaires qui n'appellent aucun modèle et servent aux deux voies :

```bash
node scripts/enrich/verify.mjs "<nom>" <url>   # le garde-fou, en ligne de commande
node scripts/enrich/verify.mjs --queue <json>  # vérifie une liste ET la met en file
node scripts/enrich/fiche.mjs --from <json>    # écrit une fiche rédigée ailleurs
node scripts/enrich/stale.mjs 30 40            # fiches dont les signaux ont vieilli
```

Cinq étapes, dans l'ordre où elles se nourrissent :

1. **`sweep.mjs`** balaie une **source nommée** du registre et en extrait les
   produits. C'est la voie principale.
2. **`discover.mjs`** part d'une **catégorie × marché** et demande au modèle ce
   qu'il connaît. Voie secondaire, à réserver aux catégories creuses.
3. **`fiche.mjs`** rédige la fiche, ancrée sur le contenu réel du site.
4. **`logos.mjs`** et **`signals.mjs`** ne coûtent rien et n'appellent aucun
   modèle. Les lancer même quand les crédits LLM sont épuisés.
5. **`validate.mjs`** clôt la passe. Une fiche qui échoue est **retirée**.

## Le registre des sources

`data/sources.yaml` — 46 terrains de chasse, chacun avec ce qu'on y trouve que
les autres n'ont pas. `sweep.mjs` les rote par ancienneté de balayage et mesure
leur rendement dans `data/sweeps.json`.

Par rendement observé, du meilleur au plus incertain :

- **`marketplace`** — annuaires d'intégrations d'éditeurs établis (AppFolio
  Stack, Procore Marketplace, Zapier, Septeo). Meilleur rendement du lot : un
  incumbent y liste des dizaines d'outils de niche, et le fait que l'intégration
  existe prouve que le produit tourne.
- **`association`** — FNAIM, UNIS, SNPI, USH côté français ; NAR, NARPM, IREM
  côté américain. Volume moyen, signal fort : listé là veut dire en usage réel.
- **`event`** — exposants de RENT, du Salon de la Copropriété, du SIMI, de
  Blueprint. C'est là qu'on trouve les acteurs récents non encore référencés,
  particulièrement en France. **À balayer juste après chaque édition.**
- **`press`** — Journal de l'Agence, MySweetImmo, French PropTech, Propmodo,
  Inman. Irrégulier, mais seule source qui signale un produit avant tout annuaire.
- **`review`** — pages catégories de G2, Capterra.fr, Appvizer. Bon index.
- **`vc`**, **`launch`** — détectent tôt, mais une levée n'est pas un produit en
  usage : **vérifier deux fois**.
- **`opensource`**, **`public`** — faible volume, unicité maximale. Les éditeurs
  du logement social et les produits open source ne sont dans aucun annuaire
  commercial.

Ajouter une source suppose de répondre à : *qu'y trouve-t-on que les autres
n'ont pas ?* Sans réponse, ce n'en est pas une.

## Les trois gardes-fous, et pourquoi ils existent

**1. Un candidat est vérifié avant d'entrer dans la file.** Un modèle interrogé
sur « les logiciels de syndic français » invente des produits plausibles. Le
contrôle est exécutable : le site répond, **et** le nom du produit figure sur sa
propre page d'accueil. Une URL de recherche ou de fiche d'annuaire est refusée —
c'est là que le modèle l'a trouvé, pas là que le produit vit.

**2. La rédaction est ancrée.** `fiche.mjs` récupère l'accueil, la page tarifs
et la page fonctionnalités, et le modèle écrit **à partir de ce texte**. Trois
niveaux, du plus contrôlé au moins : lecture directe · Firecrawl · recherche web
par le modèle — et dans ce dernier cas la fiche le dit dans ses `sources`.

**3. Deux niveaux de fiabilité, jamais confondus.** La prose est rédigée et
marquée `unverified` tant qu'un humain ne l'a pas recoupée. Les `signals` sont
établis par la machine, portent l'URL qui les prouve et la date du relevé. Un
signal absent veut dire *« pas trouvé à cette date »*, jamais *« n'existe pas »*.
Cette distinction voyage dans le JSON : c'est la promesse du projet.

## Ce qu'on ne fait jamais

- **Aucun avis inventé.** G2, Capterra et Trustpilot renvoient `403` à tout
  accès automatisé : impossible de relever une note et de la dater honnêtement.
  Le catalogue en publie **zéro**, et le validateur refuse toute note sans URL de
  source et sans `sampled_on`. Une case vide est une information juste ; un 4,5
  plausible est un faux. Ne jamais « remplir » ce champ.
- **Aucun montant de prix recopié.** `signals.pricing` dit seulement *« l'éditeur
  publie ses tarifs, à cette URL, à cette date »*. Le montant bouge ; on ne le
  fige pas.
- **Aucun classement.** Pas de placement payant, pas de « top 10 », pas de
  recommandation. L'ordre est alphabétique ou explicitement trié par le lecteur.
  **L'audience ne réordonne rien** : savoir qu'une fiche est très lue dit où
  travailler, jamais ce que le lecteur doit voir en premier. Le jour où la
  popularité décide de l'affichage, ce catalogue devient un annuaire
  publicitaire comme les autres.
- **Aucune certitude simulée.** Si le site ne dit pas une année de création, une
  intégration ou une langue, on laisse le champ vide. Un champ manquant est une
  lacune connue ; un champ faux est un dégât.

## Écrire une fiche

Le contrat complet : [`data/SCHEMA.md`](../../../data/SCHEMA.md). Le gabarit :
[`data/tools/_template.yaml`](../../../data/tools/_template.yaml).

Ce qui fait la différence entre une bonne et une mauvaise fiche :

- **`real_estate_use` est le champ pour lequel ce projet existe.** Décris la
  situation de travail concrète : qui attrape cet outil, à quel moment, pour
  résoudre quoi. Deux à quatre phrases. Jamais une liste de fonctionnalités,
  jamais du marketing. C'est la partie qu'un modèle a besoin de lire pour
  répondre à « quel outil dans cette situation ».
- **`description` dit ce que le produit EST**, factuellement. `positioning`
  porte la revendication qu'il fait sur lui-même. Les garder séparés est
  délibéré : c'est ce qui permet à un lecteur de distinguer les deux.
- **Les fonctionnalités sont des noms, pas des adjectifs.** « Comptabilité par
  immeuble avec répartition aux tantièmes », pas « puissant et intuitif ».
- **Ne recopie pas le site de l'éditeur.** Paraphrase.
- **Une seule catégorie principale.** Si le produit déborde vraiment, `also_in`.
- **Anglais** pour les fiches — c'est la couche d'interopérabilité. **Français**
  pour la documentation du dépôt et les commentaires de code.
- Pas de superlatif, pas de « leading », pas de « innovative », pas de tiret
  cadratin décoratif.

## Deux métiers, pas un

Le chercheur ne fait pas qu'ajouter des fiches. **Chaque passe comporte aussi un
temps d'amélioration du projet** : corriger ce qui est cassé, combler un manque
du site, mettre à jour une documentation qui a dérivé.

Le carnet est [`docs/ameliorations.md`](../../../docs/ameliorations.md). On y
pioche **une** entrée par passe — la plus utile pour son coût — et on y ajoute ce
qu'on rencontre en chemin. On n'efface pas une entrée faite : savoir qu'une chose
a été tentée vaut mieux que de la retenter.

Ordre de priorité quand les deux sont possibles : **ce qui est cassé d'abord**,
puis les fiches, puis l'amélioration. Un site qui ne construit plus rend le
catalogue invisible ; huit fiches de plus n'y changent rien.

## Fusionner et déployer

**La routine fusionne son propre travail** quand le garde l'autorise, et le
déploiement suit tout seul — le workflow Pages part à chaque poussée sur `main`.

```bash
bash scripts/ci/merge-guard.sh     # avant toute fusion, sans exception
```

Le garde regarde le **diff**, pas les intentions. Il refuse quatre choses :

1. la suppression d'une fiche existante — on corrige, ou on marque `disputed` ;
2. l'ajout d'une note d'avis — aucune source accessible ne permet de la dater ;
3. un catalogue qui échoue au validateur ;
4. des artefacts générés périmés — sinon le site publié mentirait sur l'API
   qu'il sert.

S'il refuse, **on ne contourne pas** : on corrige, ou on laisse la pull request
à la relecture humaine. C'est un cas de succès, pas un échec.

Après fusion, vérifier que le déploiement est passé et que le site répond :

```bash
gh run list --repo flowmetrik/proptech-atlas --limit 3
curl -sL -o /dev/null -w '%{http_code}\n' https://flowmetrik.github.io/proptech-atlas/
```

Ce contrôle n'est pas une politesse : un build vert qui déploie une page blanche
est déjà arrivé ailleurs, et personne ne s'en aperçoit avant des jours.

## La routine quotidienne

Voir [`references/routine.md`](references/routine.md) pour ce qu'elle fait
exactement, et ce qu'il faut regarder dans son rapport.

Quand tu traites son résultat :

1. Lire le diff des fiches ajoutées, pas seulement le résumé.
2. Vérifier au moins que chaque nouveau produit est bien un **produit** et pas
   une société de service — c'est l'erreur que le pipeline laisse le plus
   facilement passer.
3. Regarder les rejets : un motif qui revient (`le nom du produit ne figure pas
   sur la page`) signale souvent une source qui renvoie des pages d'annuaire
   plutôt que des sites produits. Corriger la source, pas les candidats.

## Quand ça coince

| Symptôme | Cause | Geste |
|---|---|---|
| `Insufficient credits` sur tous les appels | Solde OpenRouter à zéro | Recharger sur `openrouter.ai/settings/credits`. `loop.mjs` vérifie le solde avant de commencer et saute proprement les étapes LLM. |
| `contenu du site trop mince` | Le site bloque un `fetch` (Cloudflare) | Normal, le pipeline bascule sur la recherche web et le note dans `sources`. |
| Firecrawl renvoie `Insufficient credits` | Crédits épuisés | Sans conséquence : ce n'est qu'un secours de lecture, `fetch` direct couvre ~85 % des domaines. |
| Beaucoup de candidats rejetés d'une même source | La source liste des pages d'annuaire | Ajuster son entrée dans `data/sources.yaml`, ou la retirer. |
| Une fiche générée échoue au validateur | Champ hors taxonomie | Elle est retirée automatiquement. Regarder si la taxonomie manque une catégorie plutôt que de forcer la fiche. |

## Modèles et budget — la règle est dure

**Modèles bon marché et ouverts, jamais de modèle propriétaire haut de gamme.**

| Rôle | Modèle | Prix |
|---|---|---|
| Défaut — extraire des produits, remplir un schéma | `deepseek/deepseek-v4-flash` | 0,08 / 0,17 $ par M |
| Rédaction d'une fiche, où la prose compte | `z-ai/glm-4.7` | 0,40 / 1,75 $ par M |

Surchargeables par `ATLAS_MODEL` et `ATLAS_MODEL_SMART`. **Ne jamais y mettre
un Opus, ni un Sonnet propriétaire.**

**Pourquoi c'est écrit noir sur blanc :** le 2026-08-25, une ronde de découverte
sur `claude-sonnet-5` a vidé le solde OpenRouter de Mehdi en une passe. Le
coupable n'est pas le nombre d'appels mais la recherche web — elle injecte le
contenu des résultats dans le prompt et multiplie les jetons d'entrée par dix.
Sur un modèle à 2 $/M, ça se paie ; sur un modèle à 0,08 $/M, non.

**Le budget est plafonné dans le code.** `ATLAS_MONTHLY_BUDGET_EUR`, 20 € par
défaut. Chaque appel enregistre son coût réel — celui que renvoie OpenRouter,
pas une estimation — dans `data/spend.json`, et `ask()` refuse de partir dès que
le mois est atteint. `loop.mjs` affiche le reste avant de commencer.

```bash
node -e "import('./scripts/enrich/lib.mjs').then(m=>console.log(m.budgetLeft().toFixed(2),'€ restants ce mois'))"
```

**Trois réflexes de coût**, dans l'ordre d'efficacité :

1. **Chercher soi-même** quand on a sa propre recherche web —
   [`references/agent-workflow.md`](references/agent-workflow.md). Coût
   OpenRouter : zéro.
2. **Balayer des sources** plutôt que découvrir par catégories : moins d'appels,
   des prompts plus courts, un meilleur rendement.
3. **Plafonner les résultats web** — `ATLAS_WEB_RESULTS`, 3 par défaut. Chaque
   résultat est facturé et gonfle le prompt.

Le plafond du code n'est pas un plafond de compte : pour un vrai garde-fou côté
OpenRouter, il faut le poser dans le tableau de bord
(`openrouter.ai/settings/credits`), ce qu'une clé d'inférence ne permet pas de
faire par API.
