/**
 * Core Schemas - Response Validation
 * 
 * Schémas Zod pour les réponses API
 */

import { z } from 'zod';

/**
 * Métadonnées de réponse
 */
export const metaSchema = z.object({
  fetchedAt: z.string().datetime(),
  lang: z.string(),
  locale: z.string().optional(),
  autoTrad: z.boolean().optional(),
  cached: z.boolean().optional(),
  cacheAge: z.number().optional()
});

/**
 * Pagination
 */
export const paginationResponseSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  totalResults: z.number(),
  totalPages: z.number(),
  hasMore: z.boolean()
});

/**
 * Réponse de recherche
 */
export const searchResponseSchema = z.object({
  success: z.boolean(),
  provider: z.string(),
  domain: z.string().optional(),
  query: z.string(),
  total: z.number(),
  count: z.number(),
  data: z.array(z.any()),  // Le contenu dépend du type
  pagination: paginationResponseSchema.optional(),
  meta: metaSchema
});

/**
 * Réponse de détails
 */
export const detailResponseSchema = z.object({
  success: z.boolean(),
  provider: z.string(),
  domain: z.string().optional(),
  id: z.string(),
  data: z.any(),  // Le contenu dépend du type
  meta: metaSchema
});

/**
 * Réponse d'erreur
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.any().optional()
});
