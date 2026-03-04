/**
 * Carddass Normalizer
 * 
 * Normalise les données carddass au format Tako_Api standard.
 * Les données proviennent de PostgreSQL (archivées depuis animecollection.fr).
 * 
 * @module domains/collectibles/normalizers/carddass
 */

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extrait le texte d'une valeur string ou objet de traduction
 * @param {string|Object} value
 * @returns {string|null}
 */
function extractText(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.text) return value.text;
  return String(value);
}

/**
 * Normalise les images d'une carte
 * @param {Object} images - { thumbnail, hd }
 * @returns {Object} Images normalisées
 */
function normalizeCardImages(images) {
  if (!images) {
    return { main: null, thumbnail: null, all: [] };
  }

  const all = [];
  if (images.hd) all.push(images.hd);
  if (images.thumbnail && images.thumbnail !== images.hd) all.push(images.thumbnail);

  return {
    main: images.hd || images.thumbnail || null,
    thumbnail: images.thumbnail || images.hd || null,
    all
  };
}

// ============================================================================
// SEARCH NORMALIZATION
// ============================================================================

/**
 * Normalise un résultat de recherche individuel
 * @param {Object} item - Item brut du provider
 * @returns {Object} Item normalisé
 */
export function normalizeSearchItem(item) {
  if (!item) return null;

  const sourceId = String(item.sourceId || item.id || 'unknown');

  return {
    id: `carddass_${sourceId}`,
    provider: 'carddass',
    provider_id: sourceId,
    type: 'collectible',

    name: `${item.license || 'Carddass'} - ${item.series || 'Unknown'} #${item.cardNumber || '?'}`,
    cardNumber: item.cardNumber || null,
    rarity: item.rarity || null,
    rarityColor: item.rarityColor || null,

    license: item.license || null,
    collection: item.collection || null,
    series: item.series || null,

    images: {
      main: item.hd || item.thumbnail || null,
      thumbnail: item.thumbnail || null,
      all: [item.hd, item.thumbnail].filter(Boolean)
    },

    url: null
  };
}

/**
 * Normalise les résultats de recherche
 * @param {Object} response - Réponse brute du provider
 * @returns {Object} Résultats normalisés
 */
export function normalizeSearchResults(response) {
  if (!response) {
    return {
      query: '',
      provider: 'carddass',
      total_results: 0,
      results: []
    };
  }

  return {
    query: response.query || '',
    provider: 'carddass',
    total_results: response.total || 0,
    results: (response.items || []).map(normalizeSearchItem).filter(Boolean),
    pagination: response.pagination || null
  };
}

// ============================================================================
// DETAIL NORMALIZATION
// ============================================================================

/**
 * Normalise les détails complets d'une carte Carddass
 * @param {Object} data - Données brutes du provider
 * @returns {Object|null} Détails normalisés
 */
export function normalizeDetails(data) {
  if (!data) return null;

  const sourceId = String(data.sourceId || data.id || 'unknown');

  return {
    id: `carddass_${sourceId}`,
    provider: 'carddass',
    provider_id: sourceId,
    type: 'collectible',

    name: buildCardName(data),
    cardNumber: data.cardNumber || null,

    description: null,

    // Classification
    rarity: data.rarity || null,
    rarityColor: data.rarityColor || null,
    license: data.license || null,
    collection: data.collection || null,
    series: data.series || null,

    // Hiérarchie
    hierarchy: data.hierarchy || null,

    // Images
    images: normalizeCardImages(data.images),

    // Images supplémentaires (verso, variantes, etc.)
    extraImages: (data.extraImages || []).map(img => ({
      id: img.id,
      sourceId: img.sourceId,
      label: img.label || null,
      thumbnail: img.thumbnail || null,
      hd: img.hd || null
    })),

    // Packagings
    packagings: (data.packagings || []).map(pack => ({
      id: pack.id,
      sourceId: pack.sourceId,
      label: pack.label || null,
      image: pack.image || null
    })),

    // Métadonnées
    source: 'carddass',
    dataSource: 'database',
    originalSite: 'animecollection.fr'
  };
}

