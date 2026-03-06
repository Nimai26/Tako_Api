/**
 * Normalizer Amazon
 * Transforme les données brutes Amazon en format normalisé Tako API
 * 
 * Format Tako standard pour chaque item :
 * - id: identifiant unique prefixé (amazon:{asin})
 * - sourceId: ASIN
 * - title: titre du produit
 * - description: description produit
 * - images: { primary, thumbnail, additional[] }
 * - urls: { detail (API), source (Amazon) }
 * - details: { price, marketplace, isPrime, rating, brand, ... }
 * 
 * @module domains/ecommerce/normalizers/amazon
 */

import { translateText } from '../../../shared/utils/translator.js';

/**
 * Informations des marketplaces
 */
const MARKETPLACE_INFO = {
  fr: { code: 'fr', name: 'Amazon France', domain: 'www.amazon.fr', currency: 'EUR' },
  us: { code: 'us', name: 'Amazon US', domain: 'www.amazon.com', currency: 'USD' },
  uk: { code: 'uk', name: 'Amazon UK', domain: 'www.amazon.co.uk', currency: 'GBP' },
  de: { code: 'de', name: 'Amazon Allemagne', domain: 'www.amazon.de', currency: 'EUR' },
  es: { code: 'es', name: 'Amazon Espagne', domain: 'www.amazon.es', currency: 'EUR' },
  it: { code: 'it', name: 'Amazon Italie', domain: 'www.amazon.it', currency: 'EUR' },
  jp: { code: 'jp', name: 'Amazon Japon', domain: 'www.amazon.co.jp', currency: 'JPY' },
  ca: { code: 'ca', name: 'Amazon Canada', domain: 'www.amazon.ca', currency: 'CAD' }
};

/**
 * Récupère les infos d'un marketplace
 */
function getMarketplaceInfo(code) {
  return MARKETPLACE_INFO[code] || {
    code: code,
    name: `Amazon ${code.toUpperCase()}`,
    domain: `www.amazon.${code}`,
    currency: 'EUR'
  };
}

/**
 * Normalise un item de recherche au format Tako standard
 */
function normalizeSearchItem(item, marketplace) {
  const asin = item.asin;
  
  return {
    id: `amazon:${asin}`,
    sourceId: asin,
    title: item.title || null,
    description: null,
    images: {
      primary: item.image || null,
      thumbnail: item.image || null
    },
    urls: {
      detail: `/api/ecommerce/amazon/product/${asin}?country=${marketplace.code}`,
      source: item.url || `https://${marketplace.domain}/dp/${asin}`
    },
    details: {
      asin,
      marketplace: marketplace.code,
      marketplaceName: marketplace.name,
      price: item.priceValue || null,
      priceFormatted: item.price || null,
      currency: item.currency || marketplace.currency,
      isPrime: item.isPrime === true,
      rating: item.rating || null,
      reviewCount: item.reviewCount || null
    }
  };
}

/**
 * Normalise les résultats de recherche Amazon
 * 
 * @param {object} rawData - Données brutes de searchAmazon
 * @param {object} options - Options de normalisation
 * @param {string} options.lang - Langue de sortie
 * @param {boolean} options.autoTrad - Active traduction automatique
 * @returns {Promise<Array>} - Résultats normalisés
 */
export async function normalizeSearchResults(rawData, options = {}) {
  const { lang = 'fr', autoTrad = false } = options;
  
  if (!rawData || !rawData.results) {
    return [];
  }
  
  const marketplace = getMarketplaceInfo(rawData.country);
  
  const normalized = [];
  
  for (const item of rawData.results) {
    const norm = normalizeSearchItem(item, marketplace);
    
    // Traduction du titre si demandée
    if (autoTrad && norm.title && lang !== marketplace.code) {
      try {
        norm.title = await translateText(norm.title, marketplace.code, lang);
      } catch (err) {
        // Garder le titre original en cas d'erreur
      }
    }
    
    normalized.push(norm);
  }
  
  return normalized;
}

