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
- **Cinq outils sans logo** au 08/09 (contre huit la veille) : `diag-pilote`,
  `engrain`, `listhub`, `poliris`, `urbanease`. `listhub` et `urbanease` sont
  des SPA sans balisage lisible côté serveur — hors de portée de `logos.mjs`
  sans navigateur headless. Les trois autres sont des refus humains motivés
  dans `data/logos-refuses.json` (voir l'entrée « fait » du 08/09 : deux
  pièges différents, un rendu cassé et un logo blanc pour fond sombre).
- **`logos.mjs` sait maintenant lire l'attribut `alt` et la classe d'un
  `<img>`** (fait le 08/09) — voir l'entrée « fait » ci-dessous. Le cas
  `poliris` reste entier : son domaine propre ne résout plus, il n'y a pas
  d'`<img>` à lire nulle part.
- **`verify.mjs` ne voit toujours pas un produit homonyme.** Le contrôle de
  domaine reconverti, posé le 02/09, ne couvre que le cas du domaine mort. Reste
  celui du **nom qui désigne autre chose** : `siana.ai` a été vérifié « oui » le
  02/09 pour la SIANA proptech française, alors que ce domaine appartient à Siana
  ApS, un danois de la maintenance prédictive industrielle. Le site répond, le
  nom figure sur l'accueil, et le produit n'a rien à voir. Il n'y a pas de
  contrôle exécutable évident — c'est la catégorie et le marché déclarés du
  candidat qu'il faudrait confronter au contenu, ce qui coûte un appel de modèle.
  À défaut, le geste humain reste obligatoire : lire l'accueil avant d'écrire.
- **Les avis restent à zéro.** G2, Capterra et Trustpilot renvoient `403`. Deux
  issues possibles : une clé d'API payante chez l'un d'eux, ou des contributions
  humaines sourcées. Ne jamais résoudre ce point en inventant.

## Ouvert — couverture

- **Catégories creuses**, à traiter par une source ciblée plutôt que par une
  ronde généraliste. Relevé au 08/09, en US/FR/total : `lending-mortgage`
  3/3/6, `listing-syndication` 3/5/8, `short-term-rental` 7/7/8,
  `visuals-tours` 7/7/11. `ai-assistants` FR est passé de 3 à 4 fiches
  françaises (10 côté américain) avec l'ajout de `zefir` ; `flex-coworking`
  FR de 8 à 9 avec `m-work`. Les deux restent les trous les plus nets. Les
  chiffres de ce carnet vieillissent vite : les recompter avant de choisir,
  pas les lire.

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
  n'a jamais été vue. 28 sources sur 46 ont été vues au moins une fois au 08/09
  (`mysweetimmo`, `propmodo` et `github-proptech` ajoutées ce jour-là) ; 18
  restent entièrement vierges, surtout côté `vc`, `launch` et `public`.
- **Les sources `association` ne rendent quasiment rien, des deux côtés de
  l'Atlantique — mais les neuf sont désormais balayées au moins une fois** (la
  dernière quatrine le 07/09 : `snpi-partenaires`, `plurience`, `nar-partners`,
  `irem-boma`). Le mécanisme reste celui identifié le 29/08 : les fédérations
  ont déplacé leur annuaire fournisseurs derrière une adhésion, ou ne publient
  qu'une page de marque blanche sans lister de tiers. Deux buts atteints quand
  même : `nar-partners` (la page « REALTOR Benefits ») a rendu `sentrilock`, et
  `plurience.com` ne résout plus du tout (timeout DNS) — à vérifier de nouveau
  dans quelques semaines avant de la retirer du registre. Il reste à décider,
  pour les six sources vraiment muettes, si on les retire ou si on cherche une
  URL de remplacement.
- **`syndic-copro` a maintenant une base américaine réelle** (7 fiches :
  `buildium`, `cinc-systems`, `clickpay`, `condo-control`, `frontsteps`,
  `payhoa`, `vantaca`) — l'entrée précédente de ce carnet, qui annonçait zéro,
  datait et n'avait pas été recomptée avant d'être répétée. Le trou véritable
  qui reste est `ai-assistants` côté français (3 fiches contre 10 côté
  américain).

## Ouvert — site et données

- **Comparaison deux à deux.** Une page « X vs Y » pour les paires réellement
  concurrentes. Fort en référencement, mais **risque de contenu creux** : à ne
  faire que si la page dit ce qui sépare vraiment les deux produits.
