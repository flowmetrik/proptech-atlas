<div align="center">

# PropTech Atlas

**An open Product Knowledge Graph of real estate software — United States &amp; France.**

155 products · 24 categories · one YAML file each · no account, no tracking, no paid placement

[Browse the site](https://flowmetrik.github.io/proptech-atlas) ·
[Catalogue on GitHub](CATALOG.md) ·
[JSON API](https://flowmetrik.github.io/proptech-atlas/api/tools.json) ·
[Contribute](CONTRIBUTING.md)

</div>

---

## Why this exists

Choosing real estate software is unusually hard, and getting an AI to help is worse.

The market is fragmented by **country** and by **trade**. A tool that is the obvious answer for
a US multifamily operator is irrelevant to a French *syndic de copropriété* — and neither
appears in the other's search results. Vendor comparison pages are marketing. Review sites
optimise for lead generation.

Meanwhile, language models have become a distribution channel for software. They answer from
whatever text they can find: marketing copy, affiliate listicles, forum threads of unknown
vintage. Ask one which tool a French condominium manager should use for calls for funds and it
will confidently name an American platform that does not handle French co-ownership law at all.

That is a data problem, not a reasoning problem. This repository is an attempt at the data.

## What a fiche contains

Every product is described along the same axes, and the axes are linked — that is what makes
this a graph rather than a directory.

| | |
|---|---|
| **Description &amp; positioning** | What the product is, kept separate from what it claims |
| **Features &amp; use cases** | Named capabilities, plus the job each persona hires it to do |
| **Customers &amp; segments** | Trade, asset class, company size, market |
| **Verified reviews** | Dated aggregates from public platforms, with the URL sampled |
| **Product metadata** | Pricing model, integrations, API, mobile, open source, HQ, founding year |
| **Sources &amp; verification** | Where each fact came from, and whether a human re-checked it |

The field that matters most is **`real_estate_use`** — a paragraph on what the tool actually does
in the working day of the person who bought it. Feature lists barely distinguish products; that
paragraph does.

### Two levels of reliability, never mixed

A catalogue that presents everything with the same confidence is lying about the part it guessed.

| | Written | Machine-verified |
|---|---|---|
| **What** | Description, positioning, real-estate use, features, use cases | Public pricing page, API docs, security page, privacy page, status page, site languages |
| **How** | Written from the vendor's public content; `unverified` until a human rechecks | Fetched from the vendor's own site on a dated check, with the URL that establishes it |
| **Field** | `verification.status` | `signals.checked_on` |

An absent signal means *not found on that date* — never *does not exist*. That distinction ships
inside the JSON, so a model consuming this can carry it through.

## Three rules this project will not break

1. **No invented reviews.** A rating nobody gave is a fabrication, however plausible. An empty
   `reviews: []` is honest; a made-up 4.5 is not. Reviews are only ever a report of a public
   aggregate, with its source and sampling date.
2. **No hidden ranking.** No paid placement, no "top 10". Order is alphabetical or by a sort you
   chose. No vendor pays to appear here.
3. **No pretending to certainty.** Entries seeded at launch are marked `unverified` and say so
   on their own page and inside the JSON. Verification means a human opened the sources and
   dated the check.

## Scope

**In:** software and platforms used in real estate — CRM, transaction, property management,
syndic, construction, facilities, energy and ESG, short-term rental, valuation — plus the
**portals, marketplaces and data providers** the industry runs on.

**Out:** brokerages and asset managers. This is a catalogue of products, not of firms that
transact or manage on someone's behalf.

## Machine-readable

Static files, no key, no rate limit. [CC BY 4.0](LICENSE-DATA).

| Endpoint | Returns |
|---|---|
| `/api/index.json` | Metadata, counts, endpoint map |
| `/api/tools.json` | The full catalogue |
| `/api/tools/{slug}.json` | One product |
| `/api/categories/{id}.json` | One category with its products |
| `/api/taxonomy.json` | Categories, personas, segments, sizes, markets, pricing models |
| `/api/graph.json` | Nodes and typed edges |
| `/llms.txt` | Plain-text index for agents |

```bash
# Every French tool for running a condominium, with its real-world use
curl -s https://flowmetrik.github.io/proptech-atlas/api/tools.json \
  | jq '.tools[]
      | select(.markets | index("FR"))
      | select(.category == "syndic-copro")
      | {name, editor, real_estate_use}'
```

The graph's edges: `published_by`, `belongs_to`, `also_serves`, `serves_persona`,
`covers_segment`, `available_in`, `alternative_to`.

## Repository

```text
data/
  taxonomy.yaml        categories, personas, segments, sizes, markets, pricing models
  SCHEMA.md            the contract every fiche must satisfy
  tools/<slug>.yaml    one file per product — the source of truth
scripts/
  validate.mjs         the only gatekeeper: off-schema means the build fails
  emit.mjs             YAML → JSON API, llms.txt, CATALOG.md
  enrich/              the enrichment loop — discovery, fiches, logos, signals
  og/build.py          share images, with the wordmark vectorised
src/                   the Astro site (no database, no login, no server)
CATALOG.md             generated — the whole catalogue, readable on GitHub
public/api/            generated — the JSON API, also served raw from this repo
```

There is no database and no admin panel. **The repository is the product**; the website is one
rendering of it.

## Local development

```bash
npm install
npm run dev          # http://localhost:4321/proptech-atlas
npm run data:validate
npm run build        # validate → emit → build
```

Requires Node 22.

## Enrichment loop

The catalogue grows by a loop rather than by hand: discover missing products by web search,
verify each candidate resolves to a live product site, write the fiche grounded on that site's
own content, fetch the logo, probe the verifiable signals, then validate. Anything that fails
validation is removed rather than left to rot.

```bash
node scripts/enrich/loop.mjs                # full pass
node scripts/enrich/loop.mjs --no-discover  # no LLM call, no cost
```

Details and the reasoning behind each guard: [`scripts/enrich/README.md`](scripts/enrich/README.md).

## Contributing

Add a product, correct a fiche, or record a verified review — all through a pull request.
Read [CONTRIBUTING.md](CONTRIBUTING.md); start from
[`data/tools/_template.yaml`](data/tools/_template.yaml).

Vendors are welcome to submit and correct their own entry — say so in the pull request. What
you cannot do is remove a competitor, add a rating, or turn the description into marketing copy.

## Licence

Code **MIT** ([LICENSE](LICENSE)). Data **CC BY 4.0** ([LICENSE-DATA](LICENSE-DATA)) — reuse it,
including commercially, and cite *PropTech Atlas* with a link.

Product names, logos and trademarks belong to their respective owners. Entries are descriptive,
not endorsements.

---

Built by [Flowmetrik](https://flowmetrik.com).
