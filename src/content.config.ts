import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Le blog : la partie éditoriale du projet. Un post explique une décision de
// modélisation, un segment de marché ou une lecture du catalogue — il ne
// duplique jamais une fiche produit.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    lang: z.enum(['en', 'fr']).default('en'),
    author: z.string().default('Flowmetrik'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
