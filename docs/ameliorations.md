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
- **Deux outils sans logo** — `listhub` et `urbanease`. Leur site résiste aux
  trois voies de récupération. Trois autres (`bob-desk`, `poliris`,
  `salvia-developpement`) n'y résistaient pas : leur URL était morte, corrigée le
  31/08. `poliris` reste sans logo par choix — voir l'entrée du 31/08.
- **`verify.mjs` ne voit pas un domaine reconverti.** Il contrôle que le site
  répond et que le nom figure sur l'accueil ; un domaine dont le produit est mort
  et qui sert maintenant un blog de contenu passe les deux. Vu le 01/09 sur
  `cowork.io`, présenté par la presse comme un SaaS de gestion de coworking et
  devenu un blog signé d'un seul auteur, sans trace du produit. Le signal qui
  l'aurait trahi : aucune page tarif, aucune page fonctionnalités, aucun lien de
  connexion. À ajouter comme avertissement, pas comme rejet — c'est un jugement.
- **`logos.mjs` ne sait toujours pas reconnaître un logo.** Deux garde-fous
  existent désormais : `data/logos-refuses.json` fait tenir un refus humain d'une
  passe à l'autre, et depuis le 01/09 un aplat d'une seule couleur est rejeté
  automatiquement. Reste le cas difficile, celui de `poliris` : une image
  parfaitement valide qui n'est simplement pas le logo. Le nom du produit dans
  l'attribut `alt` de l'image candidate serait le prochain signal à exploiter.
- **Les avis restent à zéro.** G2, Capterra et Trustpilot renvoient `403`. Deux
  issues possibles : une clé d'API payante chez l'un d'eux, ou des contributions
  humaines sourcées. Ne jamais résoudre ce point en inventant.

## Ouvert — couverture

- **Catégories creuses**, à traiter par une source ciblée plutôt que par une
  ronde généraliste. Relevé au 01/09, en US/FR/total : `flex-coworking` 4/8/8,
  `lending-mortgage` 3/3/6, `listing-syndication` 3/5/8, `commercial-am` 6/6/7,
  `visuals-tours` 3/6/6. Par marché, deux trous nets : `ai-assistants` n'a que
  **2 fiches françaises** contre 10 américaines, et `diagnostics-compliance` que
  **2 américaines** contre 5 françaises. Les chiffres de ce carnet vieillissent
  vite : les recompter avant de choisir, pas les lire.

  ```bash
  node --input-type=module -e "import fs from 'node:fs';import yaml from 'js-yaml';\
  const t=fs.readdirSync('data/tools').filter(f=>f.endsWith('.yaml')&&!f.startsWith('_'))\
  .map(f=>yaml.load(fs.readFileSync('data/tools/'+f,'utf8')));\
  for(const c of yaml.load(fs.readFileSync('data/taxonomy.yaml','utf8')).categories){\
  const i=t.filter(x=>x.category===c.id||(x.also_in||[]).includes(c.id));\
  console.log(String(i.length).padStart(3),c.id,'US',i.filter(x=>x.markets.includes('US')).length,\
  'FR',i.filter(x=>x.markets.includes('FR')).length);}"
  ```
- **Le marché français reste le gisement.** Les éditeurs français ne se
  référencent pas en anglais : c'est là que ce catalogue est seul.
- **Sources jamais balayées** — voir `data/sweeps.json`. Une source sans entrée
  n'a jamais été vue. Dix sources sur 46 ont été vues au moins une fois.
- **`data/sweeps.json` ne connaît que les passes automatiques.** Il est écrit par
  `sweep.mjs` ; une passe d'agent qui cherche lui-même, la voie recommandée
  depuis que la découverte par modèle coûte, n'y laisse aucune trace. Une source
  réellement travaillée à la main y reste donc « jamais vue » pour toujours, et
  le rendement mesuré ne parle que de la moitié du travail. Ne pas la remplir à
  la main pour autant : ce serait mélanger une mesure et une déclaration. Il faut
  soit un champ distinct pour la passe manuelle, soit une commande qui l'écrive.
- **Les sources `association` ne rendent plus rien, des deux côtés de
  l'Atlantique.** `unis-partenaires`, `fnaim-partenaires` et
  `laboiteimmo-partenaires` étaient muettes ou en 404 le 26/08 ; le 29/08,
  l'annuaire des affiliés de la NARPM s'est révélé sans aucun lien sortant, son
  contenu vivant derrière `community.narpm.org`, réservé aux membres. Ce n'est
  pas un faible rendement, c'est un mécanisme : les fédérations ont déplacé leur
  annuaire fournisseurs derrière une adhésion. Il faut soit retirer ces entrées,
  soit leur trouver une URL publique qui existe encore. Six autres sources
  `association` ne sont pas encore vérifiées.
- **`syndic-copro` n'a aucune fiche américaine** alors que la gestion de
  copropriété est un segment entier aux États-Unis, sous le nom HOA. La
  catégorie existe et la taxonomie convient : c'est le trou le plus large du
  catalogue. Même remarque, en plus petit, pour `ai-assistants` côté français.

## Ouvert — site et données

- **Comparaison deux à deux.** Une page « X vs Y » pour les paires réellement
  concurrentes. Fort en référencement, mais **risque de contenu creux** : à ne
  faire que si la page dit ce qui sépare vraiment les deux produits.
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

