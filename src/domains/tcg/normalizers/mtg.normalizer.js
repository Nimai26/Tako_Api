/**
 * Normalizer Magic: The Gathering
 * Normalise les données de l'API Scryfall vers le format Tako_Api
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
 * Normalise les résultats de recherche MTG
 */
export async function normalizeSearchResults(rawData, options = {}) {
  const { lang = 'en', autoTrad = false } = options;
  
  if (!rawData || !rawData.data || rawData.data.length === 0) {
    return [];
  }
  
  const cards = await Promise.all(rawData.data.map(async (card) => {
    // Image principale
    const thumbnail = card.image_uris?.normal || card.image_uris?.small || 
                     card.card_faces?.[0]?.image_uris?.normal || null;
    
    // Nom (localisé si disponible)
    const name = card.printed_name || card.name;
    
    // Description courte
    let description = card.type_line || '';
    if (card.oracle_text) {
      const shortText = card.oracle_text.substring(0, 150);
      description += ` - ${shortText}${card.oracle_text.length > 150 ? '...' : ''}`;
    }
    
    // Traduire si demandé
    if (autoTrad && lang !== 'en' && description) {
      try {
        const translated = await translateText(description, { sourceLang: 'en', targetLang: lang });
        description = extractText(translated);
      } catch (error) {
        logger.warn(`[MTG] Échec traduction pour ${name}`);
      }
    }
    
    return {
      id: card.id,
      source: 'mtg',
      collection: 'Magic: The Gathering',
      title: name,
      subtitle: card.type_line || null,
      description,
      image: thumbnail,
      thumbnail,
      year: card.released_at ? parseInt(card.released_at.split('-')[0]) : null,
      metadata: {
        set: {
          name: card.set_name || null,
          code: card.set || null
        },
        rarity: card.rarity || null,
        colors: card.colors || [],
        manaCost: card.mana_cost || null,
        cmc: card.cmc || 0,
        artist: card.artist || null,
        collectorNumber: card.collector_number || null
      },
      prices: {
        usd: card.prices?.usd || null,
        eur: card.prices?.eur || null,
        tix: card.prices?.tix || null
      },
      detailUrl: `/api/tcg/mtg/card/${card.id}`
    };
  }));
  
  return cards;
}

/**
 * Normalise les détails d'une carte MTG
 */
