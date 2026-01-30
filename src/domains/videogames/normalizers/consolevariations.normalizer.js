/**
 * ConsoleVariations Normalizer
 * 
 * Normalise les données ConsoleVariations au format Tako_Api standard
 * 
 * @module domains/videogames/normalizers/consolevariations
 */

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Mapping des types de release vers noms normalisés
 */
const RELEASE_TYPE_MAP = {
  'retail': 'retail',
  'promotional': 'promotional',
  'promo': 'promotional',
  'bundle': 'bundle',
  'prototype': 'prototype',
  'dev kit': 'prototype',
  'development': 'prototype',
  'test': 'prototype',
  'special': 'other',
  'limited': 'other'
};

/**
 * Normalise un type de release
 * @param {string} type - Type original
 * @returns {string|null}
 */
function normalizeReleaseType(type) {
  if (!type) return null;
  const normalized = type.toLowerCase().trim();
  return RELEASE_TYPE_MAP[normalized] || 'other';
}

/**
 * Détermine le type d'item depuis le contexte
 * @param {string} type - Type de filtre utilisé
 * @returns {string}
 */
function normalizeItemType(type) {
  if (!type) return 'unknown';
  
  const normalized = type.toLowerCase();
  
  if (normalized === 'consoles' || normalized === 'console') return 'console';
  if (normalized === 'controllers' || normalized === 'controller') return 'controller';
  if (normalized === 'accessories' || normalized === 'accessory') return 'accessory';
  
  return 'unknown';
}

// ============================================================================
// NORMALIZERS
// ============================================================================

/**
 * Normalise un résultat de recherche ConsoleVariations
 * @param {Object} item - Item brut de recherche
 * @param {string} searchType - Type de recherche
 * @returns {Object}
 */
export function normalizeSearchResult(item, searchType = 'all') {
  return {
    type: 'console_variation',
    source: 'consolevariations',
    sourceId: item.id || item.slug,
    
    name: item.name || null,
    name_original: item.name || null,
    
    image: item.thumbnail || item.image || null,
    thumbnail: item.thumbnail || item.image || null,
    
    src_url: item.url || null,
    
    item_type: normalizeItemType(searchType),
    
    // URL pour détails via Tako_Api
    detailUrl: item.slug 
      ? `/api/videogames/consolevariations/details?url=consolevariations://item/${encodeURIComponent(item.slug)}`
      : null
  };
}

/**
 * Normalise les résultats de recherche ConsoleVariations
 * @param {Object} rawData - Données brutes du provider
 * @returns {Object}
 */
export function normalizeSearchResults(rawData) {
  if (!rawData || !rawData.results) {
    return {
      items: [],
      total: 0,
      metadata: {
        source: 'consolevariations',
        query: null,
        type: 'all'
      }
    };
  }
  
  const searchType = rawData.type || 'all';
  const items = rawData.results.map(item => normalizeSearchResult(item, searchType));
  
  return {
    items,
    total: items.length,
    metadata: {
      source: 'consolevariations',
      query: rawData.query || null,
      type: searchType
    }
  };
}

/**
 * Normalise les détails d'un item ConsoleVariations
 * @param {Object} rawData - Données brutes du provider
 * @returns {Object}
 */
export function normalizeDetails(rawData) {
  if (!rawData) return null;
  
  // Helper pour extraire le texte (gère à la fois string et objet { text, translated })
  const extractText = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.text) return value.text;
    return null;
  };
  
  // Images
  const images = (rawData.images || []).map((img, index) => ({
    url: img.url,
    thumbnail: img.thumbnail || img.url,
    alt: img.alt || extractText(rawData.name) || '',
    isMain: img.isMain === true || index === 0
  }));
  
  // Platform
  const platform = rawData.platform ? {
    id: rawData.platform.slug,
    name: rawData.platform.name
  } : null;
  
  // Rarity
  const rarity = {
    score: rawData.rarity?.score || null,
    level: rawData.rarity?.level || 'unknown'
  };
  
  // Community stats
  const community = {
    wantCount: rawData.community?.wantCount || 0,
    ownCount: rawData.community?.ownCount || 0
  };
  
  return {
    type: 'console_variation',
    source: 'consolevariations',
    sourceId: rawData.id || rawData.slug,
    
    name: extractText(rawData.name),
    name_original: extractText(rawData.nameOriginal) || extractText(rawData.name),
    name_translated: extractText(rawData.nameTranslated),
    
    url: rawData.url,
    src_url: rawData.url,
    
    brand: rawData.brand,
    platform,
    
    images,
    
    releaseCountry: rawData.releaseCountry,
    releaseYear: rawData.releaseYear,
    releaseType: normalizeReleaseType(rawData.releaseType),
    regionCode: rawData.regionCode,
    
    productionQuantity: rawData.amountProduced,
    isLimitedEdition: rawData.isLimitedEdition === true,
    isBundle: rawData.isBundle === true,
    color: rawData.color,
    barcode: rawData.barcode,
    
    rarity,
    community
  };
}

/**
 * Normalise la liste de plateformes/marques
 * @param {Object} rawData - Données brutes du provider
 * @returns {Object}
 */
export function normalizePlatforms(rawData) {
  if (!rawData || !rawData.results) {
    return {
      items: [],
      total: 0,
      metadata: {
        source: 'consolevariations',
        type: 'platforms',
        brand: null
      }
    };
  }
  
  const items = rawData.results.map(item => ({
    id: item.id || item.slug,
    slug: item.slug,
    name: item.name,
    url: item.url,
    brand: item.brand || rawData.brand || null
  }));
  
  return {
    items,
    total: items.length,
    metadata: {
      source: 'consolevariations',
      type: rawData.type || 'platforms',
      brand: rawData.brand || null
    }
  };
}

/**
 * Normalise le browse d'une plateforme
 * @param {Object} rawData - Données brutes du provider
 * @returns {Object}
 */
export function normalizeBrowse(rawData) {
  if (!rawData || !rawData.results) {
    return {
      items: [],
      total: 0,
      metadata: {
        source: 'consolevariations',
        platform: null
      }
    };
  }
  
  const items = rawData.results.map(item => ({
    type: 'console_variation',
    source: 'consolevariations',
    sourceId: item.id || item.slug,
    
    name: item.name,
    name_original: item.name,
    
    image: item.thumbnail,
    thumbnail: item.thumbnail,
    
    src_url: item.url,
    
    detailUrl: item.slug
      ? `/api/videogames/consolevariations/details?url=consolevariations://item/${encodeURIComponent(item.slug)}`
      : null
  }));
  
  return {
    items,
    total: items.length,
    metadata: {
      source: 'consolevariations',
      platform: rawData.platform || null
    }
  };
}