- **2026-09-01** — Deux fiches affichaient un **carré blanc** en guise de logo,
  et rien ne le disait. `dollydesk` venait d'être récupéré, `pricehubble` datait
  du 25/08 et servait ce vide depuis. La cause n'est pas dans le catalogue : la
  source est un SVG, ImageMagick n'a pas son délégué `rsvg-convert` sur cette
  machine, et **il rend un aplat au lieu d'échouer** — à la bonne taille, au bon
  poids, donc invisible au contrôle de dimensions comme à celui de poids de
  fichier (`> 400` octets ; le faux en pesait 419). Même famille que la panne du
  28/08 : un binaire d'image qui manque et une chaîne qui continue comme si de
  rien n'était. Le contrôle ajouté rogne le transparent puis compte les couleurs
  restantes : un aplat en a une, un glyphe monochrome sur fond transparent en a
  deux. Passé sur les 198 logos du catalogue, il trouve exactement ces deux-là et
  aucun faux positif. Les deux ont été repris et portent maintenant un vrai logo.
  À retenir : un rendu d'image qui échoue en produisant quelque chose de valide
  ne se voit qu'à l'œil — il faut un test qui interroge le **contenu**, pas la
  forme du fichier.

- **2026-09-01** — Les signaux étaient relevés, datés, prouvés par une URL… et
  invisibles à qui cherche. L'explorateur ne savait filtrer que sur ce que la
  fiche **raconte** (catégorie, persona, taille) et pas sur ce que la machine a
  **constaté**. Cinq cases s'ajoutent sous « Verified signals » : publie ses
  tarifs (48), API documentée (14), page sécurité (25), page confidentialité
  (133), page d'état (52). Au passage, les trois drapeaux existants cessent
  d'être écrits à trois endroits — liste déclarée une fois, transportée jusqu'au
  script par `data-flags` sur le conteneur : ajouter un drapeau ne demande plus
  de toucher au JavaScript. Une note sous le titre dit ce qu'une case vide veut
  dire, parce que « pas trouvé le 27/08 » et « n'existe pas » ne sont pas la
  même information et que l'interface, seule, laisse lire la seconde. Vérifié au
  navigateur : compteurs, état porté par l'URL, rechargement, croisement avec
  les facettes, remise à zéro.

- **2026-08-31** — Un logo écarté par un humain revenait à la passe suivante.
  `logos.mjs` prend la meilleure image candidate d'un site, et « meilleure » ne
  veut pas dire « c'est un logo » : sur `poliris`, c'était un export de
  diapositive du repreneur, un dégradé de triangles. Supprimer le PNG ne servait
  à rien, la passe d'après le reprenait à l'identique. `data/logos-refuses.json`
  porte maintenant les refus, avec ce qui avait été récupéré et pourquoi ça
  n'allait pas ; `--all` ne les contourne pas, parce qu'un jugement n'est pas un
  cache. Le validateur a fait son travail dans la foulée : il a refusé la fiche
  dont le bloc `logo` pointait sur un fichier supprimé.

- **2026-08-31** — Sur les 19 sites qui échouaient au sondage des signaux, la
  cause n'était pas la même pour tous, et le pipeline ne le disait pas :
  `body()` renvoie `null` aussi bien sur un 403 que sur un domaine mort.
  Sondage manuel : **14 répondent 403 ou 429** — Akamai, Cloudflare, CloudFront —
  et leur URL est juste ; ce sont des portails qui refusent tout accès
  automatisé, il n'y a rien à corriger. **5 échouaient au niveau réseau, et
  c'étaient bien cinq fiches fausses** : `bobdesk.fr`, `poliris.com` et
  `salvia-software.com` ne résolvent plus du tout, `laboiteimmo.com` sert un
  certificat expiré et `twimm.fr` un certificat qui ne couvre pas son propre nom.
  Corrigées vers `bob-desk.com`, `la-boite-immo.com`, `salviadeveloppement.fr` et
  la page produit Twimm de `twipi-group.com`. Les cinq sont désormais sondées, et
  trois logos manquants sont tombés d'eux-mêmes : la même URL morte causait les
  deux pannes. `poliris` passe en `disputed` : son domaine ne résout plus, son
  ancienne adresse redirige vers Orisha Real Estate, et le nom Poliris n'apparaît
  ni sur cet accueil ni dans les sitemaps — la fiche est conservée, la question
  posée. À retenir : un compteur d'échecs qui ne distingue pas « refuse les
  robots » de « n'existe plus » cache des fiches fausses derrière du bruit.

- **2026-08-31** — Le contrôle de fraîcheur des artefacts générés était rouge
  tous les jours, pour rien. `emit.mjs` datait ses sorties à l'horloge
  (`new Date()`) : dès le lendemain d'une fusion, régénérer produisait un diff
  d'une seule ligne de date sur `CATALOG.md` et les trois JSON de l'API, et la
  CI, le contrôle de santé quotidien et la règle 4 du garde de fusion criaient
  « artefacts périmés » sur un catalogue rigoureusement identique. Rouges depuis
  le 30/08 pour cette unique raison — et le vrai signal de péremption, celui qui
  compte, s'y noyait. Le tampon est maintenant **dérivé des données** : la plus
  récente des dates `updated` et `signals.checked_on` des fiches. `emit.mjs` est
  redevenu une fonction pure de son entrée, et sortie inchangée sur le contenu.
  Même famille que la panne des images de partage du 28/08 : un artefact généré
  qui bouge sans que la donnée bouge rend son propre contrôle inutilisable.

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
