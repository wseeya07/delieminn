import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    videoUrl: z.string().optional(),
    category: z.enum(['ECU Remap', 'Dyno Test', 'CVT', 'Motor Revizyon', 'Modifiye', 'Bakım', 'Arıza Çözüm']).default('Modifiye'),
    brand: z.string().optional(),
  }),
});

export const collections = { projects };
