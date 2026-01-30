/**
 * Mega Construx Provider
 * 
 * Provider pour les sets de construction Mattel MEGA via l'API Searchspring.
 * Ne nécessite pas FlareSolverr - API publique directe.
 * 
 * @see https://shop.mattel.com (US)
 * @see https://shopping.mattel.com (EU)
 * 
 * ENDPOINTS SEARCHSPRING :
 * - US: https://ck4bj7.a.searchspring.io/api/search/search.json
 * - EU: https://0w0shw.a.searchspring.io/api/search/search.json
 * 
 * AUTHENTIFICATION : Aucune (API publique)
 * 
 * RATE LIMIT : Non documenté (raisonnable)
 * 
 * NOTE: L'API US contient les produits MEGA Construx.
 * L'API EU contient principalement Barbie/autres jouets Mattel.
 * On utilise toujours l'API US pour la recherche MEGA.
 */

import { BaseProvider } from '../../../core/providers/index.js';
import { MegaNormalizer } from '../normalizers/mega.normalizer.js';
import { NotFoundError, BadGatewayError } from '../../../shared/errors/index.js';
import { logger } from '../../../shared/utils/logger.js';

// Configuration Mega Construx
const MEGA_CONFIG = {
  // API Searchspring US (produits MEGA)
  us: {
    apiUrl: 'https://ck4bj7.a.searchspring.io/api/search/search.json',
    siteId: 'ck4bj7',
    baseUrl: 'https://shop.mattel.com',
    currency: 'USD'
  },
  // API Searchspring EU (principalement autres produits Mattel)
  eu: {
    apiUrl: 'https://0w0shw.a.searchspring.io/api/search/search.json',
    siteId: '0w0shw',
    baseUrl: 'https://shopping.mattel.com',
    currency: 'EUR'
  }
};

// Suffixes de langue à filtrer (on garde uniquement les versions US/anglaises)
const LANG_SUFFIXES = ['-es-mx', '-pt-br', '-fr-ca', '-de-de', '-fr-fr', '-en-gb', '-es-es', '-it-it', '-nl-nl'];

// Catégories MEGA pour les instructions (EU)
const MEGA_EU_CATEGORIES = [
  'pokemon', 'halo', 'masters-of-the-universe', 'hot-wheels',
  'barbie', 'minecraft', 'game-of-thrones', 'call-of-duty',
  'star-trek', 'american-girl', 'hello-kitty', 'teenage-mutant-ninja-turtles'
];

