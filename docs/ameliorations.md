# Améliorations — le carnet ouvert

Ce que le projet sait de ses propres manques. La routine quotidienne y pioche,
et y ajoute ce qu'elle rencontre. Un fichier, pas un outil de suivi : la dette
d'un dépôt de 400 fichiers tient dans une page.

**Convention.** Chaque entrée porte un état — `ouvert`, `en cours`, `fait
<date>`, `abandonné <date> : raison`. On n'efface pas une entrée faite : savoir
qu'une chose a été tentée vaut mieux que de la retenter.

---

## Ouvert — qualité de la donnée

- **Passer des fiches en `verified`.** 158 fiches, **zéro vérifiée**. C'est le
  manque le plus important du projet : tout le catalogue est en « rédigé, non
  recoupé ». Vérifier veut dire ouvrir les sources, corriger ce qui a bougé,
  dater le contrôle. Commencer par les fiches les plus consultées une fois la
  mesure d'audience en place.
- **Cinq outils sans logo** — `bob-desk`, `listhub`, `poliris`,
  `salvia-developpement`, `urbanease`. Leur site résiste aux trois voies de
  récupération.
- **19 sites injoignables au sondage des signaux.** Voir s'ils bloquent tout
  accès automatisé, ou si l'URL enregistrée est morte — le second cas est une
  fiche à corriger.
- **Les avis restent à zéro.** G2, Capterra et Trustpilot renvoient `403`. Deux
  issues possibles : une clé d'API payante chez l'un d'eux, ou des contributions
  humaines sourcées. Ne jamais résoudre ce point en inventant.

## Ouvert — couverture

- **Catégories creuses**, à traiter par une source ciblée plutôt que par une
  ronde généraliste : `listing-syndication` (2 FR, 0 US), `agent-marketing`
  (0 FR), `lending-mortgage` (0 FR au départ), `transaction-management` (0 FR).
- **Le marché français reste le gisement.** Les éditeurs français ne se
  référencent pas en anglais : c'est là que ce catalogue est seul.
- **Sources jamais balayées** — voir `data/sweeps.json`. Une source sans entrée
  n'a jamais été vue. Neuf sources sur 46 ont été vues au moins une fois.
- **`syndic-copro` n'a aucune fiche américaine** alors que la gestion de
  copropriété est un segment entier aux États-Unis, sous le nom HOA. La
  catégorie existe et la taxonomie convient : c'est le trou le plus large du
  catalogue. Même remarque, en plus petit, pour `ai-assistants` côté français.

## Ouvert — site et données

- **Comparaison deux à deux.** Une page « X vs Y » pour les paires réellement
  concurrentes. Fort en référencement, mais **risque de contenu creux** : à ne
  faire que si la page dit ce qui sépare vraiment les deux produits.
- **Filtre sur les signaux dans l'explorateur** — « seulement ceux qui publient
  leurs tarifs », « seulement ceux qui ont une API documentée ». La donnée
  existe déjà, elle n'est pas encore filtrable.
- **Un flux des nouveautés.** `/api/changes.json` : ce qui a été ajouté ou
  modifié depuis N jours, pour qu'un consommateur de l'API n'ait pas à tout
  retélécharger.
- **Descriptions françaises.** Le schéma accepte `description_fr` ; rien ne le
  remplit. Une moitié du catalogue est française et se lit en anglais.

## Ouvert — exploitation

- **Plafond de dépense côté compte OpenRouter.** Le plafond du code
  (`ATLAS_MONTHLY_BUDGET_EUR`) protège ce dépôt ; il ne protège pas le compte.
  À poser dans le tableau de bord OpenRouter — une clé d'inférence ne peut pas
  le faire par API.
- **Le domaine propre.** `CUSTOM_DOMAIN` est câblé dans le déploiement ; il
  manque l'enregistrement DNS.
- **Droit d'écriture des workflows.** Tant que l'organisation le refuse, le
  workflow quotidien ne peut que constater. Le rendre capable d'entretenir le
  catalogue lui-même demande deux réglages d'organisation.
