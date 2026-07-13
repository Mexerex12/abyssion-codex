import { z } from "zod";
import { CATEGORY_META } from "@/lib/lore-meta";
import { CLASSIFICATIONS, ENTRY_STATUSES, VISIBILITIES } from "@/cms/permissions/policy";

export const loreCategorySchema = z.enum(
  Object.keys(CATEGORY_META) as [keyof typeof CATEGORY_META, ...(keyof typeof CATEGORY_META)[]],
);
export const classificationSchema = z.enum(CLASSIFICATIONS);
export const visibilitySchema = z.enum(VISIBILITIES);
export const entryStatusSchema = z.enum(ENTRY_STATUSES);

export const relationSchema = z.object({
  id: z.string().uuid().optional(),
  from_entry: z.string().uuid(),
  to_entry: z.string().uuid(),
  relation_type: z.string().min(1).max(80),
  notes: z.string().max(500).optional().nullable(),
});

export const cmsEntrySchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  category: loreCategorySchema,
  title: z.string().min(1).max(200),
  subtitle: z.string().max(200).optional().nullable(),
  summary: z.string().max(800).optional().nullable(),
  body: z.string().max(100000).optional().nullable(),
  cover_image_url: z.string().url().optional().nullable().or(z.literal("")),
  banner_image_url: z.string().url().optional().nullable().or(z.literal("")),
  classification: classificationSchema.default("publico"),
  visibility: visibilitySchema.default("public"),
  status: entryStatusSchema.default("draft"),
  timeline_date: z.string().max(60).optional().nullable(),
  timeline_order: z.number().int().optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(40).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export const libraryFilterSchema = z.object({
  q: z.string().max(200).optional().default(""),
  status: entryStatusSchema.optional(),
  category: loreCategorySchema.optional(),
  visibility: visibilitySchema.optional(),
  tag: z.string().max(40).optional(),
  relation: z.string().uuid().optional(),
  sort: z
    .enum(["updated_desc", "updated_asc", "title_asc", "title_desc"])
    .optional()
    .default("updated_desc"),
  limit: z.number().int().min(1).max(1000).optional().default(500),
});
