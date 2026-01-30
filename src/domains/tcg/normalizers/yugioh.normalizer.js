/**
 * Normalizer Yu-Gi-Oh! (YGOPRODeck API)
 * Transforme les réponses YGOPRODeck en format Tako API unifié
 */

import { translateText } from '../../../shared/utils/translator.js';

/**
 * Normaliser les résultats de recherche Yu-Gi-Oh!
 * @param {Object} rawData - Données brutes du provider { data: [...], total_cards: number }
 * @param {Object} options - Options de normalisation
 * @param {string} options.lang - Langue cible
 * @param {boolean} options.autoTrad - Activer la traduction automatique
 */
export async function normalizeSearchResults(rawData, options = {}) {
  const { lang = 'en', autoTrad = false } = options;
  
  if (!rawData || !rawData.data || rawData.data.length === 0) {
    return [];
  }
  
  const normalizedCards = await Promise.all(
    rawData.data.map(card => normalizeCardSummary(card, { lang, autoTrad }))
  );
  
  return normalizedCards;
}

/**
 * Normaliser un résumé de carte (pour les listes)
 */
async function normalizeCardSummary(rawCard, options = {}) {
  const { lang = 'en', autoTrad = false } = options;
  
  // Description du type de carte
  let subtitle = rawCard.type || 'Card';
  
  // Traduction du texte si nécessaire
  let description = rawCard.desc || '';
  if (autoTrad && lang !== 'en' && description) {
    try {
      description = await translateText(description, lang);
    } catch (error) {
      // Conserver la version originale en cas d'erreur
    }
  }
  
  // Image (utiliser la première image disponible)
  const imageUrl = rawCard.card_images?.[0]?.image_url || 
                   rawCard.card_images?.[0]?.image_url_small || '';
  const thumbnailUrl = rawCard.card_images?.[0]?.image_url_small || imageUrl;
  
  return {
    id: String(rawCard.id),
    source: 'yugioh',
    collection: 'Yu-Gi-Oh! Trading Card Game',
    title: rawCard.name,
    subtitle,
    description: `${subtitle} - ${description.substring(0, 150)}${description.length > 150 ? '...' : ''}`,
    image: imageUrl,
    thumbnail: thumbnailUrl,
    year: extractYear(rawCard),
    metadata: {
      type: rawCard.type,
      race: rawCard.race, // Dragon, Spellcaster, etc.
      archetype: rawCard.archetype,
      // Pour les monstres
      ...(rawCard.atk !== undefined && { atk: rawCard.atk }),
      ...(rawCard.def !== undefined && { def: rawCard.def }),
      ...(rawCard.level !== undefined && { level: rawCard.level }),
      ...(rawCard.attribute && { attribute: rawCard.attribute }),
      // Pour les Link monsters
      ...(rawCard.linkval !== undefined && { linkval: rawCard.linkval }),
      ...(rawCard.linkmarkers && { linkmarkers: rawCard.linkmarkers }),
      // Pour les Pendulum
      ...(rawCard.scale !== undefined && { scale: rawCard.scale })
    },
    detailUrl: `/api/tcg/yugioh/card/${rawCard.id}`
  };
}

/**
 * Normaliser les détails complets d'une carte
 */