export class MegaProvider extends BaseProvider {
  constructor() {
    super({
      name: 'mega',
      domain: 'construction-toys',
      baseUrl: MEGA_CONFIG.us.apiUrl,
      timeout: 15000,
      retries: 2
    });

    this.normalizer = new MegaNormalizer();
    this.log = logger.create('MegaProvider');
    
    // Cache pour les noms localisés EU
    this.localizedNamesCache = new Map();
    this.CACHE_TTL = 3600000; // 1 heure
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPLÉMENTATION DES MÉTHODES ABSTRAITES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Rechercher des produits Mega Construx
   * @param {string} query - Terme de recherche
   * @param {Object} options
   * @param {number} [options.page=1] - Page (non utilisé, pagination via pageSize)
   * @param {number} [options.pageSize=20] - Résultats par page (max 100)
   * @param {string} [options.lang=fr-FR] - Langue pour localisation des noms
   */
  async search(query, options = {}) {
    const {
      pageSize = 20,
      lang = 'fr-FR'
    } = options;

    const config = MEGA_CONFIG.us; // Toujours utiliser l'API US pour MEGA
    const max = Math.min(pageSize, 100);

    this.log.debug(`Recherche: "${query}" (max: ${max}, lang: ${lang})`);

    // Construire l'URL de recherche
    const url = `${config.apiUrl}?siteId=${config.siteId}&q=${encodeURIComponent(query)}&resultsFormat=native&resultsPerPage=${max * 3}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': this.userAgent
      },
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new BadGatewayError(`Searchspring error: ${response.status}`);
    }

    const data = await response.json();

    // Filtrer pour ne garder que les versions anglaises (sans suffixe de langue)
    const filteredItems = (data.results || []).filter(item => {
      const handle = item.handle || item.url || '';
      return !LANG_SUFFIXES.some(suffix => handle.endsWith(suffix));
    });

    // Dédupliquer par SKU
    const seenSkus = new Set();
    const uniqueItems = filteredItems.filter(item => {
      const sku = item.sku || this.extractSkuFromName(item.name);
      if (!sku) return true;
      if (seenSkus.has(sku.toUpperCase())) return false;
      seenSkus.add(sku.toUpperCase());
      return true;
    });

    const results = uniqueItems.slice(0, max);

    // Localisation des noms si langue non-anglaise
    const langCode = this.extractLangCode(lang);
    if (langCode && langCode !== 'en') {
      await this.localizeResults(results, langCode);
    }

    // Normaliser et retourner
    return this.normalizer.normalizeSearchResponse(results, {
      query,
      total: data.pagination?.totalResults || results.length,
      pagination: {
        page: 1,
        pageSize: max,
        totalResults: data.pagination?.totalResults || results.length,
        totalPages: Math.ceil((data.pagination?.totalResults || results.length) / max),
        hasMore: results.length < (data.pagination?.totalResults || 0)
      },
      lang,
      currency: config.currency,
      baseUrl: config.baseUrl
    });
  }

  /**
   * Récupérer les détails d'un produit par ID ou SKU
   * @param {string} id - ID ou SKU du produit
   * @param {Object} options
   * @param {string} [options.lang=fr-FR] - Langue
   */
  async getById(id, options = {}) {
    const { lang = 'fr-FR' } = options;
    const config = MEGA_CONFIG.us;

    this.log.debug(`Récupération produit: ${id} (lang: ${lang})`);

    // Rechercher par ID/SKU
    const url = `${config.apiUrl}?siteId=${config.siteId}&q=${encodeURIComponent(id)}&resultsFormat=native&resultsPerPage=10`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': this.userAgent
      },
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new BadGatewayError(`Searchspring error: ${response.status}`);
    }

    const data = await response.json();

    // Trouver le produit correspondant
    let item = (data.results || []).find(r =>
      r.uid === id ||
      r.sku === id ||
      r.id === id ||
      r.sku?.toUpperCase() === id.toUpperCase()
    );

    // Si pas de correspondance exacte, prendre le premier résultat
    if (!item && data.results?.length > 0) {
      item = data.results[0];
    }

    if (!item) {
      throw new NotFoundError(`Produit MEGA non trouvé: ${id}`);
    }

    // Enrichir avec les données metafields
    const enrichedData = this.parseMetafields(item.metafields);

    // Localisation du nom
    const langCode = this.extractLangCode(lang);
    let localizedName = null;
    if (langCode && langCode !== 'en') {
      const localizedNames = await this.getLocalizedNames(langCode);
      const sku = item.sku?.toUpperCase();
      if (sku && localizedNames.has(sku)) {
        localizedName = localizedNames.get(sku);
      }
    }

    return this.normalizer.normalizeDetailResponse(item, {
      lang,
      enrichedData,
      localizedName,
      currency: config.currency,
      baseUrl: config.baseUrl
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTHODES SPÉCIFIQUES MEGA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Récupérer les instructions de montage pour un SKU
   * @param {string} sku - SKU du produit (ex: HGC23, HTH96)
   * @returns {Promise<Object>} Informations sur les instructions
   */
  async getMegaInstructions(sku) {
    // Les instructions nécessitent FlareSolverr pour scraper le site Mattel
    // Pour l'instant, on retourne les URLs de base
    const skuUpper = sku.toUpperCase();
    
    return {
      sku: skuUpper,
      instructionsSearchUrl: `https://shopping.mattel.com/fr-fr/blogs/mega-building-instructions?q=${skuUpper}`,
      note: 'Recherchez manuellement sur le site Mattel',
      source: 'mega'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extraire le SKU d'un nom de produit
   * @private
   */
  extractSkuFromName(productName) {
    if (!productName) return null;
    // Pattern: lettres + chiffres (ex: HGC23, HTJ06)
    const match = productName.match(/\b([A-Z]{2,5}[0-9]{2,5})\b/i);
    return match ? match[1].toUpperCase() : null;
  }

  /**
   * Extraire le code langue court
   * @private
   */
  extractLangCode(lang) {
    if (!lang) return null;
    return lang.toLowerCase().split('-')[0];
  }

  /**
   * Parser les metafields d'un produit
   * @private
   */
  parseMetafields(metafields) {
    const enrichedData = {};
    if (!metafields) return enrichedData;

    try {
      const metaStr = metafields.replace(/&quot;/g, '"');

      const ageMatch = metaStr.match(/"age_grade":\s*"([^"]+)"/);
      if (ageMatch) enrichedData.ageRange = ageMatch[1];

      const upcMatch = metaStr.match(/"upc_ean":\s*"([^"]+)"/);
      if (upcMatch) enrichedData.upc = upcMatch[1];

      const categoryMatch = metaStr.match(/"web_category":\s*"([^"]+)"/);
      if (categoryMatch) enrichedData.category = categoryMatch[1];

      const subtypeMatch = metaStr.match(/"subtype":\s*"([^"]+)"/);
      if (subtypeMatch) enrichedData.franchise = subtypeMatch[1];