/**
 * Normalise les détails d'un produit Amazon au format Tako standard
 * 
 * @param {object} rawData - Données brutes de getAmazonProduct
 * @param {object} options - Options de normalisation
 * @param {string} options.lang - Langue de sortie
 * @param {boolean} options.autoTrad - Active traduction automatique
 * @returns {Promise<object>} - Produit normalisé
 */
export async function normalizeProductDetails(rawData, options = {}) {
  const { lang = 'fr', autoTrad = false } = options;
  
  if (!rawData) return null;
  
  const marketplace = getMarketplaceInfo(rawData.marketplace);
  const asin = rawData.asin;
  
  let title = rawData.title || null;
  let description = rawData.description || null;
  
  // Traduction si demandée
  if (autoTrad && lang !== marketplace.code) {
    try {
      if (title) title = await translateText(title, marketplace.code, lang);
      if (description) description = await translateText(description, marketplace.code, lang);
    } catch (err) {
      // Garder texte original en cas d'erreur
    }
  }
  
  // Construire les images
  const imageList = [];
  if (rawData.images && Array.isArray(rawData.images)) {
    imageList.push(...rawData.images);
  } else if (rawData.image) {
    imageList.push(rawData.image);
  }
  
  return {
    id: `amazon:${asin}`,
    sourceId: asin,
    title,
    description,
    images: {
      primary: imageList[0] || null,
      thumbnail: imageList[0] || null,
      additional: imageList.slice(1)
    },
    urls: {
      detail: `/api/ecommerce/amazon/product/${asin}?country=${marketplace.code}`,
      source: rawData.url || `https://${marketplace.domain}/dp/${asin}`
    },
    details: {
      asin,
      marketplace: marketplace.code,
      marketplaceName: marketplace.name,
      price: rawData.priceValue || null,
      priceFormatted: rawData.price || null,
      currency: rawData.currency || marketplace.currency,
      isPrime: rawData.isPrime === true,
      rating: rawData.rating || null,
      ratingMax: 5,
      reviewCount: rawData.reviewCount || null,
      brand: rawData.brand || null
    }
  };
}

/**
 * Normalise les résultats de comparaison de prix
 * 
 * @param {object} rawData - Données brutes de comparePrices
 * @returns {object} - Comparaison normalisée
 */
export function normalizePriceComparison(rawData) {
  if (!rawData || !rawData.comparison) {
    return null;
  }
  
  const comparison = rawData.comparison.map(item => {
    const marketplace = getMarketplaceInfo(item.country);
    
    return {
      marketplace: {
        code: item.country,
        name: marketplace.name,
        currency: marketplace.currency
      },
      available: item.available === true,
      price: item.available ? {
        value: item.price,
        currency: item.currency,
        formatted: item.priceFormatted
      } : null,
      isPrime: item.isPrime === true,
      url: item.url || null,
      error: item.error || null
    };
  });
  
  // Trouver le moins cher
  const availablePrices = comparison.filter(c => c.available && c.price && c.price.value);
  let cheapest = null;
  
  if (availablePrices.length > 0) {
    const rates = { USD: 0.92, GBP: 1.17, CAD: 0.67, JPY: 0.0062, EUR: 1 };
    
    cheapest = availablePrices.reduce((best, current) => {
      const currentValueEur = (current.price.value || 0) * (rates[current.price.currency] || 1);
      const bestValueEur = (best.price.value || 0) * (rates[best.price.currency] || 1);
      return currentValueEur < bestValueEur ? current : best;
    });
  }
  
  return {
    asin: rawData.asin,
    comparison,
    summary: {
      total: comparison.length,
      available: availablePrices.length,
      cheapest: cheapest ? {
        marketplace: cheapest.marketplace.code,
        price: cheapest.price
      } : null
    }
  };
}