- **Un flux des nouveautés.** `/api/changes.json` : ce qui a été ajouté ou
  modifié depuis N jours, pour qu'un consommateur de l'API n'ait pas à tout
  retélécharger. Piège identifié le 07/09 avant de s'y lancer : la source la
  plus naturelle est l'historique git (`git log --name-status` sur
  `data/tools/`), mais les trois workflows utilisent `actions/checkout@v4` sans
  `fetch-depth: 0` — en CI, chaque fichier verrait un historique d'un seul
  commit et daterait comme « ajouté aujourd'hui ». Un artefact qui se
  régénère différemment en CI qu'en local casse le contrôle de fraîcheur
  exactement comme le 30/08 (voir plus bas) : poser `fetch-depth: 0` sur les
  trois workflows est un préalable, pas un détail, avant d'écrire ce script.
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

- **2026-09-09** — Cinq fiches ajoutées par recherche propre (sans OpenRouter),
  ciblées sur les catégories les plus creuses (`lending-mortgage`, thinnest du
  catalogue à 6 fiches, et `listing-syndication`, `diagnostics-compliance`) :
  `gestion-diag` (FR, CRM et facturation pour diagnostiqueurs immobiliers),
  `kiilt-pro` et `eliob` (FR, deux CRM de courtage en crédit — Kiilt publie un
  tarif à 46,75 €/mois/utilisateur, ELIOB non), `lendingpad` (US, LOS —
  système d'origination de prêt hypothécaire — pour prêteurs, courtiers et
  banques) et `diffuze` (FR, multidiffusion d'annonces à l'usage, sans
  abonnement, sur 50+ portails). Aucun salon du registre n'avait son édition
  qui vient de se tenir (Blueprint Vegas : 22–24/09/2026 ; SIMI : 8–10/12/2026 ;
  MIPIM : passé en mars) : recherche ciblée par catégorie creuse à la place,
  en français pour les quatre candidats FR. `capterra-fr`, `g2-categories` et
  `getapp-softwareadvice` — jamais balayées — confirment le blocage `403`
  déjà documenté pour ce type de source et sont marquées vues (`mark-swept.mjs`)
  pour ne plus revenir en tête de rotation. `dtimmo` (déjà écarté le 04/09,
  site figé depuis 2014) et `ipret.fr` (domaine qui ne résout plus — la
  faute est dans le résultat de recherche, pas dans le produit) écartés sans
  écrire de fiche.

  **Trois nouveaux logos récupérés par `logos.mjs` étaient faux, tous trois
  relus à l'œil avant commit** — aucun n'était vide ni un aplat, donc aucun
  contrôle automatique ne les aurait attrapés :
  - `kiilt-pro` avait adopté le badge du label partenaire **France FinTech**
    affiché sur la page d'accueil — un logo bien formé, juste celui du mauvais
    éditeur.
  - `eliob` avait adopté une variante SVG « pour fond sombre » dont le rendu
    local coupe le mot « ELIOB » et ne laisse que le pictogramme et le
    suffixe « .fr » — même famille que le piège `fill="white"` déjà rencontré
    le 08/09, mais ici la perte vient du cadrage, pas de la couleur.
  - `gestion-diag` avait adopté une tête de renard — un picto/mascotte carré,
    pas le logo du site. Le vrai logo d'en-tête (`alt="gestion diag logo
    noir"`) a été récupéré et posé à la main, normalisé au même gabarit
    256×256 que `normalise()`.
  Les trois faux sont dans `data/logos-refuses.json` avec leur URL et le motif
  exact. **À retenir, troisième variante du même piège en deux jours** : un
  candidat qui passe la forme (ni vide, ni minuscule, ni un aplat uni) peut
  quand même être le logo de quelqu'un d'autre, une version tronquée, ou une
  mascotte plutôt que la marque — `candidates()` ne sait toujours pas
  distinguer ces cas, seule la relecture humaine les attrape.

