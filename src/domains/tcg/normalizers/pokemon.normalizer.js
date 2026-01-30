/**
 * Normalizer Pokémon TCG
 * Normalise les données de l'API pokemontcg.io vers le format Tako_Api
 */

import { translateText } from '../../../shared/utils/translator.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Helper pour extraire du texte ou traduction
 */
function extractText(value) {
  if (!value) return null;
  if (typeof value === 'object' && value.translated) {
    return value.translated;
  }
  return typeof value === 'string' ? value : String(value);
}

/**
 * Normalise les résultats de recherche Pokemon TCG
 */
export async function normalizeSearchResults(rawData, options = {}) {
  const { lang = 'fr', autoTrad = false } = options;

  if (!rawData || !rawData.results || rawData.results.length === 0) {
    return [];
  }

  const results = rawData.results.map(card => {
    const setTotal = card.set?.printedTotal || card.set?.total || '';
    const year = card.set?.releaseDate ? parseInt(card.set.releaseDate.split('-')[0]) : null;

    return {
      id: card.id,
      source: 'pokemon',
      collection: 'Pokémon TCG',
      title: card.name,
      subtitle: card.supertype || null,
      description: card.flavorText || null,
      image: card.images?.small || null,
      thumbnail: card.images?.small || card.images?.large || null,
      year,
      metadata: {
        set: {
          id: card.set?.id || null,
          name: card.set?.name || null,
          series: card.set?.series || null,
          logo: card.set?.images?.logo || null
        },
        cardNumber: card.number ? `${card.number}/${setTotal}` : null,
        rarity: card.rarity || null,
        types: card.types || [],
        hp: card.hp || null,
        artist: card.artist || null
      },
      detailUrl: `/api/tcg/pokemon/card/${card.id}`
    };
  });

  return results;
}

/**
 * Normalise les détails d'une carte Pokemon TCG
 */
