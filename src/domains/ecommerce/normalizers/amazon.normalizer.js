/**
 * Normalizer Amazon
 * Transforme les données brutes Amazon en format normalisé Tako API
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
    let title = item.title || null;
    
    // Traduction du titre si demandée
    if (autoTrad && title && lang !== marketplace.code) {
      try {
        title = await translateText(title, marketplace.code, lang);
      } catch (err) {
        // Garder le titre original en cas d'erreur
      }
    }
    
    normalized.push({
      id: item.asin,
      source: 'amazon',
      collection: marketplace.name,
      title,
      subtitle: buildPriceSubtitle(item),
      description: null,
      image: item.image || null,
      thumbnail: item.image || null,
      year: null,
      metadata: {
        asin: item.asin,
        marketplace: marketplace.code,
        marketplaceName: marketplace.name,
        price: {
          value: item.priceValue,
          currency: item.currency || marketplace.currency,
          formatted: item.price
        },
        isPrime: item.isPrime === true,
        rating: item.rating || null,
        reviewCount: item.reviewCount || null,
        url: item.url
      }
    });
  }
  
  return normalized;
}

/**
 * Normalise les détails d'un produit Amazon
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
  
  let title = rawData.title || null;
  let description = rawData.description || null;
  
  // Traduction si demandée
  if (autoTrad && lang !== marketplace.code) {
    try {
      if (title) {
        title = await translateText(title, marketplace.code, lang);
      }
      if (description) {
        description = await translateText(description, marketplace.code, lang);
      }
    } catch (err) {
      // Garder texte original en cas d'erreur
    }
  }
  
  // Construire les images
  const images = [];
  if (rawData.images && Array.isArray(rawData.images)) {
    rawData.images.forEach((url, index) => {
      images.push({
        url,
        thumbnail: url,
        caption: index === 0 ? 'Image principale' : `Image ${index + 1}`,
        isMain: index === 0
      });
    });
  } else if (rawData.image) {
    images.push({
      url: rawData.image,
      thumbnail: rawData.image,
      caption: 'Image principale',
      isMain: true
    });
  }
  
  return {
    id: rawData.asin,
    source: 'amazon',
    title,
    subtitle: buildPriceSubtitle(rawData),
    description,
    images,
    year: null,
    metadata: {
      asin: rawData.asin,
      marketplace: marketplace.code,
      marketplaceName: marketplace.name,
      price: {
        value: rawData.priceValue,
        currency: rawData.currency || marketplace.currency,
        formatted: rawData.price
      },
      isPrime: rawData.isPrime === true,
      rating: {
        value: rawData.rating || null,
        max: 5,
        count: rawData.reviewCount || null
      },
      brand: rawData.brand || null,
      url: rawData.url,
      available: !rawData.error
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
    // Convertir tout en EUR pour comparer (simplifié)
    const rates = { USD: 0.92, GBP: 1.17, CAD: 0.67, JPY: 0.0062, EUR: 1 };
    
    cheapest = availablePrices.reduce((best, current) => {
      const currentValueEur = (current.price.value || 0) * (rates[current.price.currency] || 1);
      const bestValueEur = (best.price.value || 0) * (rates[best.price.currency] || 1);
      return currentValueEur < bestValueEur ? current : best;
    });
  }
  
  return {
    asin: rawData.asin,
    source: 'amazon',
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

/**
 * Construit le sous-titre avec le prix
 */
function buildPriceSubtitle(item) {
  const parts = [];
  
  if (item.priceValue && item.price) {
    parts.push(item.price);
  }
  
  if (item.isPrime) {
    parts.push('Prime');
  }
  
  if (item.rating) {
    parts.push(`${item.rating}/5`);
  }
  
  return parts.join(' • ') || null;
}
