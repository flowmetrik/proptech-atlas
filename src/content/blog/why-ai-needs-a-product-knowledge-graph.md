---
title: "Why an AI cannot recommend software it only knows from marketing copy"
description: "Language models are now a distribution channel for SaaS. They inherit whatever structure the web gives them — and for real estate software, that structure barely exists."
date: 2026-08-25
lang: en
author: Flowmetrik
tags: [thesis, ai, data]
---

Ask a language model which software a French condominium manager should use to run its calls
for funds, and you will get an answer. It will be fluent, it will be plausible, and there is a
good chance it will name an American property management platform that does not handle French
co-ownership law at all.

This is not a reasoning failure. It is a data failure.

## Where the answer comes from

A model answering a software question is drawing on vendor homepages, listicles written for
affiliate revenue, review sites optimised for lead capture, and forum threads of unknown
vintage. Almost none of that material is structured. Almost none of it distinguishes between
what a product *is* and what a product *claims*. And in real estate specifically, almost none
of it is segmented by the two things that decide whether a tool is usable at all: **the
country** and **the trade**.

Real estate software does not generalise across borders the way a CRM or a helpdesk does. The
work is defined by local law. A US brokerage needs trust accounting that satisfies a state
regulator. A French agency needs a *carte professionnelle*, a *mandat*, and a compliance regime
that has no American equivalent. A *syndic* runs general assemblies under the 1965 law. None of
these are configuration options — they are the product.

So a model that has learned "property management software" as a single global category will
confidently cross a border it should not cross.

## What structure fixes

The fix is not more text. It is fewer, better-typed facts. For every product we record the same
axes, and we link them:

```text
published_by     tool  → editor
belongs_to       tool  → category
serves_persona   tool  → persona
covers_segment   tool  → asset class
available_in     tool  → market
alternative_to   tool  → tool
```

Once those edges exist, "what does a French condominium manager use" stops being a text search
and becomes a traversal: `market = FR` ∧ `persona = syndic-manager` ∧ `category = syndic-copro`.
The answer is either in the graph or it honestly is not. Both beat a confident guess.

## The field that matters most

If we had to keep one field and delete the rest, it would not be the feature list. It would be
`real_estate_use` — a paragraph describing what the tool actually does in the working day of
the person who bought it.

Feature lists are close to worthless for recommendation. Every CRM has "automation". Every
property management platform has "maintenance". What separates them is the situation they were
built for: whether the maintenance module assumes an in-house technician or a network of
subcontractors, whether the accounting assumes owner statements or condominium budgets. That
context lives in prose, and it is the part a model needs to reason with.

## Saying "I don't know" is a feature

Every entry in this catalogue carries a verification status. The ones seeded at launch say
`unverified`: written from public knowledge of the market, not yet re-checked against the
vendor's own sources. That status ships inside the JSON payload, deliberately.

A system consuming this data can therefore do something a scraped directory can never let it
do — qualify its own answer. "Three tools match, one of them verified this month, two not yet
checked" is a more useful sentence than a clean list that hides the difference.

We would rather publish a small honest graph than a large confident one.

## Open, because a private catalogue is worth less

This dataset is CC BY 4.0 and lives in a public repository, one YAML file per product. Vendors
can correct their own entries. Practitioners can add the tool nobody outside their country has
heard of. Anyone can fork the whole thing.

A catalogue that only its author can read decays quietly. One that anybody can send a pull
request to has a chance of staying true.
