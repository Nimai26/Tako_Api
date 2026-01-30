/**
 * Core Schemas - Request Validation
 * 
 * Schémas Zod pour les paramètres de requête
 */

import { z } from 'zod';

/**
 * Paramètres communs de recherche
 */
export const searchQuerySchema = z.object({
  // Terme de recherche (requis)
  q: z.string().min(1, 'Search query is required'),
  
  // Langue (2 lettres)
  lang: z.string().length(2).default('fr'),
  
  // Locale complète (xx-XX)
  locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/).optional(),
  
  // Nombre max de résultats
  max: z.coerce.number().min(1).max(100).default(20),
  
  // Page pour la pagination
  page: z.coerce.number().min(1).default(1),
  
  // Traduction automatique
  autoTrad: z.coerce.boolean().default(false),
  
  // Forcer le refresh du cache
  refresh: z.coerce.boolean().default(false)
});

/**
 * Paramètres de détails
 */
export const detailQuerySchema = z.object({
  // URL de détails (fournie par /search)
  detailUrl: z.string().optional(),
  
  // ID direct (legacy)
  id: z.string().optional(),
  
  // Langue
  lang: z.string().length(2).default('fr'),
  
  // Locale
  locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/).optional(),
  
  // Traduction automatique
  autoTrad: z.coerce.boolean().default(false),
  
  // Forcer le refresh
  refresh: z.coerce.boolean().default(false)
}).refine(
  data => data.detailUrl || data.id,
  { message: 'Either detailUrl or id is required' }
);

/**
 * Pagination
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20)
});
