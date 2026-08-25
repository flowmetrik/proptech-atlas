---
title: "France, États-Unis : deux marchés du logiciel immobilier qui ne se ressemblent pas"
description: "La MLS, le syndic, la carte professionnelle, la loi de 1965 : pourquoi le catalogue américain et le catalogue français ne se recouvrent presque pas — et ce que ça change pour qui choisit un outil."
date: 2026-08-25
lang: fr
author: Flowmetrik
tags: [marché, france, états-unis]
---

En construisant ce catalogue, une chose saute aux yeux avant toutes les autres : les deux
marchés partagent le vocabulaire — CRM, gestion locative, estimation — et presque aucun
produit. Ce n'est pas un retard d'adoption d'un côté ou de l'autre. Ce sont deux
infrastructures juridiques différentes, et le logiciel épouse l'infrastructure.

## Ce que la MLS structure, et ce que la France n'a pas

Aux États-Unis, le *Multiple Listing Service* est le point de gravité. C'est une base
coopérative, locale, alimentée par obligation par les agents membres, et redistribuée par flux
aux portails et aux sites d'agence. Presque tout l'écosystème logiciel américain se branche
dessus : le site IDX affiche le flux, le CRM enrichit un contact avec l'historique de recherche
sur ce flux, l'outil d'estimation calcule ses comparables à partir des ventes déclarées dans ce
flux, le logiciel de transaction pré-remplit le contrat avec les champs du flux.

La France n'a pas d'équivalent. Les annonces vivent chez des portails commerciaux concurrents
— SeLoger, Leboncoin, Bien'ici, Logic-Immo — et la diffusion multi-portails est devenue un
métier à part entière, dont Ubiflow est l'exemple. Les comparables ne viennent pas d'une
coopérative professionnelle mais de l'État, via les DVF, ou de bases construites par des
éditeurs comme Yanport. Conséquence directe : là où un éditeur américain construit sur un socle
de données commun, un éditeur français construit d'abord son accès aux données.

## Le syndic, un métier sans traduction

La catégorie qui n'existe tout simplement pas dans le catalogue américain, c'est le syndic de
copropriété. La loi du 10 juillet 1965 impose un mandat, une assemblée générale annuelle, un
budget prévisionnel voté, des appels de fonds trimestriels, un fonds travaux, une comptabilité
en partie double par copropriété. Rien de tout cela n'est un paramètre d'un logiciel de
*property management* américain : la *HOA* américaine a ses règles, mais ce sont d'autres
règles.

C'est pour cette raison que le segment français a ses propres éditeurs — les historiques comme
Crypto ou Gercop chez Septeo, les acteurs SaaS comme Vilogi, et une vague de syndics
technologiques comme Matera ou Bellman qui vendent le service et l'outil ensemble. Aucun d'eux
n'a d'homologue direct de l'autre côté de l'Atlantique.

## L'agent américain achète du lead, l'agent français achète de la diffusion

La différence se lit dans le modèle économique des produits. Le premier poste logiciel d'une
équipe américaine est souvent l'acquisition : Zillow Premier Agent, Realtor.com Connections,
un CRM qui existe pour que ces leads ne meurent pas dans une boîte mail. Le vocabulaire des
éditeurs le dit — *speed to lead*, *ISA*, *lead routing*.

En France, le premier poste est la présence sur les portails et le logiciel de transaction qui
alimente cette présence, plus la pige : identifier l'annonce de particulier avant le
concurrent. D'où une catégorie entière — la pige et la prospection foncière — dont l'analogue
américain est beaucoup plus marginal.

## Où les deux marchés se rejoignent

Trois zones se recouvrent réellement, et ce sont celles où les mêmes éditeurs sont présents des
deux côtés :

- **L'immobilier tertiaire institutionnel.** Un fonds qui détient des bureaux à Paris et à
  Chicago veut un seul référentiel de baux : Yardi, MRI et les outils d'*asset management*
  traversent la frontière sans difficulté.
- **L'énergie et l'ESG.** La contrainte est réglementaire des deux côtés — décret tertiaire et
  taxonomie européenne ici, *benchmarking ordinances* et reporting investisseur là-bas — et les
  produits se ressemblent. Deepki en est l'exemple français à portée internationale.
- **La location courte durée.** Airbnb et Booking étant mondiaux, les *channel managers* le
  sont aussi.

## Ce que ça implique quand on choisit un outil

Une recommandation logicielle en immobilier qui ne précise pas le pays est, au mieux,
incomplète. C'est la raison pour laquelle le marché est un champ de premier ordre dans ce
catalogue, et pas une étiquette secondaire : `markets: [FR]` et `markets: [US]` séparent deux
familles de produits qui répondent à des obligations différentes, même quand elles portent le
même nom de catégorie.

Et c'est aussi pourquoi la moitié française de ce catalogue a autant de valeur que la moitié
américaine, alors qu'elle est bien moins documentée en ligne. Les éditeurs français écrivent
peu en anglais, se référencent mal, et sont donc presque invisibles pour un modèle de langage.
Les rendre lisibles par une machine était une des raisons de commencer ce projet.