export async function normalizeCardDetails(rawCard, options = {}) {
  const { lang = 'en', autoTrad = false } = options;
  
  // Traduction de la description
  let description = rawCard.desc || '';
  let pendulumEffect = rawCard.pend_desc || null;
  
  if (autoTrad && lang !== 'en') {
    try {
      if (description) {
        description = await translateText(description, lang);
      }
      if (pendulumEffect) {
        pendulumEffect = await translateText(pendulumEffect, lang);
      }
    } catch (error) {
      // Conserver les versions originales
    }
  }
  
  // Images multiples (normal, cropped, small)
  const images = rawCard.card_images?.map((img, index) => ({
    url: img.image_url,
    thumbnail: img.image_url_small,
    cropped: img.image_url_cropped,
    caption: index === 0 ? 'Carte' : `Alternative ${index}`,
    isMain: index === 0
  })) || [];
  
  return {
    id: String(rawCard.id),
    source: 'yugioh',
    title: rawCard.name,
    subtitle: rawCard.type,
    description,
    images,
    year: extractYear(rawCard),
    metadata: {
      // Informations de base
      type: rawCard.type,
      frameType: rawCard.frameType, // normal, effect, ritual, fusion, synchro, xyz, link
      race: rawCard.race,
      archetype: rawCard.archetype,
      
      // Monstre stats
      ...(rawCard.atk !== undefined && { atk: rawCard.atk }),
      ...(rawCard.def !== undefined && { def: rawCard.def }),
      ...(rawCard.level !== undefined && { level: rawCard.level }),
      ...(rawCard.attribute && { attribute: rawCard.attribute }),
      
      // Link Monster
      ...(rawCard.linkval !== undefined && { linkval: rawCard.linkval }),
      ...(rawCard.linkmarkers && { linkmarkers: rawCard.linkmarkers }),
      
      // Pendulum
      ...(rawCard.scale !== undefined && { scale: rawCard.scale }),
      ...(pendulumEffect && { pendulumEffect }),
      
      // Sets disponibles
      cardSets: rawCard.card_sets?.map(set => ({
        name: set.set_name,
        code: set.set_code,
        rarity: set.set_rarity,
        rarityCode: set.set_rarity_code,
        price: set.set_price
      })) || [],
      
      // Banlist info
      banlistInfo: rawCard.banlist_info ? {
        tcg: rawCard.banlist_info.ban_tcg,
        ocg: rawCard.banlist_info.ban_ocg,
        goat: rawCard.banlist_info.ban_goat
      } : null,
      
      // Misc
      ygoprodeckUrl: rawCard.ygoprodeck_url,
      betaId: rawCard.id,
      betaName: rawCard.beta_name
    },
    prices: extractPrices(rawCard),
    externalLinks: {
      ygoprodeck: rawCard.ygoprodeck_url,
      cardmarket: rawCard.card_images?.[0]?.image_url ? 
        `https://www.cardmarket.com/en/YuGiOh/Products/Search?searchString=${encodeURIComponent(rawCard.name)}` : null,
      tcgplayer: `https://www.tcgplayer.com/search/yugioh/product?productLineName=yugioh&q=${encodeURIComponent(rawCard.name)}`
    }
  };
}

/**
 * Normaliser la liste des sets
 */
export async function normalizeSets(rawData, options = {}) {
  const { lang = 'en' } = options;
  
  if (!rawData || !Array.isArray(rawData)) {
    return [];
  }
  
  return rawData.map(set => ({
    id: set.set_name,
    source: 'yugioh',
    title: set.set_name,
    subtitle: 'Set',
    description: null,
    image: null,
    thumbnail: null,
    year: extractYearFromSetName(set.set_name),
    metadata: {
      name: set.set_name,
      numOfCards: set.num_of_cards,
      tcgDate: set.tcg_date,
      ocgDate: set.ocg_date
    }
  }));
}

/**
 * Normaliser les résultats de recherche par archétype
 */
export async function normalizeArchetypeResults(rawData, options = {}) {
  const { lang = 'en', autoTrad = false } = options;
  
  if (!rawData || !rawData.data || rawData.data.length === 0) {
    return [];
  }
  
  const normalizedCards = await Promise.all(
    rawData.data.map(card => normalizeCardSummary(card, { lang, autoTrad }))
  );
  
  return normalizedCards;
}

/**
 * Extraire l'année de sortie d'une carte
 */
function extractYear(card) {
  // Essayer de trouver une date dans les sets
  if (card.card_sets && card.card_sets.length > 0) {
    // Chercher la date TCG la plus ancienne
    const dates = card.card_sets
      .map(set => {
        // Format potentiel: YYYY-MM-DD
        const match = set.set_name?.match(/\b(19|20)\d{2}\b/);
        return match ? parseInt(match[0]) : null;
      })
      .filter(year => year !== null);
    
    if (dates.length > 0) {
      return Math.min(...dates);
    }
  }
  
  // Pas de date trouvée
  return null;
}

/**
 * Extraire l'année depuis le nom du set
 */
function extractYearFromSetName(setName) {
  const match = setName?.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : null;
}

/**
 * Extraire les prix depuis les données de carte
 */
function extractPrices(card) {
  if (!card.card_prices || card.card_prices.length === 0) {
    return null;
  }
  
  // YGOPRODeck retourne plusieurs objets de prix (historique)
  // On prend le plus récent (premier élément)
  const latestPrice = card.card_prices[0];
  
  return {
    cardmarket: latestPrice.cardmarket_price,
    tcgplayer: latestPrice.tcgplayer_price,
    ebay: latestPrice.ebay_price,
    amazon: latestPrice.amazon_price,
    coolstuffinc: latestPrice.coolstuffinc_price,
    currency: 'USD/EUR',
    source: 'ygoprodeck',
    updatedAt: new Date().toISOString()
  };
}
