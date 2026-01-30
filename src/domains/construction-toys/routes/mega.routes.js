/**
 * Routes: Mega Construx Provider
 * 
 * Endpoints pour les produits MEGA Construx (Mattel).
 * Utilise l'API Searchspring (pas de scraping nécessaire).
 * 
 * @see https://shop.mattel.com (US)
 * @see https://shopping.mattel.com (EU)
 * 
 * Routes disponibles:
 * - GET /construction-toys/mega/health - État du provider
 * - GET /construction-toys/mega/search - Recherche de produits
 * - GET /construction-toys/mega/:id - Détails d'un produit
 * - GET /construction-toys/mega/instructions/:sku - Instructions de montage
 * 
 * Support traduction :
 * - lang : Code langue (fr-FR, en-US, etc.) - localisation native des noms
 * - autoTrad : Activer la traduction auto des descriptions (1 ou true)
 */

import { Router } from 'express';
import { MegaProvider } from '../providers/mega.provider.js';
import { asyncHandler } from '../../../shared/utils/async-handler.js';
import { ValidationError } from '../../../shared/errors/index.js';
import {
  translateSearchResults,
  translateText,
  isAutoTradEnabled,
  extractLangCode
} from '../../../shared/utils/translator.js';

export const router = Router();

// Instance du provider (singleton)
const megaProvider = new MegaProvider();

// ===========================================
// Health Check
// ===========================================

/**
 * GET /construction-toys/mega/health
 * Vérifier la disponibilité du provider Mega
 * 
 * @returns {Object} État de santé
 * @example
 * {
 *   "healthy": true,
 *   "latency": 120,
 *   "message": "Searchspring API disponible",
 *   "provider": "mega"
 * }
 */
router.get('/health', asyncHandler(async (req, res) => {
  const health = await megaProvider.healthCheck();
  res.status(health.healthy ? 200 : 503).json({
    ...health,
    provider: 'mega'
  });
}));

// ===========================================
// Recherche
// ===========================================

/**
 * GET /construction-toys/mega/search
 * Rechercher des produits MEGA Construx
 * 
 * @query {string} q - Terme de recherche (requis)
 * @query {number} pageSize - Résultats par page (défaut: 20, max: 100)
 * @query {string} lang - Langue pour localisation (défaut: fr-FR)
 * 
 * @returns {Object} Résultats de recherche normalisés
 * 
 * @example
 * GET /construction-toys/mega/search?q=pokemon&pageSize=10
 * 
 * Franchises supportées:
 * - Pokemon
 * - Halo
 * - Hot Wheels
 * - Barbie
 * - Masters of the Universe
 * - Minecraft
 * - Call of Duty
 * - Hello Kitty
 * - Game of Thrones
 * - Star Trek
 * - TMNT
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q, query, pageSize = 20, lang = 'fr-FR', autoTrad } = req.query;

  const searchQuery = q || query;
  if (!searchQuery) {
    throw new ValidationError('Le paramètre "q" est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await megaProvider.search(searchQuery, {
    pageSize: Math.min(parseInt(pageSize, 10), 100),
    lang
  });

  // Traduction automatique des descriptions si activée
  if (autoTradEnabled && result.data && result.data.length > 0) {
    result.data = await translateSearchResults(result.data, true, targetLang);
  }

  res.json(result);
}));

// ===========================================
// Instructions (doit être AVANT /:id)
// ===========================================

/**
 * GET /construction-toys/mega/instructions/:sku
 * Obtenir les informations d'instructions pour un produit
 * 
 * @param {string} sku - SKU du produit (ex: HGC23)
 * 
 * @returns {Object} Informations sur les instructions
 * @example
 * {
 *   "success": true,
 *   "sku": "HGC23",
 *   "instructionsSearchUrl": "https://shopping.mattel.com/...",
 *   "note": "Recherchez manuellement sur le site Mattel"
 * }
 */
router.get('/instructions/:sku', asyncHandler(async (req, res) => {
  const { sku } = req.params;

  if (!sku) {
    throw new ValidationError('SKU manquant');
  }

  const result = await megaProvider.getMegaInstructions(sku);

  res.json({
    success: true,
    provider: 'mega',
    ...result
  });
}));

// ===========================================
// Détails produit
// ===========================================

/**
 * GET /construction-toys/mega/:id
 * Récupérer les détails d'un produit MEGA
 * 
 * @param {string} id - ID ou SKU du produit (ex: HGC23)
 * @query {string} lang - Langue pour localisation (défaut: fr-FR)
 * 
 * @returns {Object} Détails du produit normalisés
 * 
 * Note: L'ID peut être soit l'UID Searchspring soit le SKU du produit
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang = 'fr-FR', autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('ID produit manquant');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await megaProvider.getById(id, { lang });

  // Traduction automatique de la description si activée
  if (autoTradEnabled && result.data?.description) {
    const translated = await translateText(result.data.description, { enabled: true, targetLang });
    if (translated.translated) {
      result.data.descriptionOriginal = result.data.description;
      result.data.description = translated.text;
    }
  }

  res.json(result);
}));

export default router;