- **2026-09-08** — Cinq fiches ajoutées par recherche propre (sans OpenRouter) :
  `zefir` (FR, plateforme de vente collective avec ZIA, un assistant IA
  conversationnel — comble un point de la catégorie `ai-assistants` FR,
  la plus fine du catalogue), `m-work` (FR, gestion du flex-office et du
  travail hybride — `flex-coworking` FR), `copromatic`, `comptacop` et
  `copriciel` (FR, trois logiciels de comptabilité de copropriété pour
  syndics bénévoles, dormaient déjà vérifiés dans `data/candidates.json`
  depuis le 25/08). Trouvés via `mysweetimmo` (Zefir) et une recherche ciblée
  sur `flex-coworking` FR (m-work) ; les trois syndic-copro venaient de la
  file. Un candidat écarté après lecture, pas au vérificateur : **`Condo`**
  (`open-condo-platform` sur GitHub, trouvé via `github-proptech`) passe
  `verify.mjs` sans réserve — le site répond, le nom figure dessus — mais
  son éditeur, Doma.ai, est basé à Iekaterinbourg et sert le marché russe :
  hors du périmètre US/FR de ce catalogue. Déplacé en `rejected` avec le
  motif exact plutôt que laissé à traîner. `propmodo` balayée sans
  trouvaille retenue (produits déjà connus ou hors périmètre — agences,
  levées de fonds).

- **2026-09-08** — Suite du signal suggéré le 07/09 : `candidates()` de
  `logos.mjs` lit maintenant les `<img>` du HTML, pas seulement les `<link
  rel=icon>` et l'`og:image`. Un `alt` qui contient le nom du produit ou une
  `class`/`src` qui contient « logo » passe devant l'apple-touch-icon. Testé
  sur les six logos jusque-là refusés à la relecture (`clickpay`, `diag-pilote`,
  `engrain`, `poliris`, `scoplan`, `vendorpm`) : trois vrais logos récupérés et
  vérifiés à l'œil (`clickpay`, `scoplan`, `vendorpm` — 227 → 230), et deux
  pièges distincts trouvés en chemin, tous deux relus avant d'écrire quoi que
  ce soit :
  - **Un rendu cassé, pas un aplat.** Le SVG `<img class="nav_logo"
    alt="Engrain">` d'Engrain se rendait en un seul rectangle uni via le coder
    MSVG intégré à l'ImageMagick 6 des dépôts Ubuntu (build `--without-rsvg`) —
    passait sous le seuil de taille et sous le contrôle `isBlank()` du 01/09.
    `rsvg-convert` installé sur cette VM (`sudo apt-get install
    librsvg2-bin` — absent malgré `librsvg2-common` déjà présent, ce sont deux
    paquets différents) : `normalise()` le préfère maintenant pour tout SVG
    quand il est sur le PATH, avec repli silencieux sur MSVG s'il est absent
    ou échoue. **Mais le SVG d'Engrain se rend correctement une fois passé par
    `rsvg-convert` — et c'est là qu'il devient visible qu'il est blanc :**
    chaque tracé porte `fill="white"`, la version pour barre de navigation
    sombre. 248 couleurs après rognage, donc indétectable par `isBlank()` ;
    invisible seulement à l'œil, sur fond blanc. Repassé en refusé avec ce
    motif exact — voir les instructions globales de Mehdi sur ce piège précis,
    déjà rencontré une fois sur un logo client.
  - **`diag-pilote/images/picto.svg`** (candidat par `class`, pas par `alt`) se
    rend en un simple rond jaune plein : le SVG a d'autres tracés, mais MSVG ne
    les rend pas, et `rsvg-convert` ne change rien pour ce fichier précis — le
    problème est dans le SVG lui-même (peut-être un usage de `<use>` ou de
    dégradés que ni l'un ni l'autre ne résout), pas dans le moteur de rendu.
    Resté refusé.
  Fichier changé : `scripts/enrich/logos.mjs` (candidats `<img>`, préférence
  `rsvg-convert`) et `data/logos-refuses.json` (motifs à jour, `engrain`
  déplacé du silence vers un refus documenté). À retenir : un candidat qui
  passe tous les contrôles automatiques — ni vide, ni minuscule, ni un aplat —
  peut quand même être le mauvais logo. La relecture à l'œil de chaque image
  récupérée reste obligatoire, pas seulement recommandée.

