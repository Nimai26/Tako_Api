/**
 * src/domains/collectibles/normalizers/coleka.normalizer.js - Normalizer Coleka
 * 
 * Transforme les données brutes de Coleka en format standard Tako_Api
 * 
 * @module domains/collectibles/normalizers/coleka
 */

/**
 * Extrait le texte d'une valeur qui peut être une chaîne ou un objet de traduction
 * @param {string|Object} value - Valeur à extraire
 * @returns {string|null}
 */
const extractText = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.text) return value.text;
  return null;
};

/**
 * Parse une année depuis différents formats
 * @param {string|number} value - Valeur à parser
 * @returns {number|null}
 */
const parseYear = (value) => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  const match = String(value).match(/\d{4}/);
  return match ? parseInt(match[0]) : null;
};

/**
 * Normalise un résultat de recherche individuel
 * @param {Object} item - Item brut
 * @returns {Object} - Item normalisé
 */
export function normalizeSearchResult(item) {
  const providerId = item.id || item.path?.split('/').pop() || 'unknown';
  
  return {
    id: `coleka_${providerId}`,
    provider: 'coleka',
    provider_id: providerId,
    type: 'collectible',
    
    name: extractText(item.name_translated) || extractText(item.name) || '',
    name_original: extractText(item.name) || null,
    name_translated: extractText(item.name_translated) || null,
    
    brand: null,
    series: null,
    category: item.category || null,
    collection: item.collection || null,
    
    images: {
      thumbnail: item.image || null,
      main: item.image || null,
      all: item.image ? [item.image] : []
    },
    
    url: item.url || null,
    detailUrl: item.url ? `coleka://item${item.path || '/' + item.id}` : null
  };
}

/**
 * Normalise une réponse de recherche Coleka
 * @param {Object} rawData - Données brutes de la recherche
 * @returns {Object} - Résultat normalisé
 */
export function normalizeSearchResults(rawData) {
  if (!rawData) {
    return {
      query: '',
      provider: 'coleka',
      totalResults: 0,
      items: [],
      metadata: {
        source: 'coleka'
      }
    };
  }
  
  return {
    query: rawData.query || '',
    provider: 'coleka',
    totalResults: rawData.total || rawData.products?.length || 0,
    items: (rawData.products || []).map(normalizeSearchResult),
    metadata: {
      category: rawData.category || null,
      source: 'coleka'
    }
  };
}

/**
 * Normalise les détails d'un item Coleka
 * @param {Object} rawData - Données brutes de l'item
 * @returns {Object} - Détails normalisés
 */
export function normalizeDetails(rawData) {
  if (!rawData) return null;
  
  const providerId = rawData.id || rawData.url?.split('/').pop() || 'unknown';
  
  // Extraire le nombre de pièces depuis les attributs
  let piecesCount = null;
  if (rawData.attributes?.pièces) {
    piecesCount = parseInt(rawData.attributes.pièces, 10) || null;
  } else if (rawData.attributes?.pieces) {
    piecesCount = parseInt(rawData.attributes.pieces, 10) || null;
  }
  
  // Construire le tableau d'images avec déduplication
  const allImages = rawData.images || [];
  const mainImage = allImages.length > 0 ? allImages[0] : null;
  const thumbnail = mainImage;
  
  return {
    id: `coleka_${providerId}`,
    provider: 'coleka',
    provider_id: providerId,
    type: 'collectible',
    
    name: extractText(rawData.name) || '',
    name_original: extractText(rawData.name_original) || null,
    name_translated: extractText(rawData.name_translated) || null,
    
    description: extractText(rawData.description) || null,
    description_original: extractText(rawData.description_original) || null,
    description_translated: extractText(rawData.description_translated) || null,
    
    brand: rawData.brand || (rawData.brands && rawData.brands[0]) || null,
    brands: rawData.brands || [],
    manufacturer: rawData.brand || null,
    series: rawData.series || null,
    subseries: rawData.collection || null,
    category: rawData.category || null,
    
    reference: rawData.reference || null,
    barcode: rawData.barcode || null,
    year: parseYear(rawData.year),
    
    condition: 'unknown',
    availability: 'unknown',
    
    pricing: null,
    
    images: {
      thumbnail,
      main: mainImage,
      all: allImages
    },
    
    attributes: {
      pieces_count: piecesCount,
      ...rawData.attributes
    },
    
    metadata: {
      source: 'coleka',
      url: rawData.url || null,
      lastUpdated: new Date().toISOString()
    }
  };
}

/**
 * Normalise la liste des catégories
 * @param {Object} rawData - Données brutes des catégories
 * @returns {Object} - Catégories normalisées
 */
export function normalizeCategories(rawData) {
  if (!rawData || !rawData.categories) {
    return {
      provider: 'coleka',
      totalCategories: 0,
      categories: []
    };
  }
  
  return {
    provider: 'coleka',
    totalCategories: rawData.categories.length,
    categories: rawData.categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || null
    })),
    metadata: {
      lang: rawData.lang || 'fr',
      source: 'coleka'
    }
  };
}
