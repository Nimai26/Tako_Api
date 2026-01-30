/**
 * Klickypedia Normalizer
 * 
 * Transforme les données scrappées de Klickypedia vers le format Tako.
 * 
 * Particularités :
 * - Source communautaire (encyclopédie)
 * - Données multilingues (fr, es, de, en)
 * - Pas de prix (ce n'est pas un site de vente)
 * - Informations sur le thème, format, année
 * - Lien vers instructions Playmobil officielles
 */

import { BaseNormalizer } from '../../../core/normalizers/index.js';

export class KlickypediaNormalizer extends BaseNormalizer {
  constructor() {
    super({
      source: 'klickypedia',
      type: 'construct_toy',
      domain: 'construction-toys',
      includeRaw: false
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION DE RECHERCHE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normaliser la réponse de recherche Klickypedia
   * @param {Array} products - Liste des produits
   * @param {Object} metadata - Métadonnées
   */
  normalizeSearchResponse(products, metadata = {}) {
    const { query, total = products.length, pagination, lang = 'fr' } = metadata;

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
      data: products.map(product => this.normalizeSearchItem(product, lang)),
      source: 'klickypedia',
      note: 'Encyclopédie Playmobil communautaire - données non commerciales'
    };
  }

  /**
   * Normaliser un item de recherche
   * @private
   */
  normalizeSearchItem(product, lang) {
    return {
      sourceId: product.id || product.productCode,
      provider: 'klickypedia',
      brand: 'Playmobil',
      
      name: product.name || product.displayName,
      productCode: product.productCode || product.id,
      slug: product.slug || this.generateSlug(product.name),
      
      src_url: product.url,
      src_image_url: this.cleanImageUrl(product.thumb),
      
      released: product.released,
      discontinued: product.discontinued,
      
      metadata: {
        position: product.position,
        fullName: product.fullName,
        source: 'klickypedia'
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
    const { lang = 'fr' } = options;

    return {
      // Identifiants
      sourceId: product.id || product.productCode,
      provider: 'klickypedia',
      brand: 'Playmobil',
      
      // Nom et description
      name: this.getName(product, lang),
      localizedName: product.translations?.[lang] || product.name,
      translations: product.translations || {},
      description: product.description || null,
      
      // Codes
      productCode: product.productCode || product.id,
      slug: product.slug || this.generateSlug(product.name),
      ean: null, // Non disponible sur Klickypedia
      
      // URLs
      src_url: product.url || product.src_url,
      klickypedia_url: product.url || product.src_url,
      
      // Images
      images: this.normalizeImages(product),
      
      // Classification
      theme: product.theme,
      format: product.format,
      tags: product.tags || [],
      
      // Dates
      released: product.released,
      discontinued: product.discontinued,
      
      // Contenu
      figureCount: product.figureCount,
      
      // Instructions
      instructions: product.instructions || null,
      
      // Métadonnées
      metadata: {
        source: 'klickypedia',
        type: 'encyclopedia',
        note: 'Données encyclopédiques - pas de prix disponible'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtenir le nom selon la langue
   * @private
   */
  getName(product, lang) {
    // Priorité : traduction > nom direct
    if (product.translations?.[lang]) {
      return product.translations[lang];
    }
    return product.name || product.displayName || `Playmobil ${product.productCode}`;
  }

  /**
   * Normaliser les images
   * @private
   */
  normalizeImages(product) {
    const images = [];

    // Image principale
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img, index) => {
        images.push({
          url: this.cleanImageUrl(img),
          type: index === 0 ? 'primary' : 'gallery',
          width: null,
          height: null
        });
      });
    }

    // Thumbnail depuis la recherche
    if (product.thumb && !images.some(i => i.url === product.thumb)) {
      images.push({
        url: this.cleanImageUrl(product.thumb),
        type: images.length === 0 ? 'primary' : 'thumbnail',
        width: null,
        height: null
      });
    }

    return images;
  }

  /**
   * Nettoyer l'URL d'image
   * @private
   */
  cleanImageUrl(url) {
    if (!url) return null;
    return url.trim();
  }

  /**
   * Générer un slug depuis le nom
   * @private
   */
  generateSlug(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

export default KlickypediaNormalizer;