- **2026-09-07** — La file `data/candidates.json` accumulait des candidats déjà
  catalogués sous un autre nom, sans jamais être nettoyée : `fiche.mjs --from`
  n'y touchait pas du tout, et le mode file ne retire que les slugs qu'il vient
  lui-même de traiter. Trouvé en préparant cette passe : `scoplan`,
  `decisio-habitat`, `dematimmo` et `property-hub` traînaient dans la file avec
  le slug ET le site EXACTEMENT identiques à une fiche déjà écrite le 05/09 —
  et `leon` (jamais consommé) pointait vers `https://www.scepia.fr/leon`, la
  même URL exacte que `leon-scepia.yaml`. Une prochaine passe aurait pu les
  rédiger une seconde fois, en payant un appel de modèle pour ça. Nouvelle
  fonction `pruneQueueAgainstCatalog()` dans `fiche.mjs`, appelée à chaque
  invocation (`--from` compris, juste après l'écriture) : elle retire de la
  file tout candidat dont le slug OU le domaine correspond déjà à une fiche du
  catalogue. Cinq entrées purgées dès le premier passage. À l'occasion, un
  candidat encore plus intéressant est apparu : `rethink-crm`
  (`rethinkcrm.com`) restait en file depuis avant le contrôle de domaine
  reconverti du 02/09 — le domaine sert aujourd'hui un site de paris en ligne
  (UFABET). Il a été déplacé en `rejected` avec le motif exact ; le produit vit
  bien au catalogue, sous `rethink-by-buildout` et son domaine actuel
  `buildout.com`. À retenir : la purge par domaine ne remplace pas le contrôle
  de domaine reconverti — elle referme la file, il referme le web.
- **2026-09-07** — Six fiches ajoutées par recherche propre (sans OpenRouter) :
  `protexa` (FR, registres de mandats loi Hoguet), `sentrilock` (US, boîte à
  clés électronique et gestion des visites, propriété de la NAR), `livly` (US,
  app résident et hub gestionnaire pour le multifamilial), `foxen` (US,
  plateforme de conformité assurance-locataire et reporting de loyer),
  `coprolib'` (FR, comptabilité de copropriété pour syndics bénévoles, avec
  accompagnement professionnel en option) et `diacamma` (FR, suite libre et
  gratuite de comptabilité associative et de copropriété — la première fiche
  du catalogue explicitement `open_source: true` dans cette catégorie). Trouvés
  via `entrata-marketplace` (Livly, Foxen), `nar-partners` (SentriLock) et
  `laboiteimmo-partenaires` (Protexa) ; Coprolib' et Diacamma dormaient déjà
  vérifiés dans la file. Deux candidats de la même chasse écartés : `Interkab
  Connect` et `Deep Flow Realty` n'ont plus de site propre hors de celui de
  leur repreneur (La Boîte Immo/Hektor) ; `Previsite` (éditeur de `Smartpix`)
  et `Properstar` étaient déjà en file ou injoignables au vérificateur.
- **2026-09-07** — Les neuf sources `association` du registre sont désormais
  balayées au moins une fois (`snpi-partenaires`, `plurience`, `nar-partners`,
  `irem-boma` ce jour ; les cinq autres l'étaient déjà). Rendement quasi nul
  comme prévu, sauf `nar-partners` (SentriLock) — mais la mesure elle-même
  fait avancer le projet : elle dit que ce type de source est structurellement
  pauvre plutôt que de laisser planer le doute. `entrata-marketplace` et
  `zapier-real-estate` balayées pour la première fois : la première a rendu
  Livly et Foxen, la seconde renvoie un 404 sur l'URL du registre — le site
  Zapier a retiré ses pages de catégorie d'annuaire, aucune URL de
  remplacement équivalente trouvée. `housingwire-tech` avait le même problème
  (`/tech/` en 404) ; corrigée vers `/technology/`, qui répond mais bloque la
  lecture automatisée (403) — contenu non lu cette passe, à retenter avec un
  autre outil.
- **2026-09-05** — `fiche.mjs --from` acceptait `pricing.from/currency/unit`
  (documentés dans `data/SCHEMA.md`) mais `toYaml()` ne rendait que `model`,
  `public_pricing` et `url` : les trois champs disparaissaient du YAML en
  silence, sans erreur ni avertissement. Rencontré le 04/09 en écrivant la
  fiche `danim`, dont le site publie un vrai tarif public. Corrigé en trois
  lignes dans `toYaml()` (bloc `pricing:`), sur le modèle de la condition déjà
  en place pour `url`. Vérifié par une fiche jetable passée par `--from` avec
  les trois champs renseignés, YAML relu à l'œil, puis retirée — le dépôt n'a
  pas de test unitaire pour `toYaml()` (elle vit dans un script à effets de
  bord, pas dans `lib.mjs`), donc rien ne protège cette fonction d'une
  régression future ; l'extraire serait le prochain geste si `pricing.from`
  se remet à servir.

- **2026-09-04** — `data/sweeps.json` ne connaissait que les passes
  automatiques : seul `sweep.mjs` y écrivait, donc une source balayée à la main
  par un agent qui cherche lui-même — la voie recommandée depuis que la
  découverte par modèle coûte — restait « jamais vue » pour toujours. Deux
  conséquences fausses : le rendement mesuré ne parlait que de la moitié du
  travail, et la prochaine passe (automatique ou manuelle) re-choisissait en
  priorité une source qui venait d'être regardée. Nouveau script
  `scripts/enrich/mark-swept.mjs` — aucun appel réseau ni LLM, juste une date et
  un compte — qui écrit des champs distincts (`last_swept_manual`,
  `manual_runs`, `manual_found`, `manual_kept`), jamais mélangés aux champs
  automatiques. `sweep.mjs` calcule maintenant `lastSwept()` comme la plus
  récente des deux dates pour la rotation par cooldown. `references/agent-workflow.md`
  documente le geste à l'étape 5. Volontairement pas de champ rempli à la main
  dans `data/sources.yaml` : la mesure reste une mesure, écrite par un script,
  jamais une déclaration.

- **2026-09-03** — Le dépôt n'avait pas de harnais de test :
  `scripts/enrich/traces.test.mjs`, écrit le 02/09, était le seul fichier de
  test du projet et se lançait à la main. `scripts/test.mjs` rassemble
  maintenant tous les `*.test.mjs` du dépôt, les lance chacun dans un process
  séparé, et sort en échec si un seul l'est. `npm test` l'appelle ; la CI le
  lance juste après `data:validate`. Un test ajouté demain protège la CI sans
  qu'on ait à s'en souvenir.

- **2026-09-02** — `verify.mjs` sait maintenant dire qu'un domaine a peut-être
  changé de métier. Il ne le refuse pas — un produit peut légitimement n'avoir ni
  tarif public ni espace client — mais il **avertit** quand la navigation de
  l'accueil ne porte **aucune** des trois traces qu'un éditeur laisse toujours :
  tarifs, fonctionnalités, connexion. Deux choses ont coûté plus cher que le
  contrôle lui-même, et les deux se sont vues à la mesure, pas à la lecture :
  le premier jet lisait les éléments `<a>…</a>` entiers, ce qui perd tout menu
  dont un item dépasse 300 caractères — il alertait sur `nexudus` et `essensys`,
  deux produits vivants, et laissait passer `cowork.io` ; et le mot « prix » dans
  le **titre d'un billet de blog** suffisait à faire croire à une page tarifs, si
  bien que le cas pour lequel le contrôle avait été écrit y échappait. D'où deux
  règles : on lit les `href` et les libellés, jamais le corps de la page ; et les
  URL éditoriales (billets datés, rubriques, étiquettes) sortent du foin avant la
  recherche. Troisième précaution, la plus importante : une page qui ne permet
  pas d'en juger — moins de cinq liens, coquille rendue en JavaScript comme celle
  de Zumper — rend `null` et **n'alerte pas**. Le seuil de richesse se mesure
  avant le tri éditorial, sinon un blog fourni échapperait au contrôle par le
  nombre même de ses billets. Passé sur les 202 sites du catalogue : 4 alertes
  sur 175 sites jugeables (`apimo`, `bien-ici`, `dvf`, `immopad` — tous des
  produits réels, dont la navigation tient dans du JavaScript), et `cowork.io`
  attrapé. `scripts/enrich/traces.test.mjs` fige les trois formes hors ligne.

- **2026-09-02** — Un refus de logo laissait la fiche cassée. `logos.mjs`
  supprimait bien le PNG d'un slug inscrit dans `data/logos-refuses.json`, mais
  gardait le bloc `logo:` de la fiche, qui pointait alors sur un fichier absent.
  Le validateur le voyait — donc le catalogue entier refusait de passer, et un
  jugement humain parfaitement légitime se lisait comme une panne. Vu en refusant
  le logo de `diag-pilote`, dont la meilleure image candidate était l'image de
  partage Open Graph, une bannière avec accroche et capture d'écran. Corrigé par
  `dropBlock()`, jumeau de `upsertBlock()` : le bloc part avec le fichier, le
  reste de la fiche est intact. À retenir : un geste de retrait doit être aussi
  complet que le geste d'ajout qu'il défait.

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
