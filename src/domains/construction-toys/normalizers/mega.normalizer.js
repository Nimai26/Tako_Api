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
  // NORMALISATION AVEC STRUCTURE PLATE (v2.0.0)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normaliser un item Mega en format Tako avec structure plate
   * @override BaseNormalizer.normalize()
   */
  normalize(raw) {
    if (!raw) {
      throw new Error('normalize() : données brutes manquantes');
    }

    try {
      const sourceId = this.extractSourceId(raw);
      const title = this.extractTitle(raw);
      
      if (!sourceId) {
        throw new Error('sourceId manquant dans les données');
      }
      if (!title) {
        throw new Error('title manquant dans les données');
      }

      // Construire l'objet de base avec le tronc commun
      const base = {
        // Identification
        id: `${this.source}:${sourceId}`,
        type: this.type,
        source: this.source,
        sourceId: String(sourceId),
        
        // Titres
        title: this.cleanString(title),
        titleOriginal: this.cleanString(this.extractTitleOriginal(raw)),
        
        // Description et année
        description: this.cleanString(this.extractDescription(raw)),
        year: this.parseYear(this.extractYear(raw)),
        
        // Images
        images: this.normalizeImages(this.extractImages(raw)),
        
        // URLs
        urls: {
          source: this.parseUrl(this.extractSourceUrl(raw)),
          detail: this.buildDetailUrl(sourceId)
        }
      };

      // Extraire les détails spécifiques et les aplatir directement
      const details = this.extractDetails(raw);

      // Fusionner base + details en structure plate
      const normalized = {
        ...base,
        ...details  // ✅ Aplatissement : tous les champs de details au même niveau
      };

      // Ajouter les données brutes si demandé (debug)
      if (this.includeRaw) {
        normalized._raw = raw;
      }

      return normalized;

    } catch (error) {
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTION DU NOYAU COMMUN
  // ═══════════════════════════════════════════════════════════════════════════

  extractSourceId(raw) {
    // Priorité: SKU > uid > id
    return raw.sku || raw.uid || raw.id || null;
  }

  extractTitle(raw) {
    // Nettoyer le nom original (enlever les infos de pièces)
    return this.cleanProductName(raw.name);
  }

  extractTitleOriginal(raw) {
    return raw.name || null;
  }

  extractPieceCount(raw) {
    // Extraire le nombre de pièces du nom
    return this.extractPieces(raw);
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
      theme: null, // MEGA n'a pas de thèmes comme LEGO
      
      // SKU/UPC
      sku: raw.sku || null,
      upc: enrichedData.upc || null,
      
      // Nombre de pièces
      pieceCount: this.extractPieceCount(raw),
      
      // Tranche d'âge
      ageRange: this.parseAgeRange(enrichedData.ageRange),
      
      // Franchise (Pokemon, Halo, etc.)
      franchise: enrichedData.franchise || this.detectFranchise(raw.name),
      category: enrichedData.category || null,
      
      // Prix
      price: this.extractPrice(raw),
      listPrice: null,
      onSale: false,
      
      // Disponibilité
      availability: this.extractAvailability(raw),
      
      // Note et avis
      rating: this.extractRating(raw),
      
      // Instructions
      instructions: null, // MEGA n'a pas d'instructions dans l'API
      instructionsUrl: null,
      
      // Caractéristiques MEGA-spécifiques
      features: enrichedData.features || null,
      
      // Métadonnées
      metadata: {
        source: 'mega',
        type: 'construction_toy'
      }
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
  extractImages(raw) {
    const baseUrl = 'https://shop.mattel.com';
    const images = [];

    // Images array
    if (raw.images && Array.isArray(raw.images)) {
      for (const img of raw.images) {
        const url = img.startsWith('http') ? img : `${baseUrl}${img}`;
        images.push(url);
      }
    }

    // Image principale si pas dans l'array
    if (images.length === 0 && raw.imageUrl) {
      const url = raw.imageUrl.startsWith('http') ? raw.imageUrl : `${baseUrl}${raw.imageUrl}`;
      images.push(url);
    }

    // Thumbnail en fallback
    if (images.length === 0 && raw.thumbnailImageUrl) {
      const url = raw.thumbnailImageUrl.startsWith('http') ? raw.thumbnailImageUrl : `${baseUrl}${raw.thumbnailImageUrl}`;
      images.push(url);
    }

    return images.length > 0 ? images : [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTHODES DE NORMALISATION DE LA RECHERCHE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normaliser la réponse de recherche complète
   * @override BaseNormalizer.normalizeSearchResponse()
   */
  normalizeSearchResponse(results, context = {}) {
    return {
      success: true,
      provider: this.source,
      domain: this.domain,
      query: context.query || '',
      total: context.total || results.length,
      count: results.length,
      data: results.map(item => this.normalize(item)),
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
}

export default MegaNormalizer;
