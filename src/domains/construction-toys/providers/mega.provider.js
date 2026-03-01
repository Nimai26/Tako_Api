/**
 * Mega Construx Provider (v2 - Database)
 * 
 * Provider pour les sets de construction Mattel MEGA.
 * Utilise la base de données archivée (PostgreSQL + MinIO) au lieu de l'API Searchspring.
 * 
 * ARCHITECTURE :
 * - PostgreSQL (Louis 10.20.0.10:5434) : Catalogue de 199 produits archivés
 * - MinIO (Louis 10.20.0.10:9000)      : 205 PDFs d'instructions + 205 images
 * 
 * TABLE products :
 *   id, sku, name, category, pdf_url, image_url, pdf_path, image_path, discovered_at
 * 
 * CATÉGORIES : pokemon (87), halo (40), hot-wheels (34), barbie (29), masters-of-the-universe (9)
 */

import { BaseProvider } from '../../../core/providers/index.js';
import { MegaNormalizer } from '../normalizers/mega.normalizer.js';
import { NotFoundError, BadGatewayError } from '../../../shared/errors/index.js';
import { logger } from '../../../shared/utils/logger.js';
import {
  isMegaConnected,
  megaQueryOne,
  megaQueryAll,
  isMegaMinIOConnected,
  getProductUrls,
  getBucketStats
} from '../../../infrastructure/mega/index.js';

