/**
 * Mega Construx Normalizer
 * 
 * Transforme les données de l'API Searchspring en format Tako normalisé.
 * 
 * @see https://shop.mattel.com (US)
 * @see https://shopping.mattel.com (EU)
 * 
 * EXEMPLE DE DONNÉES BRUTES SEARCHSPRING :
 * {
 *   "uid": "7459399500000",
 *   "id": "7459399500000",
 *   "name": "MEGA Pokémon Pikachu Building Set (1095 Pieces)",
 *   "sku": "HGC23",
 *   "price": 59.99,
 *   "imageUrl": "https://...",
 *   "thumbnailImageUrl": "https://...",
 *   "images": ["https://..."],
 *   "description": "Build your own...",
 *   "brand": "MEGA",
 *   "handle": "/products/mega-pokemon-pikachu-hgc23",
 *   "url": "/products/mega-pokemon-pikachu-hgc23",
 *   "rating": 4.8,
 *   "ratingCount": 120,
 *   "ss_available": "1",
 *   "in_stock_offers": "1",
 *   "metafields": "{...}"
 * }
 */

import { BaseNormalizer } from '../../../core/normalizers/index.js';

export class MegaNormalizer extends BaseNormalizer {
  constructor(options = {}) {
    super({
      source: 'mega',
      type: 'construct_toy',
      domain: 'construction-toys',
      ...options
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTION DU NOYAU COMMUN
  // ═══════════════════════════════════════════════════════════════════════════

  extractSourceId(raw) {
    // Priorité: SKU > uid > id
    return raw.sku || raw.uid || raw.id || null;
  }

  extractName(raw, context = {}) {
    // Utiliser le nom localisé si disponible
    if (raw.localizedName) {
      return raw.localizedName;
    }
    // Sinon nettoyer le nom original (enlever les infos de pièces)
    return this.cleanProductName(raw.name);
  }

  extractNameOriginal(raw) {
    return raw.name || null;
  }

  extractDescription(raw) {
    return raw.description || null;
  }

  extractYear(raw) {
    // L'API Searchspring ne fournit pas l'année directement
    return null;
  }

  extractImage(raw, context = {}) {
    const baseUrl = context.baseUrl || 'https://shop.mattel.com';
    const image = raw.imageUrl || raw.thumbnailImageUrl || (raw.images?.[0]);
    
    if (!image) return null;
    
    // Assurer une URL absolue
    if (image.startsWith('http')) return image;
    return `${baseUrl}${image}`;
  }

  extractSourceUrl(raw, context = {}) {
    const baseUrl = context.baseUrl || 'https://shop.mattel.com';
    const path = raw.url || raw.handle;
    
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${baseUrl}${path}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTION DES DÉTAILS SPÉCIFIQUES
  // ═══════════════════════════════════════════════════════════════════════════

  extractDetails(raw, context = {}) {
    const enrichedData = context.enrichedData || {};
    
    return {
      // Marque
      brand: raw.brand || 'MEGA',
      
      // SKU/UPC
      sku: raw.sku || null,
      upc: enrichedData.upc || null,
      
      // Nombre de pièces
      pieces: this.extractPieces(raw),
      
      // Tranche d'âge
      ageRange: this.parseAgeRange(enrichedData.ageRange),
      
      // Franchise (Pokemon, Halo, etc.)
      franchise: enrichedData.franchise || this.detectFranchise(raw.name),
      category: enrichedData.category || null,
      
      // Prix
      price: this.extractPrice(raw, context),
      
      // Disponibilité
      availability: this.extractAvailability(raw),
      
      // Note et avis
      rating: this.extractRating(raw),
      
      // Images multiples
      images: this.extractImages(raw, context),
      
      // Caractéristiques
      features: enrichedData.features || null
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS SPÉCIFIQUES MEGA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Nettoyer le nom du produit (enlever les infos de pièces)
   */
  cleanProductName(name) {
    if (!name) return null;
    // Enlever "(XXX Pieces)" ou "(XXX Pcs)" du nom
    return name
      .replace(/\s*\(\d+\s*(?:Pieces?|Pcs?|pièces?|Onderdelen|Teile|Pezzi)\)/i, '')
      .trim();
  }

  /**
   * Extraire le nombre de pièces du nom
   */
  extractPieces(raw) {
    if (!raw.name) return null;
    const match = raw.name.match(/\((\d+)\s*(?:Pieces?|Pcs?|pièces?|Onderdelen|Teile|Pezzi)\)/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Parser la tranche d'âge
   */
  parseAgeRange(ageString) {
    if (!ageString) return null;

    // Format "8+" ou "8-12" ou "Ages 8+"
    const match = ageString.match(/(\d+)(?:\s*[-+]\s*(\d+)?)?/);
    if (!match) return null;

    const min = parseInt(match[1]);
    const max = match[2] ? parseInt(match[2]) : null;

    return {
      min,
      max,
      display: ageString.replace(/Ages?\s*/i, '').trim()
    };
  }

  /**
   * Détecter la franchise depuis le nom
   */
  detectFranchise(name) {
    if (!name) return null;
    
    const franchises = {
      'pokemon': /pok[eé]mon/i,
      'halo': /\bhalo\b/i,
      'hot-wheels': /hot\s*wheels/i,
      'barbie': /\bbarbie\b/i,
      'masters-of-the-universe': /masters?\s*of\s*the\s*universe|he-?man|skeletor/i,
      'minecraft': /minecraft/i,
      'call-of-duty': /call\s*of\s*duty|cod\b/i,
      'hello-kitty': /hello\s*kitty/i,
      'game-of-thrones': /game\s*of\s*thrones|got\b/i,
      'star-trek': /star\s*trek/i,
      'teenage-mutant-ninja-turtles': /ninja\s*turtles|tmnt/i
    };

    for (const [franchise, pattern] of Object.entries(franchises)) {
      if (pattern.test(name)) return franchise;
    }

    return null;
  }

  /**
   * Extraire le prix
   */
  extractPrice(raw, context = {}) {
    if (!raw.price) return null;

    return {
      amount: parseFloat(raw.price),
      currency: context.currency || 'USD',
      formatted: `${raw.price} ${context.currency || 'USD'}`
    };
  }

  /**
   * Extraire la disponibilité
   */
  extractAvailability(raw) {
    const inStock = raw.ss_available === '1' || raw.in_stock_offers === '1';
    
    return {
      status: inStock ? 'available' : 'out_of_stock',
      inStock
    };
  }

  /**
   * Extraire la note
   */
  extractRating(raw) {
    if (!raw.rating) return null;

    return {
      value: parseFloat(raw.rating),
      count: raw.ratingCount ? parseInt(raw.ratingCount) : null,
      max: 5
    };
  }

  /**
   * Extraire toutes les images
   */
  extractImages(raw, context = {}) {
    const baseUrl = context.baseUrl || 'https://shop.mattel.com';
    const images = [];

    // Images array
    if (raw.images && Array.isArray(raw.images)) {
      for (const img of raw.images) {
        const url = img.startsWith('http') ? img : `${baseUrl}${img}`;
        images.push({
          url,
          type: images.length === 0 ? 'primary' : 'secondary'
        });
      }
    }

    // Image principale si pas dans l'array
    if (images.length === 0) {
      if (raw.imageUrl) {
        const url = raw.imageUrl.startsWith('http') ? raw.imageUrl : `${baseUrl}${raw.imageUrl}`;
        images.push({ url, type: 'primary' });
      } else if (raw.thumbnailImageUrl) {
        const url = raw.thumbnailImageUrl.startsWith('http') ? raw.thumbnailImageUrl : `${baseUrl}${raw.thumbnailImageUrl}`;
        images.push({ url, type: 'thumbnail' });
      }
    }

    return images.length > 0 ? images : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTHODES DE NORMALISATION PRINCIPALES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normaliser un item de recherche
   */
  normalizeSearchItem(raw, context = {}) {
    const sourceId = this.extractSourceId(raw);
    const baseUrl = context.baseUrl || 'https://shop.mattel.com';

    return {
      // Noyau commun
      type: 'construct_toy',
      source: 'mega',
      sourceId,
      name: this.extractName(raw, context),
      name_original: this.extractNameOriginal(raw),
      description: this.extractDescription(raw),
      year: this.extractYear(raw),
      image: this.extractImage(raw, context),
      src_url: this.extractSourceUrl(raw, context),
      detailUrl: `/construction-toys/mega/${sourceId}`,

      // Détails spécifiques (résumés pour la recherche)
      brand: raw.brand || 'MEGA',
      sku: raw.sku || null,
      pieces: this.extractPieces(raw),
      franchise: this.detectFranchise(raw.name),
      price: this.extractPrice(raw, context),
      availability: this.extractAvailability(raw),
      rating: this.extractRating(raw)
    };
  }

  /**
   * Normaliser la réponse de recherche complète
   */
  normalizeSearchResponse(results, context = {}) {
    return {
      success: true,
      provider: 'mega',
      domain: 'construction-toys',
      query: context.query || '',
      total: context.total || results.length,
      count: results.length,
      data: results.map(item => this.normalizeSearchItem(item, context)),
      pagination: context.pagination || {
        page: 1,
        pageSize: results.length,
        totalResults: context.total || results.length,
        hasMore: false
      },
      meta: {
        fetchedAt: new Date().toISOString(),
        lang: context.lang || 'en-US',
        currency: context.currency || 'USD'
      }
    };
  }

  /**
   * Normaliser les détails d'un produit
   */
  normalizeDetailResponse(raw, context = {}) {
    const sourceId = this.extractSourceId(raw);

    return {
      success: true,
      provider: 'mega',
      domain: 'construction-toys',
      data: {
        // Noyau commun
        type: 'construct_toy',
        source: 'mega',
        sourceId,
        name: context.localizedName || this.cleanProductName(raw.name),
        name_original: raw.name,
        name_localized: context.localizedName || null,
        description: this.extractDescription(raw),
        year: this.extractYear(raw),
        image: this.extractImage(raw, context),
        src_url: this.extractSourceUrl(raw, context),
        detailUrl: `/construction-toys/mega/${sourceId}`,

        // Détails complets
        ...this.extractDetails(raw, context)
      },
      meta: {
        fetchedAt: new Date().toISOString(),
        lang: context.lang || 'en-US',
        currency: context.currency || 'USD'
      }
    };
  }
}

export default MegaNormalizer;
