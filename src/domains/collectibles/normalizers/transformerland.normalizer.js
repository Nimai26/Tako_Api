/**
 * Transformerland Normalizer
 * 
 * Normalizes Transformerland data to Tako_Api standard format
 * 
 * @module domains/collectibles/normalizers/transformerland
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
      count: 0,
      results: [],
      source: 'transformerland'
    };
  }

  const normalizedResults = response.results.map(item => ({
    id: item.id,
    name: extractText(item.name),
    url: item.url,
    image: item.image,
    price: item.price,
    currency: item.currency,
    availability: item.availability,
    series: extractText(item.series),
    subgroup: extractText(item.subgroup),
    allegiance: extractText(item.allegiance),
    year: item.year,
    condition: item.condition
  }));

  return {
    query: response.query,
    count: normalizedResults.length,
    results: normalizedResults,
    source: 'transformerland'
  };
}

/**
 * Normalize item details
 * @param {object} data - Raw item data from provider
 * @returns {object} Normalized item data
 */
export function normalizeDetails(data) {
  if (!data) {
    return null;
  }

  return {
    id: data.id,
    url: data.url,
    name: extractText(data.name),
    images: data.images || [],
    description: extractText(data.description),
    price: data.price,
    currency: data.currency,
    availability: data.availability,
    condition: data.condition,
    series: extractText(data.series),
    subgroup: extractText(data.subgroup),
    faction: extractText(data.faction),
    size: data.size,
    year: data.year,
    manufacturer: data.manufacturer,
    attributes: data.attributes || {},
    source: 'transformerland'
  };
}