export async function normalizeCardDetails(rawCard, options = {}) {
  const { lang = 'en', autoTrad = false } = options;
  
  if (!rawCard) {
    throw new Error('Aucune donnée de carte fournie');
  }
  
  // Images
  const images = [];
  
  // Carte simple face
  if (rawCard.image_uris) {
    images.push({
      url: rawCard.image_uris.large || rawCard.image_uris.normal || rawCard.image_uris.small,
      thumbnail: rawCard.image_uris.small || rawCard.image_uris.normal,
      caption: 'Carte',
      isMain: true
    });
  }
  
  // Carte double face
  if (rawCard.card_faces && rawCard.card_faces.length > 0) {
    rawCard.card_faces.forEach((face, idx) => {
      if (face.image_uris) {
        images.push({
          url: face.image_uris.large || face.image_uris.normal || face.image_uris.small,
          thumbnail: face.image_uris.small || face.image_uris.normal,
          caption: face.name || `Face ${idx + 1}`,
          isMain: idx === 0
        });
      }
    });
  }
  
  // Description (oracle text)
  let description = rawCard.oracle_text || '';
  let flavorText = rawCard.flavor_text || null;
  
  // Traduction si demandée
  if (autoTrad && lang !== 'en') {
    if (description) {
      try {
        const translated = await translateText(description, { sourceLang: 'en', targetLang: lang });
        description = extractText(translated);
      } catch (error) {
        logger.warn(`[MTG] Échec traduction oracle text ${rawCard.id}`);
      }
    }
    
    if (flavorText) {
      try {
        const translated = await translateText(flavorText, { sourceLang: 'en', targetLang: lang });
        flavorText = extractText(translated);
      } catch (error) {
        // Garder la version originale
      }
    }
  }
  
  // Nom (localisé si disponible)
  const name = rawCard.printed_name || rawCard.name;
  
  return {
    id: rawCard.id,
    source: 'mtg',
    title: name,
    subtitle: rawCard.type_line || null,
    description,
    flavorText,
    images,
    year: rawCard.released_at ? parseInt(rawCard.released_at.split('-')[0]) : null,
    metadata: {
      // Set
      set: {
        id: rawCard.set_id || null,
        code: rawCard.set || null,
        name: rawCard.set_name || null,
        type: rawCard.set_type || null,
        iconSvg: rawCard.set_uri || null
      },
      
      // Identification
      scryfallId: rawCard.id,
      oracleId: rawCard.oracle_id || null,
      multiverseIds: rawCard.multiverse_ids || [],
      mtgoId: rawCard.mtgo_id || null,
      arenaId: rawCard.arena_id || null,
      collectorNumber: rawCard.collector_number || null,
      
      // Caractéristiques
      manaCost: rawCard.mana_cost || null,
      cmc: rawCard.cmc || 0,
      typeLine: rawCard.type_line || null,
      oracleText: rawCard.oracle_text || null,
      power: rawCard.power || null,
      toughness: rawCard.toughness || null,
      loyalty: rawCard.loyalty || null,
      
      // Couleurs
      colors: rawCard.colors || [],
      colorIdentity: rawCard.color_identity || [],
      colorIndicator: rawCard.color_indicator || null,
      
      // Rareté et artiste
      rarity: rawCard.rarity || null,
      artist: rawCard.artist || null,
      artistIds: rawCard.artist_ids || [],
      
      // Cartes spéciales
      cardFaces: rawCard.card_faces || null,
      layout: rawCard.layout || null,
      
      // Mots-clés
      keywords: rawCard.keywords || [],
      
      // Légalité
      legalities: rawCard.legalities || {},
      
      // Infos supplémentaires
      reserved: rawCard.reserved || false,
      foil: rawCard.foil || false,
      nonfoil: rawCard.nonfoil || true,
      oversized: rawCard.oversized || false,
      promo: rawCard.promo || false,
      reprint: rawCard.reprint || false,
      variation: rawCard.variation || false,
      digital: rawCard.digital || false,
      
      // Langue
      lang: rawCard.lang || 'en',
      printedName: rawCard.printed_name || null,
      printedTypeLine: rawCard.printed_type_line || null,
      printedText: rawCard.printed_text || null
    },
    prices: {
      usd: rawCard.prices?.usd || null,
      usdFoil: rawCard.prices?.usd_foil || null,
      eur: rawCard.prices?.eur || null,
      eurFoil: rawCard.prices?.eur_foil || null,
      tix: rawCard.prices?.tix || null,
      currency: 'USD/EUR',
      source: 'scryfall',
      updatedAt: new Date().toISOString()
    },
    externalLinks: {
      scryfall: rawCard.scryfall_uri || null,
      tcgplayer: rawCard.purchase_uris?.tcgplayer || null,
      cardmarket: rawCard.purchase_uris?.cardmarket || null,
      cardhoarder: rawCard.purchase_uris?.cardhoarder || null
    },
    rulings: rawCard.rulings_uri || null
  };
}

/**
 * Normalise la liste des sets MTG
 */
export async function normalizeSets(rawData, options = {}) {
  const { lang = 'en' } = options;
  
  if (!rawData || !rawData.data || rawData.data.length === 0) {
    return [];
  }
  
  const results = rawData.data.map(set => {
    const year = set.released_at ? parseInt(set.released_at.split('-')[0]) : null;
    
    return {
      id: set.id,
      source: 'mtg',
      title: set.name,
      subtitle: set.set_type || null,
      description: null,
      image: set.icon_svg_uri || null,
      thumbnail: set.icon_svg_uri || null,
      year,
      metadata: {
        code: set.code || null,
        type: set.set_type || null,
        cardCount: set.card_count || 0,
        printedSize: set.printed_size || null,
        digital: set.digital || false,
        foilOnly: set.foil_only || false,
        nonfoilOnly: set.nonfoil_only || false,
        releaseDate: set.released_at || null,
        block: set.block || null,
        blockCode: set.block_code || null,
        parentSetCode: set.parent_set_code || null
      },
      externalLinks: {
        scryfall: set.scryfall_uri || null,
        searchUri: set.search_uri || null
      }
    };
  });
  
  return results;
}