export class MegaProvider extends BaseProvider {
  constructor() {
    super({
      name: 'mega',
      domain: 'construction-toys',
      baseUrl: 'database://mega_archive',
      timeout: 10000,
      retries: 1
    });

    this.normalizer = new MegaNormalizer();
    this.log = logger.create('MegaProvider');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPLÉMENTATION DES MÉTHODES ABSTRAITES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Rechercher des produits MEGA dans la BDD
   * @param {string} query - Terme de recherche
   * @param {Object} options
   * @param {number} [options.page=1] - Page
   * @param {number} [options.pageSize=20] - Résultats par page (max 100)
   * @param {string} [options.category] - Filtrer par catégorie
   */
  async search(query, options = {}) {
    this.ensureConnected();

    const {
      page = 1,
      pageSize = 20,
      category = null
    } = options;

    const limit = Math.min(pageSize, 100);
    const offset = (page - 1) * limit;

    this.log.debug(`Recherche BDD: "${query}" (page: ${page}, limit: ${limit}, cat: ${category || 'toutes'})`);

    // Construire la requête avec recherche ILIKE + filtre catégorie optionnel
    let countSql = `SELECT COUNT(*) as total FROM products WHERE (name ILIKE $1 OR sku ILIKE $1 OR category ILIKE $1)`;
    let searchSql = `SELECT * FROM products WHERE (name ILIKE $1 OR sku ILIKE $1 OR category ILIKE $1)`;
    const params = [`%${query}%`];

    if (category) {
      countSql += ` AND category = $2`;
      searchSql += ` AND category = $2`;
      params.push(category);
    }

    searchSql += ` ORDER BY category, name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    // Exécuter en parallèle
    const countParams = category ? [`%${query}%`, category] : [`%${query}%`];
    const [countResult, results] = await Promise.all([
      megaQueryOne(countSql, countParams),
      megaQueryAll(searchSql, params)
    ]);

    const total = parseInt(countResult?.total || 0);

    // Enrichir avec les URLs MinIO présignées
    const enrichedResults = await this.enrichWithMinioUrls(results);

    // Normaliser
    return this.normalizer.normalizeSearchResponse(enrichedResults, {
      query,
      total,
      pagination: {
        page,
        pageSize: limit,
        totalResults: total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + results.length < total
      }
    });
  }

  /**
   * Récupérer un produit par SKU
   * @param {string} id - SKU du produit (ex: HGC23)
   */
  async getById(id, options = {}) {
    this.ensureConnected();

    this.log.debug(`Récupération produit: ${id}`);

    const row = await megaQueryOne(
      `SELECT * FROM products WHERE UPPER(sku) = UPPER($1)`,
      [id]
    );

    if (!row) {
      throw new NotFoundError(`Produit MEGA non trouvé: ${id}`);
    }

    // Enrichir avec URLs MinIO
    const enriched = await this.enrichRowWithMinioUrls(row);

    // Normaliser
    const normalized = this.normalizer.normalize(enriched);

    return {
      success: true,
      provider: 'mega',
      domain: 'construction-toys',
      data: normalized,
      meta: {
        fetchedAt: new Date().toISOString(),
        source: 'database'
      }
    };
  }

  /**
   * Lister les produits par catégorie
   * @param {string} category - Catégorie (pokemon, halo, hot-wheels, barbie, masters-of-the-universe)
   * @param {Object} options
   */
  async getByCategory(category, options = {}) {
    this.ensureConnected();

    const { page = 1, pageSize = 50 } = options;
    const limit = Math.min(pageSize, 100);
    const offset = (page - 1) * limit;

    this.log.debug(`Catégorie: ${category} (page: ${page})`);

    const [countResult, results] = await Promise.all([
      megaQueryOne(`SELECT COUNT(*) as total FROM products WHERE category = $1`, [category]),
      megaQueryAll(
        `SELECT * FROM products WHERE category = $1 ORDER BY name LIMIT $2 OFFSET $3`,
        [category, limit, offset]
      )
    ]);

    const total = parseInt(countResult?.total || 0);

    if (total === 0) {
      throw new NotFoundError(`Catégorie MEGA non trouvée: ${category}`);
    }

    const enrichedResults = await this.enrichWithMinioUrls(results);

    return this.normalizer.normalizeSearchResponse(enrichedResults, {
      query: `category:${category}`,
      total,
      pagination: {
        page,
        pageSize: limit,
        totalResults: total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + results.length < total
      }
    });
  }

  /**
   * Lister toutes les catégories avec comptages
   */
  async getCategories() {
    this.ensureConnected();

    const rows = await megaQueryAll(
      `SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY count DESC`
    );

    return {
      success: true,
      provider: 'mega',
      domain: 'construction-toys',
      data: rows.map(r => ({
        name: r.category,
        count: parseInt(r.count),
        slug: r.category
      })),
      total: rows.reduce((sum, r) => sum + parseInt(r.count), 0),
      meta: {
        fetchedAt: new Date().toISOString(),
        source: 'database'
      }
    };
  }

  /**
   * Récupérer les instructions (PDF) pour un SKU
   * @param {string} sku - SKU du produit
   */
  async getInstructions(sku) {
    this.ensureConnected();

    const row = await megaQueryOne(
      `SELECT sku, name, category, pdf_url, pdf_path FROM products WHERE UPPER(sku) = UPPER($1)`,
      [sku]
    );

    if (!row) {
      throw new NotFoundError(`Instructions non trouvées pour le SKU: ${sku}`);
    }

    // Générer l'URL présignée vers le PDF
    let pdfPresignedUrl = null;
    if (row.pdf_path && isMegaMinIOConnected()) {
      const urls = await getProductUrls(row.category, row.sku);
      pdfPresignedUrl = urls.pdfUrl;
    }

    return {
      success: true,
      provider: 'mega',
      sku: row.sku.toUpperCase(),
      name: row.name,
      category: row.category,
      pdfUrl: pdfPresignedUrl || row.pdf_url,
      pdfOriginalUrl: row.pdf_url,
      source: pdfPresignedUrl ? 'minio' : 'mattel',
      note: pdfPresignedUrl 
        ? 'PDF servi depuis l\'archive MinIO (URL temporaire 1h)'
        : 'PDF servi depuis l\'URL Mattel d\'origine (peut expirer)'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENRICHISSEMENT MinIO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Enrichir une liste de produits avec les URLs MinIO
   * @private
   */
  async enrichWithMinioUrls(rows) {
    if (!isMegaMinIOConnected() || !rows.length) {
      return rows;
    }

    // Enrichir en parallèle (par lots de 10)
    const batchSize = 10;
    const enriched = [];

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(row => this.enrichRowWithMinioUrls(row))
      );
      enriched.push(...results);
    }

    return enriched;
  }

  /**
   * Enrichir un produit unique avec les URLs MinIO
   * @private
   */
  async enrichRowWithMinioUrls(row) {
    if (!isMegaMinIOConnected()) {
      return row;
    }

    try {
      const urls = await getProductUrls(row.category, row.sku);
      return {
        ...row,
        pdf_presigned_url: urls.pdfUrl,
        image_presigned_url: urls.imageUrl
      };
    } catch {
      return row;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Vérifie que la DB MEGA est connectée
   * @private
   */
  ensureConnected() {
    if (!isMegaConnected()) {
      throw new BadGatewayError('Base de données MEGA non disponible. Vérifiez la connexion à Louis (10.20.0.10:5434).');
    }
  }

  /**
   * Health check
   * @override
   */
  async healthCheck() {
    const startTime = Date.now();

    const dbConnected = isMegaConnected();
    const minioConnected = isMegaMinIOConnected();

    if (!dbConnected) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        message: 'MEGA Database non connectée',
        details: { db: false, minio: minioConnected }
      };
    }

    try {
      const countResult = await megaQueryOne('SELECT COUNT(*) as count FROM products');
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
        message: `MEGA Archive opérationnelle (${countResult.count} produits)`,
        details: {
          db: true,
          minio: minioConnected,
          products: parseInt(countResult.count),
          source: 'database'
        }
      };
    } catch (err) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        message: err.message,
        details: { db: false, minio: minioConnected }
      };
    }
  }
}

export default MegaProvider;