export async function normalizeCardDetails(rawCard, options = {}) {
  const { lang = 'fr', autoTrad = false } = options;

  if (!rawCard) {
    throw new Error('Aucune donnée de carte fournie');
  }

  // Images
  const images = [];
  if (rawCard.images?.large) {
    images.push({
      url: rawCard.images.large,
      thumbnail: rawCard.images.small || rawCard.images.large,
      caption: 'Carte normale',
      isMain: true
    });
  }

  // Description (capacités et attaques)
  let description = '';
  
  if (rawCard.abilities && rawCard.abilities.length > 0) {
    const abilitiesText = rawCard.abilities.map(a => {
      const abilityType = a.type || 'Capacité';
      return `**${a.name}** (${abilityType}): ${a.text || 'Pas de description'}`;
    }).join('\n\n');
    description += abilitiesText;
  }
  
  if (rawCard.attacks && rawCard.attacks.length > 0) {
    if (description) description += '\n\n';
    const attacksText = rawCard.attacks.map(a => {
      const cost = a.cost ? a.cost.join(' ') : '';
      const damage = a.damage || '';
      return `**${a.name}** ${cost ? `(${cost})` : ''}: ${a.text || ''} ${damage ? `[${damage}]` : ''}`.trim();
    }).join('\n\n');
    description += attacksText;
  }

  // Traduction automatique si demandée
  if (autoTrad && description && lang !== 'en') {
    try {
      const translated = await translateText(description, { sourceLang: 'en', targetLang: lang });
      description = extractText(translated);
    } catch (error) {
      logger.warn(`[Pokemon TCG] Échec traduction carte ${rawCard.id}`);
    }
  }

  // Flavor text
  let flavorText = rawCard.flavorText || null;
  if (autoTrad && flavorText && lang !== 'en') {
    try {
      const translated = await translateText(flavorText, { sourceLang: 'en', targetLang: lang });
      flavorText = extractText(translated);
    } catch (error) {
      // Garder la version originale
    }
  }

  // Set et année
  const setTotal = rawCard.set?.printedTotal || rawCard.set?.total || null;
  const year = rawCard.set?.releaseDate ? parseInt(rawCard.set.releaseDate.split('-')[0]) : null;

  // Prix
  let prices = null;
  if (rawCard.tcgplayer?.prices) {
    const tcgPrices = rawCard.tcgplayer.prices;
    
    // Prioriser holofoil, puis normal
    const priceVariant = tcgPrices.holofoil || tcgPrices.normal || 
                         tcgPrices['1stEditionHolofoil'] || tcgPrices['1stEditionNormal'] ||
                         tcgPrices.reverseHolofoil || tcgPrices.unlimitedHolofoil ||
                         Object.values(tcgPrices)[0];
    
    if (priceVariant) {
      prices = {
        currency: 'USD',
        low: priceVariant.low || null,
        mid: priceVariant.mid || null,
        high: priceVariant.high || null,
        market: priceVariant.market || null,
        source: 'tcgplayer',
        updatedAt: rawCard.tcgplayer.updatedAt || null
      };
    }
  }

  // Cardmarket prices (Europe)
  if (rawCard.cardmarket?.prices) {
    const cmPrices = rawCard.cardmarket.prices;
    if (!prices) prices = {};
    prices.cardmarket = {
      currency: 'EUR',
      averageSellPrice: cmPrices.averageSellPrice || null,
      lowPrice: cmPrices.lowPrice || null,
      trendPrice: cmPrices.trendPrice || null,
      source: 'cardmarket',
      updatedAt: rawCard.cardmarket.updatedAt || null
    };
  }

  return {
    id: rawCard.id,
    source: 'pokemon',
    title: rawCard.name,
    subtitle: rawCard.supertype || null,
    description,
    flavorText,
    images,
    year,
    metadata: {
      // Informations du set
      set: {
        id: rawCard.set?.id || null,
        name: rawCard.set?.name || null,
        series: rawCard.set?.series || null,
        printedTotal: setTotal,
        releaseDate: rawCard.set?.releaseDate || null,
        logo: rawCard.set?.images?.logo || null,
        symbol: rawCard.set?.images?.symbol || null
      },
      
      // Numérotation
      number: rawCard.number || null,
      cardNumber: rawCard.number ? `${rawCard.number}/${setTotal}` : null,
      
      // Caractéristiques
      supertype: rawCard.supertype || null, // Pokemon, Trainer, Energy
      subtypes: rawCard.subtypes || [],
      types: rawCard.types || [],
      hp: rawCard.hp || null,
      rarity: rawCard.rarity || null,
      artist: rawCard.artist || null,
      
      // Évolution
      evolvesFrom: rawCard.evolvesFrom || null,
      evolvesTo: rawCard.evolvesTo || [],
      
      // Combat
      attacks: rawCard.attacks || [],
      abilities: rawCard.abilities || [],
      weaknesses: rawCard.weaknesses || [],
      resistances: rawCard.resistances || [],
      retreatCost: rawCard.retreatCost || [],
      
      // Règles spéciales
      rules: rawCard.rules || [],
      regulationMark: rawCard.regulationMark || null,
      
      // Légalité
      legalities: rawCard.legalities || {},
      
      // Identifiants
      nationalPokedexNumbers: rawCard.nationalPokedexNumbers || []
    },
    prices,
    externalLinks: {
      tcgplayer: rawCard.tcgplayer?.url || null,
      cardmarket: rawCard.cardmarket?.url || null
    }
  };
}

/**
 * Normalise la liste des sets Pokemon TCG
 */
export async function normalizeSets(rawData, options = {}) {
  const { lang = 'fr', autoTrad = false } = options;

  if (!rawData || !rawData.results || rawData.results.length === 0) {
    return [];
  }

  const results = rawData.results.map(set => {
    const year = set.releaseDate ? parseInt(set.releaseDate.split('-')[0]) : null;

    return {
      id: set.id,
      source: 'pokemon',
      title: set.name,
      subtitle: set.series || null,
      description: null,
      image: set.images?.logo || set.images?.symbol || null,
      thumbnail: set.images?.symbol || set.images?.logo || null,
      year,
      metadata: {
        total: set.total || set.printedTotal || 0,
        printedTotal: set.printedTotal || null,
        releaseDate: set.releaseDate || null,
        updatedAt: set.updatedAt || null,
        legalities: set.legalities || {},
        ptcgoCode: set.ptcgoCode || null,
        series: set.series || null
      }
    };
  });

  return results;
}