      const features = [];
      for (let i = 1; i <= 5; i++) {
        const featureMatch = metaStr.match(new RegExp(`"bullet_feature_${i}":\\s*"([^"]+)"`));
        if (featureMatch) {
          features.push(featureMatch[1].replace(/\\"/g, '"'));
        }
      }
      if (features.length > 0) enrichedData.features = features;
    } catch (e) {
      this.log.debug(`Erreur parsing metafields: ${e.message}`);
    }

    return enrichedData;
  }

  /**
   * Localiser les résultats avec les noms EU
   * @private
   */
  async localizeResults(results, langCode) {
    try {
      const localizedNames = await this.getLocalizedNames(langCode);
      if (localizedNames.size > 0) {
        this.log.debug(`Localisation: ${localizedNames.size} noms EU disponibles`);
        for (const item of results) {
          const sku = item.sku || this.extractSkuFromName(item.name);
          if (sku && localizedNames.has(sku.toUpperCase())) {
            item.localizedName = localizedNames.get(sku.toUpperCase());
          }
        }
      }
    } catch (err) {
      this.log.debug(`Localisation échouée (non-bloquant): ${err.message}`);
    }
  }

  /**
   * Récupérer les noms localisés depuis le cache ou le site EU
   * @private
   */
  async getLocalizedNames(langCode) {
    if (!langCode || langCode === 'en') return new Map();

    const cacheKey = 'mega_names_eu';
    const cached = this.localizedNamesCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    this.log.info(`🌍 Récupération des noms MEGA EU...`);

    const allNames = new Map();

    // Récupérer en parallèle toutes les catégories principales
    const promises = MEGA_EU_CATEGORIES.map(cat =>
      this.fetchLocalizedNamesFromCategory(cat)
    );

    const results = await Promise.allSettled(promises);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const [sku, name] of result.value) {
          allNames.set(sku, name);
        }
      }
    }

    this.log.info(`✅ ${allNames.size} noms MEGA EU chargés`);

    // Mettre en cache
    this.localizedNamesCache.set(cacheKey, {
      data: allNames,
      timestamp: Date.now()
    });

    return allNames;
  }

  /**
   * Récupérer les noms localisés depuis une catégorie EU
   * @private
   */
  async fetchLocalizedNamesFromCategory(category) {
    const locale = 'fr-fr';
    const url = `https://shopping.mattel.com/${locale}/blogs/mega-building-instructions/tagged/${locale}-category-${category}`;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) return new Map();

      const html = await response.text();
      const names = new Map();

      // Pattern: "Nom FR - sku" (ex: "Pikachu en Mouvement - hgc23")
      const pattern = /"([^"]+)\s+-\s+([a-zA-Z]{2,5}[0-9]{2,5})"/gi;
      let match;

      while ((match = pattern.exec(html)) !== null) {
        const [, name, sku] = match;
        names.set(sku.toUpperCase(), name.trim());
      }

      return names;
    } catch (error) {
      this.log.debug(`⚠️ Erreur récupération noms pour ${category}: ${error.message}`);
      return new Map();
    }
  }

  /**
   * Health check spécifique
   * @override
   */
  async healthCheck() {
    const startTime = Date.now();

    try {
      // Test avec une recherche simple
      const config = MEGA_CONFIG.us;
      const url = `${config.apiUrl}?siteId=${config.siteId}&q=pokemon&resultsFormat=native&resultsPerPage=1`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return {
        healthy: true,
        latency: Date.now() - startTime,
        message: 'Searchspring API disponible'
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        message: error.message
      };
    }
  }
}

export default MegaProvider;
