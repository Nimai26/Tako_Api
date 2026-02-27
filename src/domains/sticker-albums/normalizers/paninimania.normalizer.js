/**
 * Paninimania Normalizer
 * 
 * Normalizes Paninimania data to Tako_Api standard format
 * Preserves ALL complex data: specialStickers, additionalImages, articles, checklist
 * 
 * @module domains/sticker-albums/normalizers/paninimania
 */

/**
 * Extract text from translation object or string
 * @param {string|object} value - String or translation object {text, translated, from, to}
 * @returns {string|null} Extracted text
 */
function extractText(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.text) return value.text;
  return String(value);
}

/**
 * Normalize search results
 * @param {object} response - Raw response from provider
 * @returns {object} Normalized response
 */
export function normalizeSearchResults(response) {
  if (!response || !response.results) {
    return {
      query: response?.query || '',
      formattedQuery: response?.formattedQuery || '',
      total: 0,
      results: [],
      source: 'paninimania'
    };
  }

  const normalizedResults = response.results.map(item => ({
    id: item.id,
    title: extractText(item.title),
    url: item.url,
    image: item.image,
    thumbnail: item.thumbnail,
    year: item.year
  }));

  return {
    query: response.query,
    formattedQuery: response.formattedQuery,
    total: normalizedResults.length,
    results: normalizedResults,
    source: 'paninimania'
  };
}

/**
 * Normalize album details
 * CRITICAL: Preserves ALL data including specialStickers, additionalImages, articles
 * @param {object} data - Raw album data from provider
 * @returns {object} Normalized album data
 */
export function normalizeDetails(data) {
  if (!data) {
    return null;
  }

  // Normalize checklist - preserve structure
  let normalizedChecklist = null;
  if (data.checklist) {
    normalizedChecklist = {
      raw: data.checklist.raw,
      total: data.checklist.total,
      items: data.checklist.items,
      totalWithSpecials: data.checklist.totalWithSpecials || data.checklist.total
    };
  }

  // Normalize special stickers - CRITICAL: preserve ALL types
  let normalizedSpecialStickers = null;
  if (data.specialStickers && Array.isArray(data.specialStickers)) {
    normalizedSpecialStickers = data.specialStickers.map(special => ({
      name: special.name,
      raw: special.raw,
      total: special.total,
      list: special.list // Array of numbers, letters, or alphanumeric
    }));
  }

  // Normalize additional images - preserve captions
  let normalizedAdditionalImages = null;
  if (data.additionalImages && Array.isArray(data.additionalImages)) {
    normalizedAdditionalImages = data.additionalImages.map(img => ({
      url: img.url,
      caption: extractText(img.caption)
    }));
  }

  // Normalize categories
  let normalizedCategories = null;
  if (data.categories && Array.isArray(data.categories)) {
    normalizedCategories = data.categories.map(cat => extractText(cat));
  }

  // Normalize articles
  let normalizedArticles = null;
  if (data.articles && Array.isArray(data.articles)) {
    normalizedArticles = data.articles.map(art => extractText(art));
  }

  return {
    id: data.id,
    title: extractText(data.title),
    url: data.url,
    description: extractText(data.description),
    mainImage: data.mainImage,
    barcode: data.barcode,
    copyright: data.copyright,
    releaseDate: data.releaseDate,
    editor: data.editor,
    checklist: normalizedChecklist,
    categories: normalizedCategories,
    additionalImages: normalizedAdditionalImages,
    articles: normalizedArticles,
    specialStickers: normalizedSpecialStickers,
    source: 'paninimania'
  };
}
