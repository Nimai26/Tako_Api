/**
 * Playmobil Normalizer
 * 
 * Transforme les données du site officiel Playmobil vers le format Tako.
 * 
 * Particularités :
 * - Données commerciales avec prix
 * - Images haute résolution
 * - Support multi-locales
 * - Instructions PDF officielles
 */

import { BaseNormalizer } from '../../../core/normalizers/index.js';

export class PlaymobilNormalizer extends BaseNormalizer {
  constructor() {
    super({
      source: 'playmobil',
      type: 'construct_toy',
      domain: 'construction-toys',
      includeRaw: false
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION DE RECHERCHE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normaliser la réponse de recherche Playmobil
   * @param {Array} products - Liste des produits
   * @param {Object} metadata - Métadonnées
   */
  normalizeSearchResponse(products, metadata = {}) {
    const { query, total = products.length, pagination, lang = 'fr-fr' } = metadata;

    return {
      query,
      total,
      pagination: pagination || {
        page: 1,
        pageSize: products.length,
        totalResults: total,
        hasMore: false
      },
      lang,
      data: products.map((product, index) => this.normalizeSearchItem(product, index + 1, lang)),
      source: 'playmobil',
      note: 'Site officiel Playmobil - données commerciales'
    };
  }

  /**
   * Normaliser un item de recherche
   * @private
   */
  normalizeSearchItem(product, position, lang) {
    return {
      sourceId: product.id || product.productCode,
      provider: 'playmobil',
      brand: 'Playmobil',

      name: product.name || `Playmobil ${product.id}`,
      productCode: product.productCode || product.id,
      slug: this.generateSlug(product.name || product.id),

      src_url: product.url || null,
      src_image_url: product.thumb || product.baseImgUrl,

      price: this.normalizePrice(product.price, product.currency),
      discountPrice: product.discountPrice ? this.normalizePrice(product.discountPrice, product.currency) : null,
      discount: product.discount,

      category: product.category,

      metadata: {
        position: product.position || position,
        source: 'playmobil',
        lang
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION DE DÉTAILS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normaliser la réponse de détails
   * @param {Object} product - Produit avec détails
   * @param {Object} options
   */
  normalizeDetailResponse(product, options = {}) {
    const { lang = 'fr-fr' } = options;

    const data = {
      // Identifiants
      id: `${this.source}:${product.id || product.productCode}`,
      type: this.type,
      source: this.source,
      sourceId: String(product.id || product.productCode),
      provider: 'playmobil',
      brand: 'Playmobil',

      // Nom et description
      title: product.name || `Playmobil ${product.id}`,
      name: product.name || `Playmobil ${product.id}`,
      description: product.description || null,

      // Codes
      productCode: product.productCode || product.id,
      slug: this.generateSlug(product.name || product.id),

      // URLs
      urls: {
        source: product.url,
        detail: `/api/${this.domain}/${this.source}/${product.id || product.productCode}`
      },
      src_url: product.url,
      playmobil_url: product.url,

      // Images
      images: this.normalizeImages(product),

      // Prix
      price: this.normalizePrice(product.price, product.currency),
      discountPrice: product.discountPrice ? this.normalizePrice(product.discountPrice, product.currency) : null,
      currency: product.currency || 'EUR',

      // Classification
      category: product.category,

      // Attributs
      attributes: {
        pieceCount: product.pieceCount,
        ageRange: product.ageRange,
        canAddToBag: true
      },

      // Instructions
      instructions: product.instructions || null,

      // Métadonnées internes
      metadata: {
        source: 'playmobil',
        type: 'official',
        lang,
        note: 'Données officielles Playmobil'
      }
    };

    // Wrapper standardisé
    return {
      success: true,
      provider: this.source,
      domain: this.domain,
      id: data.id,
      data,
      meta: {
        fetchedAt: new Date().toISOString(),
        lang: lang || 'fr-fr',
        cached: options.cached || false,
        cacheAge: options.cacheAge || null
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normaliser le prix
   * @private
   */
  normalizePrice(price, currency = 'EUR') {
    if (price === null || price === undefined) return null;
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return null;

    return {
      amount: numPrice,
      currency: currency || 'EUR',
      formatted: `${numPrice.toFixed(2)} ${currency || '€'}`
    };
  }

  /**
   * Normaliser les images
   * @private
   */
  normalizeImages(product) {
    const images = [];

    // Images depuis le produit
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img, index) => {
        images.push({
          url: img,
          type: index === 0 ? 'primary' : 'gallery',
          width: null,
          height: null
        });
      });
    }

    // Thumbnail
    if (product.thumb && !images.some(i => i.url === product.thumb)) {
      images.push({
        url: product.thumb,
        type: images.length === 0 ? 'primary' : 'thumbnail',
        width: 200,
        height: 200
      });
    }

    // Base image
    if (product.baseImgUrl && !images.some(i => i.url === product.baseImgUrl)) {
      images.push({
        url: product.baseImgUrl,
        type: images.length === 0 ? 'primary' : 'gallery',
        width: 512,
        height: null
      });
    }

    return images;
  }

  /**
   * Générer un slug depuis le nom
   * @private
   */
  generateSlug(name) {
    if (!name) return '';
    return String(name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

export default PlaymobilNormalizer;
