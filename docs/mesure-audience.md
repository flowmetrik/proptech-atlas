# La mesure d'audience

Ce que le site mesure, pourquoi, et comment l'activer ou l'éteindre.

## Ce qu'on cherche à savoir

Une seule question, et elle est utile : **quelles parties du catalogue sont
réellement lues.** C'est ce qui dit où porter l'effort suivant — quelle
catégorie mérite d'être creusée, quel marché attire, quelles fiches on peut
laisser dormir.

Rien d'autre n'est cherché : pas de profil, pas de parcours nominatif, pas de
retargeting, pas de segment à revendre. Il n'y a ni compte, ni formulaire, ni
CRM derrière ce site.

## Comment c'est branché

**Google Analytics 4**, dans `src/components/Analytics.astro` — une vingtaine de
lignes, lisibles d'un coup d'œil. Trois propriétés du montage :

**L'identifiant vient de l'environnement.** `PUBLIC_GA4_ID`. Sans lui, le
composant ne rend **rien** : pas de script, pas de bandeau, pas une ligne de
mesure dans le HTML. Un `npm run dev`, un build local, un fork par quelqu'un
d'autre ne mesurent personne. Ça se vérifie :

```bash
npm run build && grep -c googletagmanager dist/index.html   # → 0
PUBLIC_GA4_ID=G-XXXXXXXXXX npm run build && grep -c googletagmanager dist/index.html   # → 1
```

**Le consentement démarre à `denied`, pour toutes les catégories.** Le mode
consentement v2 est posé *avant* le chargement de gtag — sinon la première
mesure partirait avant que le refus soit connu. Aucun cookie n'est écrit tant
que le visiteur n'a pas cliqué. Les catégories publicitaires
(`ad_storage`, `ad_user_data`, `ad_personalization`) restent à `denied` en dur
et ne sont jamais proposées : ce site ne fait pas de publicité.

**Le refus est aussi accessible que l'accord**, et il est mémorisé dans
`localStorage` sous `pa-consent`. Un bandeau qui revient à chaque page, ou qui
cache le bouton « refuser », est un bandeau qui force la main.

## Activer, changer, éteindre

Tout se règle par des **variables de dépôt** — Settings → Secrets and variables
→ Actions → Variables. Aucune modification de code.

| Variable | Effet |
|---|---|
| `GA4_MEASUREMENT_ID` | `G-XXXXXXXXXX` active la mesure. Absente : aucune mesure. |
| `CUSTOM_DOMAIN` | `atlas.flowmetrik.com` sert le site sous ce domaine. Absente : `flowmetrik.github.io/proptech-atlas`. |

L'identifiant GA4 est une **variable, pas un secret** : il apparaît dans le
source de chaque page, le cacher n'aurait aucun sens — et le mettre en secret le
rendrait invisible dans les logs de build, donc plus difficile à vérifier.

Éteindre la mesure, c'est supprimer la variable et relancer le déploiement. Le
site repart sans une ligne de script tiers.

## Obtenir l'identifiant

Dans [analytics.google.com](https://analytics.google.com) : Admin → Data streams
→ Add stream → Web, avec l'URL du site. L'identifiant `G-…` s'affiche en haut à
droite de la fiche du flux. Le coller dans la variable de dépôt, pousser sur
`main` — le déploiement suivant l'embarque.

## Ce qu'un lecteur français doit savoir

La CNIL exempte de consentement la mesure d'audience **strictement nécessaire**,
sous conditions précises. **Google Analytics n'entre pas dans cette exemption** :
transferts hors UE, finalités trop larges, croisements possibles. C'est pour ça
que ce site **demande** au lieu de supposer, et que le défaut est le refus.

Une alternative sans cookie — Plausible, ou un Matomo auto-hébergé configuré aux
critères d'exemption — supprimerait le bandeau et mesurerait davantage, puisque
plus personne ne refuse. C'est une question ouverte du projet, pas un choix
arrêté : le montage actuel est celui qui demande le moins de confiance de la
part du visiteur, pas celui qui mesure le mieux.

## Ce que la mesure ne doit jamais faire dériver

Le catalogue ne classe pas et ne recommande pas. Savoir qu'une fiche est
beaucoup lue **ne doit pas** la faire remonter dans une liste, ni justifier de
mettre en avant un éditeur. La mesure sert à décider où **travailler**, jamais à
décider ce que le lecteur voit. Le jour où l'audience influence l'ordre
d'affichage, ce catalogue devient un annuaire publicitaire comme les autres.