- **Identifiant GA4.** La mesure est câblée et attend la variable de dépôt
  `GA4_MEASUREMENT_ID`. Sans elle, aucune ligne de script tiers n'est émise.

---

## Fait

- **2026-08-29** — Trois passes du chercheur dormaient dans des pull requests
  empilées, chacune servant de base à la suivante : la première non fusionnée
  bloquait les deux autres, et `main` avançant par ailleurs, aucune ne pouvait
  plus se rebaser sans conflit sur des artefacts générés. Les 21 fiches sont
  reprises en une seule branche assise sur `main`. Trois fiches en double
  (ButterflyMX, Créditéo, Eloa) : la version la plus ancienne est retenue.
  À retenir : ouvrir la passe N+1 sur `main`, jamais sur la branche N.
- **2026-08-29** — `imagemagick()` déclarait ImageMagick 7 dès qu'un binaire
  nommé `magick` existait sur le PATH. Un shim `magick` renvoyant sur le
  `convert` d'ImageMagick 6 — celui qu'on pose pour dépanner — passe ce
  contrôle et fait échouer chaque `magick identify`. Comme `logos.mjs` avale
  les erreurs candidat par candidat, la panne se lisait « aucun logo
  exploitable » sur les 20 outils examinés, sans qu'aucune trace ne parle
  d'ImageMagick. La résolution interroge maintenant la version qui répond.
- **2026-08-29** — Un PNG présent dans `public/logos/` dont la fiche ne portait
  pas de bloc `logo` était sauté à chaque passe (« déjà là ») et n'était donc
  jamais adopté : le fichier existait, le site ne l'affichait pas, et rien ne le
  signalait. 15 logos étaient dans ce cas. Ils sont repris ; 174 fiches sur 179
  ont maintenant un logo, contre 154.
- **2026-08-25** — Marque, logos des éditeurs (154/158), signaux vérifiés
  (139 outils), surface SEO portée de 189 à 363 pages, pipeline d'enrichissement
  en boucle, skill `proptech-scout`, routine quotidienne.
- **2026-08-25** — Modèles ouverts et bon marché par défaut, plafond mensuel
  appliqué dans le code, recherche web plafonnée à trois résultats. Après qu'une
  ronde sur un modèle propriétaire a vidé un solde entier en une passe.
- **2026-08-28** — Mesure d'audience GA4 sous consentement, page `/privacy`,
  garde de fusion, domaine et mesure pilotés par variables de dépôt.
- **2026-08-28** — Le workflow quotidien ne parsait pas depuis le 27/08 :
  GitHub refuse le contexte `secrets` dans un `if` de step, ce qui invalide le
  fichier entier et produit un run en échec sans job. Le symptôme qui le
  trahit : GitHub affiche le CHEMIN du fichier au lieu du nom du workflow.
  `yaml.safe_load` validait pourtant — un lint YAML ne valide pas un workflow.
- **2026-08-28** — Les 158 images de partage étaient réécrites à chaque passe :
  un PNG n'est pas reproductible d'une version d'ImageMagick à l'autre, donc le
  dépôt prenait 1,6 Mo de diff par jour pour aucun changement réel. Une empreinte
  de ce qui figure sur la carte décide maintenant de la régénération.
- **2026-08-28** — Le workflow quotidien devient un contrôle de santé en lecture
  seule : l'organisation refuse le droit d'écriture aux workflows, et Actions ne
  peut pas ouvrir de pull request. Écrire est le métier de la routine Claude, qui
  tourne sur la VM avec de vraies identités.
- **2026-08-28** — `magick` n'existe pas sur les runners Ubuntu, qui installent
  ImageMagick 6 (`convert` et `identify`). La chaîne marchait en local et
  échouait en CI : la panne la plus coûteuse à diagnostiquer. Le binaire est
  maintenant résolu à l'exécution, et l'échec des images de partage ne fait
  plus tomber la passe entière.
