/**
 * @fileoverview Normalizer Lulu-Berlu - Normalisation des données
 * @module domains/collectibles/normalizers/luluberlu
 * 
 * Transforme les données brutes de Lulu-Berlu au format Tako_Api v3.0.0
 */

import { logger } from '../../../shared/utils/logger.js';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extrait le texte d'un champ qui peut être string ou objet de traduction
 * @param {string|Object} value - Valeur brute ou traduite
 * @returns {string} Texte extrait
 */
function extractText(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.text) return value.text;
  return String(value);
}

/**
 * Normalise la disponibilité
 * @param {string} availability - Statut brut
 * @returns {string} Statut normalisé
 */
function normalizeAvailability(availability) {
  if (!availability) return 'unknown';
  
  const status = String(availability).toLowerCase();
  
  if (status.includes('in_stock') || status.includes('instock')) return 'in_stock';
  if (status.includes('preorder') || status.includes('précommande')) return 'preorder';
  if (status.includes('out_of_stock') || status.includes('épuisé')) return 'out_of_stock';
  
  return 'unknown';
}

/**
 * Normalise la condition d'un item
 * @param {string} condition - Condition brute
 * @returns {string} Condition normalisée
 */
function normalizeCondition(condition) {
  if (!condition) return 'unknown';
  
  const cond = String(condition).toLowerCase();
  
  if (cond.includes('neuf') || cond.includes('new') || cond.includes('mint')) return 'new';
  if (cond.includes('bon état') || cond.includes('good')) return 'good';
  if (cond.includes('moyen') || cond.includes('fair')) return 'fair';
  if (cond.includes('mauvais') || cond.includes('poor')) return 'poor';
  if (cond.includes('occasion') || cond.includes('used')) return 'used';
  
  return 'unknown';
}

/**
 * Normalise les images (array ou string unique)
 * @param {string|Array<string>} images - Image(s) brute(s)
 * @returns {Object} Images normalisées
 */
function normalizeImages(images) {
  if (!images) {
    return {
      main: null,
      thumbnail: null,
      all: []
    };
  }

  const imageArray = Array.isArray(images) ? images : [images];
  const validImages = imageArray.filter(img => img && typeof img === 'string');

  return {
    main: validImages[0] || null,
    thumbnail: validImages[0] || null,
    all: validImages
  };
}

// ============================================================================
// SEARCH NORMALIZATION
// ============================================================================

/**
 * Normalise un item de résultat de recherche Lulu-Berlu
 * 
 * @param {Object} item - Item brut du provider
 * @returns {Object} Item normalisé Tako_Api v3.0.0
 */
export function normalizeSearchItem(item) {
  if (!item) return null;

  const providerId = String(item.id || 'unknown');
  
  return {
    id: `luluberlu_${providerId}`,
    provider: 'lulu-berlu',
    provider_id: providerId,
    type: 'collectible',
    
    name: extractText(item.name) || '',
    brand: extractText(item.brand) || null,
    series: null,
    category: null,
    year: null,
    
    condition: 'unknown',
    availability: normalizeAvailability(item.availability),
    
    pricing: item.price ? {
      price: item.price,
      currency: 'EUR'
    } : null,
    
    images: normalizeImages(item.image),
    url: item.url || null
  };
}

/**
 * Normalise les résultats de recherche Lulu-Berlu
 * 
 * @param {Object} response - Réponse brute du provider
 * @returns {Object} Résultats normalisés Tako_Api v3.0.0
 */
export function normalizeSearchResults(response) {
  if (!response) {
    return {
      query: '',
      provider: 'lulu-berlu',
      total_results: 0,
      results: []
    };
  }

  const products = response.products || [];
  
  return {
    query: response.query || '',
    provider: 'lulu-berlu',
    total_results: response.total || products.length || 0,
    results: products.map(normalizeSearchItem).filter(Boolean)
  };
}

// ============================================================================
// DETAILS NORMALIZATION
// ============================================================================

/**
 * Normalise les détails complets d'un item Lulu-Berlu
 * 
 * @param {Object} data - Données brutes du provider
 * @returns {Object} Détails normalisés Tako_Api v3.0.0
 */
export function normalizeDetails(data) {
  if (!data) return null;

  const providerId = String(data.id || 'unknown');
  const attrs = data.attributes || {};

  // Extraire l'année depuis les attributs si disponible
  const year = attrs.year ? parseInt(attrs.year, 10) : null;

  // Mapper la condition depuis les attributs
  const conditionFromAttrs = attrs.condition 
    ? normalizeCondition(attrs.condition) 
    : 'unknown';

  // Gérer les traductions (name peut être string ou objet {text, translated})
  const name = extractText(data.name);
  const nameOriginal = typeof data.name === 'object' && data.name.original 
    ? data.name.original 
    : (data.lang === 'fr' ? name : null);
  const nameTranslated = typeof data.name === 'object' && data.name.translated 
    ? data.name.translated 
    : (data.lang !== 'fr' ? name : null);

  const description = extractText(data.description);
  const descriptionOriginal = typeof data.description === 'object' && data.description.original
    ? data.description.original
    : (data.lang === 'fr' ? description : null);
  const descriptionTranslated = typeof data.description === 'object' && data.description.translated
    ? data.description.translated
    : (data.lang !== 'fr' ? description : null);

  return {
    id: `luluberlu_${providerId}`,
    provider: 'lulu-berlu',
    provider_id: providerId,
    type: 'collectible',
    
    name: name || '',
    name_original: nameOriginal,
    name_translated: nameTranslated,
    
    description: description || null,
    description_original: descriptionOriginal,
    description_translated: descriptionTranslated,
    
    brand: extractText(data.brand) || null,
    manufacturer: extractText(data.brand) || null,
    series: null,
    subseries: null,
    category: attrs.type || null,
    
    reference: data.reference || null,
    barcode: null,
    year: year,
    
    condition: conditionFromAttrs,
    availability: normalizeAvailability(data.availability),
    
    pricing: data.price ? {
      price: data.price,
      currency: 'EUR'
    } : null,
    
    attributes: {
      type: attrs.type || null,
      material: attrs.material || null,
      size: attrs.size || null,
      origin: attrs.origin || null,
      condition_details: attrs.condition || null
    },
    
    images: normalizeImages(data.images),
    
    url: data.url || null
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  normalizeSearchItem,
  normalizeSearchResults,
  normalizeDetails
};
