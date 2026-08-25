# Le schéma d'une fiche produit

Une fiche = un fichier `data/tools/<slug>.yaml`. Un fichier par outil : deux
contributions simultanées ne se marchent jamais dessus dans une pull request.

`npm run data:validate` refuse un fichier qui s'écarte de ce qui suit. C'est le
seul gardien : il n'y a pas de base de données, pas d'admin, pas de login.

## Champs

| Champ | Obligatoire | Forme | Remarque |
|---|---|---|---|
| `slug` | oui | kebab-case | doit égaler le nom du fichier |
| `name` | oui | texte | nom commercial exact |
| `editor` | oui | texte | société éditrice |
| `website` | oui | URL https | page produit officielle |
| `hq_country` | oui | ISO 3166-1 alpha-2 | siège de l'éditeur |
| `markets` | oui | `[US]`, `[FR]` ou les deux | marchés réellement servis |
| `category` | oui | id de `taxonomy.yaml` | la catégorie **principale**, une seule |
| `also_in` | non | ids de catégories | usages secondaires |
| `positioning` | oui | ≤ 200 car., une phrase | ce que le produit revendique |
| `description` | oui | paragraphe | ce que le produit est, factuellement |
| `real_estate_use` | oui | paragraphe | **l'usage métier en immobilier** — le champ qui justifie ce projet |
| `features` | oui | ≥ 3 items | fonctionnalités nommées, pas des adjectifs |
| `use_cases` | oui | ≥ 1 `{persona, job}` | `persona` ∈ taxonomie, `job` = tâche réelle |
| `personas` | oui | ids | à qui ça s'adresse |
| `segments` | oui | ids | classes d'actifs couvertes |
| `company_sizes` | oui | ids | taille de structure visée |
| `pricing` | oui | `{model, public_pricing, from?, currency?, unit?, url?}` | `model` ∈ taxonomie |
| `integrations` | non | liste de textes | connexions notables |
| `ai` | non | `{capabilities: [...]}` | ce que le produit fait réellement avec de l'IA |
| `product` | non | `{api, open_source, mobile, languages, hosting}` | métadonnées produit |
| `founded` | non | année | seulement si sûr |
| `alternatives` | non | slugs | concurrents directs présents au catalogue |
| `reviews` | oui | liste, souvent vide | **agrégats externes uniquement** — voir plus bas |
| `sources` | oui | ≥ 1 `{url, note}` | d'où vient l'information |
| `verification` | oui | `{status, checked_on, checked_by}` | `unverified` par défaut |
| `updated` | oui | `YYYY-MM-DD` | dernière modification de la fiche |

## La règle sur les avis

**On n'invente jamais un avis, une note ou un nombre d'avis.** Un `reviews[]`
vide est une information juste ; une note plausible est un faux.

Un item d'avis n'est donc pas un témoignage rédigé ici : c'est le **report d'un
agrégat public**, avec sa source et sa date de relevé.

```yaml
reviews:
  - source: G2                 # G2 | Capterra | TrustRadius | Trustpilot | Google
    url: https://…             # la page exacte relevée
    rating: 4.4                # tel qu'affiché ce jour-là
    scale: 5
    count: 812
    sampled_on: 2026-08-25
```

Le site affiche « aucun avis vérifié » tant que la liste est vide, et ne calcule
jamais de moyenne à partir de sources hétérogènes.

## Le cycle de vérification

Les fiches initiales sont en `verification.status: unverified`. Elles ont été
rédigées à partir de la connaissance publique du marché, puis doivent être
recoupées avec le site de l'éditeur. Passer une fiche en `verified` demande
d'ouvrir les sources, de corriger ce qui a bougé, et de dater le contrôle.

| Statut | Sens |
|---|---|
| `unverified` | rédigée, non recoupée — l'état initial |
| `verified` | recoupée avec les sources à la date indiquée |
| `stale` | vérifiée il y a plus de 12 mois, à re-contrôler |
| `disputed` | contestée par l'éditeur ou un contributeur, arbitrage en cours |
