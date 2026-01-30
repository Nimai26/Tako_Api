/**
 * Brickset Normalizer
 * 
 * Transforme les données de l'API Brickset en format Tako normalisé.
 * 
 * @see https://brickset.com/api/v3.asmx
 * 
 * EXEMPLE DE DONNÉES BRUTES BRICKSET :
 * {
 *   "setID": 31754,
 *   "number": "75192",
 *   "numberVariant": 1,
 *   "name": "Millennium Falcon",
 *   "year": 2017,
 *   "theme": "Star Wars",
 *   "themeGroup": "Licensed",
 *   "subtheme": "Ultimate Collector Series",
 *   "category": "Normal",
 *   "released": true,
 *   "pieces": 7541,
 *   "minifigs": 8,
 *   "image": {
 *     "thumbnailURL": "https://...",
 *     "imageURL": "https://..."
 *   },
 *   "bricksetURL": "https://brickset.com/sets/75192-1",
 *   "LEGOCom": {
 *     "FR": { "retailPrice": 849.99, ... }
 *   },
 *   ...
 * }
 */

import { BaseNormalizer } from '../../../core/normalizers/index.js';

export class BricksetNormalizer extends BaseNormalizer {
  constructor(options = {}) {
    super({
      source: 'brickset',
      type: 'construct_toy',
      domain: 'construction-toys',
      ...options
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTION DU NOYAU COMMUN
  // ═══════════════════════════════════════════════════════════════════════════

  extractSourceId(raw) {
    // Utiliser setID ou construire depuis number-variant
    return raw.setID 
      ? String(raw.setID)
      : `${raw.number}-${raw.numberVariant || 1}`;
  }

  extractTitle(raw) {
    // Combiner numéro et nom pour plus de clarté
    const number = raw.number || '';
    const name = raw.name || 'Unknown Set';
    return number ? `${number} ${name}` : name;
  }

  extractTitleOriginal(raw) {
    // Brickset n'a pas de titre original distinct
    return null;
  }

  extractDescription(raw) {
    // Brickset n'a pas de description dans l'API standard
    // On pourrait construire une description basique
    const parts = [];
    if (raw.theme) parts.push(raw.theme);
    if (raw.subtheme) parts.push(raw.subtheme);
    if (raw.pieces) parts.push(`${raw.pieces} pièces`);
    if (raw.minifigs) parts.push(`${raw.minifigs} minifigs`);
    
    return parts.length > 0 ? parts.join(' • ') : null;
  }

  extractYear(raw) {
    return raw.year;
  }

  extractImages(raw) {
    const image = raw.image || {};
    const additionalImages = raw.additionalImages || [];
    
    return {
      primary: image.imageURL || null,
      thumbnail: image.thumbnailURL || null,
      gallery: additionalImages
        .map(img => img.imageURL || img.thumbnailURL)
        .filter(Boolean)
    };
  }

  extractSourceUrl(raw) {
    return raw.bricksetURL || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTION DES DÉTAILS SPÉCIFIQUES
  // ═══════════════════════════════════════════════════════════════════════════

  extractDetails(raw) {
    const legoCom = raw.LEGOCom || {};
    const frPrice = legoCom.FR || legoCom.US || {};
    
    return {
      // Marque et classification
      brand: 'LEGO',
      theme: this.cleanString(raw.theme),
      subtheme: this.cleanString(raw.subtheme),
      category: this.cleanString(raw.category),
      
      // Spécifications
      setNumber: this.cleanString(raw.number),
      pieceCount: this.parseInt(raw.pieces),
      minifigCount: this.parseInt(raw.minifigs),
      
      // Âge
      ageRange: this.extractAgeRange(raw),
      
      // Dimensions
      dimensions: this.extractDimensions(raw),
      
      // Prix
      price: this.extractPrice(frPrice),
      
      // Disponibilité
      availability: this.mapAvailability(raw),
      releaseDate: this.extractReleaseDate(raw),
      retirementDate: null, // Pas dispo dans l'API standard
      
      // Instructions
      instructionsUrl: raw.instructionsCount > 0
        ? `https://www.lego.com/service/buildinginstructions/${raw.number}`
        : null,
      
      // Barcodes
      barcodes: {
        upc: this.cleanString(raw.barcode?.UPC),
        ean: this.cleanString(raw.barcode?.EAN)
      },
      
      // Ratings
      rating: raw.rating
        ? {
            average: this.parseNumber(raw.rating),
            count: this.parseInt(raw.reviewCount)
          }
        : null
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS SPÉCIFIQUES BRICKSET
  // ═══════════════════════════════════════════════════════════════════════════

  extractAgeRange(raw) {
    const min = this.parseInt(raw.ageRange?.min);
    const max = this.parseInt(raw.ageRange?.max);
    
    if (min === null && max === null) return null;
    return { min, max };
  }

  extractDimensions(raw) {
    const dims = raw.dimensions || {};
    const height = this.parseNumber(dims.height);
    const width = this.parseNumber(dims.width);
    const depth = this.parseNumber(dims.depth);
    
    if (height === null && width === null && depth === null) return null;
    return { height, width, depth };
  }

  extractPrice(priceData) {
    const amount = this.parseNumber(priceData.retailPrice);
    if (amount === null) return null;
    
    return {
      amount,
      currency: 'EUR' // FR par défaut
    };
  }

  extractReleaseDate(raw) {
    // Brickset donne l'année, on peut parfois avoir dateFirstAvailable
    if (raw.dateFirstAvailable) {
      return raw.dateFirstAvailable;
    }
    if (raw.year) {
      return `${raw.year}-01-01`; // Approximation au 1er janvier
    }
    return null;
  }

  mapAvailability(raw) {
    // Logique de mapping de disponibilité Brickset
    if (!raw.released) return 'coming_soon';
    if (raw.availability === 'Retail') return 'available';
    if (raw.availability === 'Retired') return 'retired';
    if (raw.availability === 'LEGO exclusive') return 'exclusive';
    return 'unknown';
  }
}

export default BricksetNormalizer;
