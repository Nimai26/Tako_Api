/**
 * Normalizer Pokémon TCG
 * Normalise les données de l'API pokemontcg.io vers le format canonique Tako_Api (Format B)
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
 * Normalise les résultats de recherche Pokemon TCG (Format B)
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
      id: `pokemon:${card.id}`,
      type: 'tcg_card',
      source: 'pokemon',
      sourceId: String(card.id),
      title: card.name,
      titleOriginal: null,
      description: card.flavorText || null,
      year,
      images: {
        primary: card.images?.small || null,
        thumbnail: card.images?.small || card.images?.large || null,
        gallery: []
      },
      urls: {
        source: null,
        detail: `/api/tcg/pokemon/card/${card.id}`
      },
      details: {
        collection: 'Pokémon TCG',
        subtitle: card.supertype || null,
        set: {
          name: card.set?.name || null,
          code: card.set?.id || null,
          series: card.set?.series || null,
          releaseDate: card.set?.releaseDate || null
        },
        cardNumber: card.number ? `${card.number}/${setTotal}` : null,
        rarity: card.rarity || null,
        types: card.types || [],
        hp: card.hp || null,
        artist: card.artist || null
      }
    };
  });

  return results;
}

/**
 * Normalise les détails d'une carte Pokemon TCG (Format B)
 */
export async function normalizeCardDetails(rawCard, options = {}) {
  const { lang = 'fr', autoTrad = false } = options;

  if (!rawCard) {
    throw new Error('Aucune donnée de carte fournie');
  }

  // Gallery images
  const gallery = [];
  if (rawCard.images?.large) {
    gallery.push({
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
      const translated = await translateText(description, lang, { enabled: true, sourceLang: 'en' });
      if (translated.translated) description = translated.text;
    } catch (error) {
      logger.warn(`[Pokemon TCG] Échec traduction carte ${rawCard.id}`);
    }
  }

  // Flavor text
  let flavorText = rawCard.flavorText || null;
  if (autoTrad && flavorText && lang !== 'en') {
    try {
      const translated = await translateText(flavorText, lang, { enabled: true, sourceLang: 'en' });
      if (translated.translated) flavorText = translated.text;
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
    
    // Prioriser holofoil, puis normal pour les prix principaux
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
        updatedAt: rawCard.tcgplayer.updatedAt || null,
        variants: Object.fromEntries(
          Object.entries(tcgPrices).map(([variant, p]) => [variant, {
            low: p.low || null,
            mid: p.mid || null,
            high: p.high || null,
            market: p.market || null,
            directLow: p.directLow || null
          }])
        )
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
    id: `pokemon:${rawCard.id}`,
    type: 'tcg_card',
    source: 'pokemon',
    sourceId: String(rawCard.id),
    title: rawCard.name,
    titleOriginal: null,
    description,
    year,
    images: {
      primary: rawCard.images?.large || rawCard.images?.small || null,
      thumbnail: rawCard.images?.small || rawCard.images?.large || null,
      gallery
    },
    urls: {
      source: rawCard.tcgplayer?.url || rawCard.cardmarket?.url || null,
      detail: `/api/tcg/pokemon/card/${rawCard.id}`
    },
    details: {
      subtitle: rawCard.supertype || null,
      flavorText,

      // Informations du set
      set: {
        name: rawCard.set?.name || null,
        code: rawCard.set?.id || null,
        series: rawCard.set?.series || null,
        releaseDate: rawCard.set?.releaseDate || null
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
      nationalPokedexNumbers: rawCard.nationalPokedexNumbers || [],

      // Prix
      prices,

      // Liens externes
      externalLinks: {
        tcgplayer: rawCard.tcgplayer?.url || null,
        cardmarket: rawCard.cardmarket?.url || null
      }
    }
  };
}

/**
 * Normalise la liste des sets Pokemon TCG (Format B)
 */
export async function normalizeSets(rawData, options = {}) {
  const { lang = 'fr', autoTrad = false } = options;

  if (!rawData || !rawData.results || rawData.results.length === 0) {
    return [];
  }

  const results = rawData.results.map(set => {
    const year = set.releaseDate ? parseInt(set.releaseDate.split('-')[0]) : null;

    return {
      id: `pokemon:${set.id}`,
      type: 'tcg_set',
      source: 'pokemon',
      sourceId: String(set.id),
      title: set.name,
      titleOriginal: null,
      description: null,
      year,
      images: {
        primary: set.images?.logo || set.images?.symbol || null,
        thumbnail: set.images?.symbol || set.images?.logo || null,
        gallery: []
      },
      urls: {
        source: null,
        detail: `/api/tcg/pokemon/sets/${set.id}`
      },
      details: {
        subtitle: set.series || null,
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
