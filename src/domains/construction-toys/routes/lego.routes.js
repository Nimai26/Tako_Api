/**
 * Routes: LEGO Provider
 * 
 * Endpoints pour les produits LEGO
 * 
 * Routes disponibles:
 * - GET /construction-toys/lego/search - Recherche de produits
 * - GET /construction-toys/lego/:id - Détails d'un produit
 * - GET /construction-toys/lego/instructions/:id - Manuels d'instructions
 */

import { Router } from 'express';
import { LegoProvider } from '../providers/lego.provider.js';
import { asyncHandler } from '../../../shared/utils/async-handler.js';
import { ValidationError } from '../../../shared/errors/index.js';

export const router = Router();

// Instance du provider (singleton)
const legoProvider = new LegoProvider();

// ===========================================
// Health Check
// ===========================================

/**
 * GET /construction-toys/lego/health
 * Vérifier la disponibilité du provider
 */
router.get('/health', asyncHandler(async (req, res) => {
  const health = await legoProvider.healthCheck();
  res.status(health.healthy ? 200 : 503).json(health);
}));

// ===========================================
// Recherche
// ===========================================

/**
 * GET /construction-toys/lego/search
 * Rechercher des produits LEGO
 * 
 * @query {string} q - Terme de recherche (requis)
 * @query {number} page - Page (défaut: 1)
 * @query {number} pageSize - Résultats par page (défaut: 24, max: 100)
 * @query {string} locale - Locale (défaut: fr-FR)
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q, query, page = 1, pageSize = 24, locale = 'fr-FR' } = req.query;
  
  const searchQuery = q || query;
  if (!searchQuery) {
    throw new ValidationError('Le paramètre "q" est requis');
  }

  const result = await legoProvider.search(searchQuery, {
    page: parseInt(page, 10),
    pageSize: Math.min(parseInt(pageSize, 10), 100),
    locale
  });

  res.json(result);
}));

// ===========================================
// Instructions (doit être AVANT /:id)
// ===========================================

/**
 * GET /construction-toys/lego/instructions/:id
 * Récupérer les manuels d'instructions pour un set LEGO
 * 
 * @param {string} id - ID du produit (ex: 75192)
 * @query {string} locale - Locale (défaut: fr-FR)
 * 
 * @returns {Object} Manuels d'instructions
 * @example
 * {
 *   "success": true,
 *   "id": "75192",
 *   "name": "Millennium Falcon",
 *   "manuals": [
 *     {
 *       "id": "6564020",
 *       "description": "Manuel principal",
 *       "pdfUrl": "https://www.lego.com/cdn/product-assets/product.bi.core.pdf/6564020.pdf",
 *       "sequence": 1
 *     }
 *   ],
 *   "url": "https://www.lego.com/fr-fr/service/building-instructions/75192"
 * }
 */
router.get('/instructions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { locale = 'fr-FR' } = req.query;

  if (!id) {
    throw new ValidationError('ID produit manquant');
  }

  const instructions = await legoProvider.getLegoInstructions(id, { locale });

  res.json({
    success: true,
    provider: 'lego',
    ...instructions
  });
}));

// ===========================================
// Détails produit
// ===========================================

/**
 * GET /construction-toys/lego/:id
 * Récupérer les détails d'un produit LEGO
 * 
 * @param {string} id - ID du produit (ex: 75192)
 * @query {string} locale - Locale (défaut: fr-FR)
 * @query {boolean} includeInstructions - Inclure les manuels (défaut: true)
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    locale = 'fr-FR', 
    includeInstructions = 'true' 
  } = req.query;

  if (!id) {
    throw new ValidationError('ID produit manquant');
  }

  const result = await legoProvider.getById(id, {
    locale,
    includeInstructions: includeInstructions === 'true'
  });

  res.json(result);
}));

export default router;