// ============================================================================
// HIERARCHY NORMALIZATION
// ============================================================================

/**
 * Normalise une liste de licences
 * @param {Object} response - Réponse brute
 * @returns {Object}
 */
export function normalizeLicenses(response) {
  if (!response) {
    return { provider: 'carddass', total: 0, items: [], pagination: null };
  }

  return {
    provider: 'carddass',
    total: response.total || 0,
    items: (response.items || []).map(item => ({
      id: item.id,
      sourceId: item.sourceId,
      sourceSite: item.sourceSite || null,
      name: item.name,
      description: item.description || null,
      image: item.image || null,
      banner: item.banner || null,
      collectionCount: item.collectionCount || undefined,
      cardCount: item.cardCount || undefined,
      url: item.url || null
    })),
    pagination: response.pagination || null
  };
}

/**
 * Normalise une liste de collections
 * @param {Object} response - Réponse brute
 * @returns {Object}
 */
export function normalizeCollections(response) {
  if (!response) {
    return { provider: 'carddass', total: 0, items: [], pagination: null };
  }

  return {
    provider: 'carddass',
    license: response.license || null,
    total: response.total || 0,
    items: (response.items || []).map(item => ({
      id: item.id,
      sourceId: item.sourceId,
      sourceSite: item.sourceSite || null,
      name: item.name,
      seriesCount: item.seriesCount || 0,
      cardCount: item.cardCount || 0,
      url: item.url || null
    })),
    pagination: response.pagination || null
  };
}

/**
 * Normalise une liste de séries
 * @param {Object} response - Réponse brute
 * @returns {Object}
 */
export function normalizeSeries(response) {
  if (!response) {
    return { provider: 'carddass', total: 0, items: [], pagination: null };
  }

  return {
    provider: 'carddass',
    license: response.license || null,
    collection: response.collection || null,
    total: response.total || 0,
    items: (response.items || []).map(item => ({
      id: item.id,
      sourceId: item.sourceId,
      sourceSite: item.sourceSite || null,
      name: item.name,
      description: item.description || null,
      capsule: item.capsule || null,
      cardCount: item.cardCount || 0,
      packagingCount: item.packagingCount || 0,
      url: item.url || null
    })),
    pagination: response.pagination || null
  };
}

/**
 * Normalise une liste de cartes
 * @param {Object} response - Réponse brute
 * @returns {Object}
 */
export function normalizeCards(response) {
  if (!response) {
    return { provider: 'carddass', total: 0, items: [], pagination: null };
  }

  return {
    provider: 'carddass',
    license: response.license || null,
    collection: response.collection || null,
    series: response.series || null,
    total: response.total || 0,
    items: (response.items || []).map(item => ({
      id: item.id,
      sourceId: item.sourceId,
      sourceSite: item.sourceSite || null,
      cardNumber: item.cardNumber,
      rarity: item.rarity || null,
      rarityColor: item.rarityColor || null,
      images: item.images || null,
      license: item.license || null,
      collection: item.collection || null,
      series: item.series || null
    })),
    pagination: response.pagination || null
  };
}

// ============================================================================
// HELPERS INTERNES
// ============================================================================

/**
 * Construit un nom lisible pour une carte
 * @param {Object} data - Données de la carte
 * @returns {string}
 */
function buildCardName(data) {
  const parts = [];
  if (data.license) parts.push(data.license);
  if (data.series) parts.push(data.series);
  if (data.cardNumber) parts.push(`#${data.cardNumber}`);
  if (data.rarity && data.rarity !== 'Regular') parts.push(`(${data.rarity})`);
  return parts.join(' - ') || `Carddass Card #${data.sourceId || data.id}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  normalizeSearchItem,
  normalizeSearchResults,
  normalizeDetails,
  normalizeLicenses,
  normalizeCollections,
  normalizeSeries,
  normalizeCards
};
