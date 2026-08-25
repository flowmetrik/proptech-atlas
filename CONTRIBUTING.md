# Contributing

No account to create, because there is no account system. Everything is a file in a public
repository, and every change is a pull request anyone can read.

## Setup

```bash
git clone https://github.com/flowmetrik/proptech-atlas
cd proptech-atlas
npm install
npm run data:validate
```

Node 22. There is no database to seed and no service to run.

## Adding a product

```bash
cp data/tools/_template.yaml data/tools/my-product.yaml
$EDITOR data/tools/my-product.yaml
npm run data:validate
```

The file name must equal the `slug`. The validator will tell you precisely what is missing —
it runs on every pull request and blocks the merge if it fails.

Read [`data/SCHEMA.md`](data/SCHEMA.md) for the full field contract.

## What is in scope

**In:** software and platforms used by real estate professionals, plus the portals,
marketplaces and data providers the industry depends on.

**Out:** brokerages and asset managers — firms that transact or manage on someone's behalf.
This is a catalogue of products, not of service companies. A firm that also publishes a
product may appear for the product.

## What makes a good fiche

- **Write `real_estate_use` like you are briefing a colleague.** Concrete situation, real
  workflow, the reason someone actually buys it. This is the field the project exists for, and
  the one that makes the dataset useful to a model rather than decorative.
- **Features are nouns, not adjectives.** "Trust accounting with per-property ledgers", not
  "powerful and intuitive".
- **Do not copy the vendor's homepage.** Paraphrase. Say what the product *is*; the claim goes
  in `positioning`.
- **One primary category.** If it genuinely spans more, use `also_in`.
- **Leave a field out rather than guessing.** Especially prices, which move. A missing field is
  a known gap; a wrong one is damage.
- **Name the sources.** At minimum the vendor's own site. More is better.

## Recording a verified review

This is the contribution with the strictest rule, and the one that protects everything else.

You are **not** writing a testimonial. You are reporting an aggregate that is publicly visible
today, with the URL and the date you read it.

```yaml
reviews:
  - source: G2
    url: https://www.g2.com/products/example/reviews
    rating: 4.4
    scale: 5
    count: 812
    sampled_on: 2026-08-25
```

**A pull request that adds a rating without a source URL and a sampling date will be rejected.**
Not as a formality: an unsourced number is indistinguishable from an invented one, and the
whole value of this dataset is that a machine can trust it.

The site never averages across incompatible sources, and never displays a score the project
computed itself.

## Verifying an existing fiche

Entries seeded at launch are `verification.status: unverified` — written from public knowledge
of the market, not yet re-checked. Promoting one to `verified` means:

1. Open the sources listed and the vendor's current site.
2. Correct whatever has changed — acquisitions, renames, discontinued modules, new markets.
3. Set `status: verified`, `checked_on` to today, `checked_by` to your GitHub handle.
4. Update `updated`.

This is the single most useful contribution to the project.

## If you are a vendor

You are welcome to submit and correct your own entry — please say so in the pull request
description. What you cannot do:

- remove or disparage a competitor;
- add a rating, a testimonial or a claim without a citable source;
- rewrite the description into marketing copy.

If you think an entry is unfair, open an issue. It will be marked `disputed` on the site while
it is looked at, in public.

## Adding a category

Categories live in `data/taxonomy.yaml` and are deliberately organised by **the job to be done
in real estate**, not by vendor marketing categories. Before adding one, check that the need is
not already covered by an existing category plus `also_in`. Open an issue first if it is a
judgement call — the taxonomy is the opinionated part of this project and churn in it is costly
for everyone consuming the API.

## Style

- Product descriptions in **English** — the catalogue is the interoperability layer.
- Repository documentation and code comments in **French**.
- No em dashes used as decoration; no superlatives; no "leading" or "innovative".

## Licence of contributions

By contributing you agree that data contributions are released under
[CC BY 4.0](LICENSE-DATA) and code contributions under [MIT](LICENSE).
