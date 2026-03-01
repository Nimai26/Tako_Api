/**
 * Routes: Mega Construx Provider (v2 - Database)
 * 
 * Endpoints pour les produits MEGA Construx archivés.
 * Source : PostgreSQL (catalogue) + MinIO (PDFs d'instructions + images)
 * 
 * Routes disponibles:
 * - GET /construction-toys/mega/health      - État du provider
 * - GET /construction-toys/mega/search      - Recherche de produits
 * - GET /construction-toys/mega/categories  - Catégories disponibles
 * - GET /construction-toys/mega/category/:name - Produits par catégorie
 * - GET /construction-toys/mega/instructions/:sku - PDF d'instructions
 * - GET /construction-toys/mega/file/:sku/pdf   - Proxy : stream PDF depuis MinIO
 * - GET /construction-toys/mega/file/:sku/image - Proxy : stream image depuis MinIO
 * - GET /construction-toys/mega/:id         - Détails d'un produit
 */

import { Router } from 'express';
import { MegaProvider } from '../providers/mega.provider.js';
import { asyncHandler } from '../../../shared/utils/async-handler.js';
import { ValidationError, NotFoundError } from '../../../shared/errors/index.js';
import { megaQueryOne } from '../../../infrastructure/mega/index.js';
import { getObjectStream, isMegaMinIOConnected } from '../../../infrastructure/mega/index.js';

export const router = Router();

// Instance du provider (singleton)
const megaProvider = new MegaProvider();

// ===========================================
// Health Check
// ===========================================

/**
 * GET /construction-toys/mega/health
 * Vérifier la disponibilité de la BDD MEGA
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
 * Rechercher des produits MEGA Construx dans l'archive
 * 
 * @query {string} q - Terme de recherche (requis)
 * @query {number} page - Page (défaut: 1)
 * @query {number} pageSize - Résultats par page (défaut: 20, max: 100)
 * @query {string} category - Filtrer par catégorie (optionnel)
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q, query, page = 1, pageSize = 20, category } = req.query;

  const searchQuery = q || query;
  if (!searchQuery) {
    throw new ValidationError('Le paramètre "q" est requis');
  }

  const result = await megaProvider.search(searchQuery, {
    page: parseInt(page, 10),
    pageSize: Math.min(parseInt(pageSize, 10), 100),
    category: category || null
  });

  res.json(result);
}));

// ===========================================
// Catégories
// ===========================================

/**
 * GET /construction-toys/mega/categories
 * Lister toutes les catégories avec le nombre de produits
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const result = await megaProvider.getCategories();
  res.json(result);
}));

/**
 * GET /construction-toys/mega/category/:name
 * Lister les produits d'une catégorie
 * 
 * @param {string} name - Nom de la catégorie (pokemon, halo, hot-wheels, barbie, masters-of-the-universe)
 * @query {number} page - Page (défaut: 1)
 * @query {number} pageSize - Résultats par page (défaut: 50, max: 100)
 */
router.get('/category/:name', asyncHandler(async (req, res) => {
  const { name } = req.params;
  const { page = 1, pageSize = 50 } = req.query;

  const result = await megaProvider.getByCategory(name, {
    page: parseInt(page, 10),
    pageSize: Math.min(parseInt(pageSize, 10), 100)
  });

  res.json(result);
}));

// ===========================================
// Instructions PDF (doit être AVANT /:id)
// ===========================================

/**
 * GET /construction-toys/mega/instructions/:sku
 * Obtenir l'URL du PDF d'instructions pour un produit
 * 
 * @param {string} sku - SKU du produit (ex: HGC23)
 * @returns {Object} URL du PDF (présignée MinIO ou originale Mattel)
 */
router.get('/instructions/:sku', asyncHandler(async (req, res) => {
  const { sku } = req.params;

  if (!sku) {
    throw new ValidationError('SKU manquant');
  }

  const result = await megaProvider.getInstructions(sku);
  res.json(result);
}));

// ===========================================
// Proxy fichiers MinIO (PDF + Images)
// ===========================================

/**
 * GET /construction-toys/mega/file/:sku/pdf
 * Streame le PDF d'instructions depuis MinIO via Tako API (proxy)
 * 
 * @param {string} sku - SKU du produit (ex: HGC23)
 */
router.get('/file/:sku/pdf', asyncHandler(async (req, res) => {
  const { sku } = req.params;
  if (!sku) throw new ValidationError('SKU manquant');

  if (!isMegaMinIOConnected()) {
    throw new NotFoundError('MinIO non disponible');
  }

  // Lookup catégorie depuis la DB
  const row = await megaQueryOne(
    `SELECT category, sku FROM products WHERE UPPER(sku) = UPPER($1)`,
    [sku]
  );
  if (!row) throw new NotFoundError(`Produit MEGA non trouvé: ${sku}`);

  const objectPath = `${row.category}/${row.sku.toLowerCase()}.pdf`;

  try {
    const { stream, stat } = await getObjectStream(objectPath);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': stat.size,
      'Content-Disposition': `inline; filename="${row.sku.toUpperCase()}.pdf"`,
      'Cache-Control': 'public, max-age=86400'
    });
    stream.pipe(res);
  } catch (err) {
    throw new NotFoundError(`PDF non trouvé pour ${sku}: ${err.message}`);
  }
}));

/**
 * GET /construction-toys/mega/file/:sku/image
 * Streame l'image du produit depuis MinIO via Tako API (proxy)
 * 
 * @param {string} sku - SKU du produit (ex: HGC23)
 */
router.get('/file/:sku/image', asyncHandler(async (req, res) => {
  const { sku } = req.params;
  if (!sku) throw new ValidationError('SKU manquant');

  if (!isMegaMinIOConnected()) {
    throw new NotFoundError('MinIO non disponible');
  }

  // Lookup catégorie depuis la DB
  const row = await megaQueryOne(
    `SELECT category, sku FROM products WHERE UPPER(sku) = UPPER($1)`,
    [sku]
  );
  if (!row) throw new NotFoundError(`Produit MEGA non trouvé: ${sku}`);

  const objectPath = `${row.category}/${row.sku.toLowerCase()}.jpg`;

  try {
    const { stream, stat } = await getObjectStream(objectPath);
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': stat.size,
      'Content-Disposition': `inline; filename="${row.sku.toUpperCase()}.jpg"`,
      'Cache-Control': 'public, max-age=86400'
    });
    stream.pipe(res);
  } catch (err) {
    throw new NotFoundError(`Image non trouvée pour ${sku}: ${err.message}`);
  }
}));

// ===========================================
// Détails produit
// ===========================================

/**
 * GET /construction-toys/mega/:id
 * Récupérer les détails d'un produit MEGA par SKU
 * 
 * @param {string} id - SKU du produit (ex: HGC23)
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('ID produit manquant');
  }

  const result = await megaProvider.getById(id);
  res.json(result);
}));

export default router;
