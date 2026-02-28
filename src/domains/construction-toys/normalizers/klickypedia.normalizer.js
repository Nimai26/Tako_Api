/**
 * Klickypedia Normalizer
 * 
 * Transforme les données scrappées de Klickypedia vers le format Tako unifié.
 * Format aplati avec extractDetails() pour données spécifiques.
 * 
 * Particularités Klickypedia (conservées dans extractDetails):
 * - Source communautaire (encyclopédie)
 * - Données multilingues (fr, es, de, en) → translations
 * - Pas de prix (source encyclopédique)
 * - Format, tags, figureCount
 * - Dates released/discontinued
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
  // OVERRIDE NORMALIZE - Structure aplatie comme LEGO/Playmobil
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Override normalize() pour structure aplatie
   * Combine champs communs + détails spécifiques Klickypedia
   */
  normalize(raw) {
    // Extraction des champs communs
    const sourceId = this.extractSourceId(raw);
    const title = this.extractTitle(raw);

    // Construction base standardisée
    const base = {
      id: `${this.source}:${sourceId}`,
      type: this.type,
      source: this.source,
      sourceId: String(sourceId),
      
      // Textes
      title: this.cleanString(title),
      titleOriginal: this.cleanString(this.extractTitleOriginal(raw)),
      description: this.cleanString(this.extractDescription(raw)),
      
      // Classification
      brand: 'Playmobil',
      theme: this.cleanString(raw.theme),
      category: this.extractCategory(raw),
      
      // Dates & métriques
      year: this.parseYear(this.extractYear(raw)),
      pieceCount: this.parseInt(this.extractPieceCount(raw)),
      ageRange: this.extractAgeRange(raw),
      
      // Visuels
      images: this.normalizeImages(this.extractImages(raw)),
      
      // URLs
      urls: {
        source: this.parseUrl(this.extractSourceUrl(raw)),
        detail: this.buildDetailUrl(sourceId)
      },
      
      // Prix (encyclopédie = pas de prix)
      price: null,
      listPrice: null,
      onSale: false,
      
      // Disponibilité (encyclopédie = info limitée)
      availability: 'unknown',
      
      // Instructions (format unifié)
      instructions: this.extractInstructions(raw),
      instructionsUrl: null
    };

    // Extract provider-specific details
    const details = this.extractDetails(raw);

    // Flatten: merge base + details at root level
    return { ...base, ...details };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTION METHODS - Champs communs uniformisés
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extraire l'ID source
   */
  extractSourceId(raw) {
    return raw.id || raw.productCode;
  }

  /**
   * Extraire le titre
   */
  extractTitle(raw) {
    // Priorité : traduction > nom original
    const lang = raw.lang || 'fr';
    if (raw.translations && raw.translations[lang]) {
      return raw.translations[lang];
    }
    return raw.name || raw.displayName || `Playmobil ${raw.id || raw.productCode}`;
  }

  /**
   * Extraire le titre original
   */
  extractTitleOriginal(raw) {
    return raw.name || raw.displayName;
  }

  /**
   * Extraire la description
   */
  extractDescription(raw) {
    return raw.description || null;
  }

  /**
   * Extraire la catégorie (Klickypedia n'a pas de catégorie stricte)
   */
  extractCategory(raw) {
    return raw.format || null; // Format peut servir de catégorie
  }

  /**
   * Extraire l'année (released → year)
   */
  extractYear(raw) {
    return raw.released || null;
  }

  /**
   * Extraire le nombre de pièces (figureCount → pieceCount)
   */
  extractPieceCount(raw) {
    return raw.figureCount || null;
  }

  /**
   * Extraire la tranche d'âge
   */
  extractAgeRange(raw) {
    return raw.ageRange || null;
  }

  /**
   * Extraire les images
   */
  extractImages(raw) {
    const images = [];

    // Images principales
    if (raw.images && Array.isArray(raw.images)) {
      raw.images.forEach(img => {
        if (img) images.push(this.cleanImageUrl(img));
      });
    }

    // Thumbnail depuis recherche
    if (raw.thumb) {
      images.push(this.cleanImageUrl(raw.thumb));
    }

    return images;
  }

  /**
   * Extraire l'URL source
   */
  extractSourceUrl(raw) {
    return raw.url || raw.src_url || null;
  }

  /**
   * Extraire les instructions (format unifié)
   */
  extractInstructions(raw) {
    if (!raw.instructions) {
      return null;
    }

    const instructions = raw.instructions;

    // Si déjà au format unifié LEGO
    if (instructions.manuals && Array.isArray(instructions.manuals)) {
      return instructions;
    }

    // Convertir format Playmobil simple vers unifié
    if (instructions.available && instructions.url) {
      const productId = instructions.productId || raw.id || raw.productCode;
      return {
        count: 1,
        manuals: [
          {
            id: productId,
            description: `Notice de montage ${productId}`,
            pdfUrl: instructions.url,
            sequence: null
          }
        ],
        url: instructions.url
      };
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACT DETAILS - Champs spécifiques Klickypedia (SANS PERTE DE DONNÉES)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extraire les détails spécifiques à Klickypedia
   * Conserve TOUTES les données propres à cette source
   */
  extractDetails(raw) {
    return {
      // Codes
      productCode: raw.productCode || raw.id,
      slug: raw.slug || this.generateSlug(raw.name),
      ean: raw.ean || null,

      // Traductions (spécifique Klickypedia)
      translations: raw.translations || {},
      localizedName: raw.translations?.[raw.lang || 'fr'] || raw.name,

      // Classification étendue
      format: raw.format || null, // Ex: "Standard Box", "Play Box", etc.
      tags: raw.tags || [], // Tags communautaires

      // Dates spécifiques
      released: raw.released || null,
      discontinued: raw.discontinued || null,

      // Contenu détaillé
      figureCount: raw.figureCount || null, // Conservé en plus de pieceCount

      // URLs spécifiques
      klickypedia_url: raw.url || raw.src_url,
      src_url: raw.url || raw.src_url,

      // Métadonnées encyclopédiques
      metadata: {
        source: 'klickypedia',
        type: 'encyclopedia',
        note: 'Données encyclopédiques - pas de prix disponible'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION DE RECHERCHE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normaliser la réponse de recherche Klickypedia
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
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normaliser les images au format unifié LEGO/Playmobil
   * Format: { primary: "...", thumbnail: "...", gallery: [...] }
   */
  normalizeImages(images) {
    if (!images || images.length === 0) {
      return {
        primary: null,
        thumbnail: null,
        gallery: []
      };
    }

    // Dédupliquer
    const uniqueImages = [...new Set(images.filter(Boolean))];

    return {
      primary: uniqueImages[0] || null,
      thumbnail: uniqueImages[0] || null, // Klickypedia n'a généralement qu'une image
      gallery: uniqueImages
    };
  }

  /**
   * Nettoyer l'URL d'image
   */
  cleanImageUrl(url) {
    if (!url) return null;
    return url.trim();
  }

  /**
   * Générer un slug depuis le nom
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
