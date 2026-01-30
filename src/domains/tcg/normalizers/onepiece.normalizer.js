/**
 * Normalizer One Piece Card Game
 * Transforme les réponses onepiece-cardgame.dev en format Tako API unifié
 */

import { translateText } from '../../../shared/utils/translator.js';

/**
 * Normaliser les résultats de recherche One Piece
 * @param {Array} rawCards - Tableau de cartes brutes
 * @param {Object} options - Options de normalisation
 * @param {string} options.lang - Langue cible
 * @param {boolean} options.autoTrad - Activer la traduction automatique
 */
export async function normalizeSearchResults(rawCards, options = {}) {
  const { lang = 'en', autoTrad = false } = options;
  
  if (!Array.isArray(rawCards) || rawCards.length === 0) {
    return [];
  }
  
  const normalizedCards = await Promise.all(
    rawCards.map(card => normalizeCardSummary(card, { lang, autoTrad }))
  );
  
  return normalizedCards;
}

/**
 * Normaliser un résumé de carte (pour les listes)
 */
async function normalizeCardSummary(rawCard, options = {}) {
  const { lang = 'en', autoTrad = false } = options;
  
  // Subtitle avec type et couleur
  let subtitle = rawCard.type_name || 'Card';
  if (rawCard.color_name && rawCard.color_name !== 'Unknown') {
    subtitle = `${rawCard.color_name} ${subtitle}`;
  }
  
  // Description basique
  let description = rawCard.e || ''; // e = effect
  
  // Traduction si nécessaire
  if (autoTrad && lang !== 'en' && description) {
    try {
      description = await translateText(description, lang);
    } catch (error) {
      // Conserver la version originale
    }
  }
  
  // Image URL (format: https://onepiece-cardgame.dev/images/cards/{cid}.png)
  const imageUrl = `https://onepiece-cardgame.dev/images/cards/${rawCard.cid}.png`;
  
  return {
    id: rawCard.cid,
    source: 'onepiece',
    collection: 'One Piece Card Game',
    title: rawCard.n, // n = name
    subtitle,
    description: `${subtitle} - ${description.substring(0, 150)}${description.length > 150 ? '...' : ''}`,
    image: imageUrl,
    thumbnail: imageUrl,
    year: extractYear(rawCard),
    metadata: {
      cardId: rawCard.cid,
      type: rawCard.type_name,
      color: rawCard.color_name,
      rarity: rawCard.rarity_name,
      cost: rawCard.cs, // cs = cost
      // Stats pour Leader/Character
      ...(rawCard.p !== undefined && rawCard.p !== null && { power: rawCard.p }), // p = power
      ...(rawCard.co !== undefined && rawCard.co !== null && { counter: rawCard.co }), // co = counter
      // Attribut
      ...(rawCard.attribute_name && rawCard.attribute_name !== 'N/A' && { attribute: rawCard.attribute_name }),
      // Trigger
      ...(rawCard.tr && { trigger: rawCard.tr }) // tr = trigger
    },
    detailUrl: `/api/tcg/onepiece/card/${encodeURIComponent(rawCard.cid)}`
  };
}

/**
 * Normaliser les détails complets d'une carte
 */
export async function normalizeCardDetails(rawCard, options = {}) {
  const { lang = 'en', autoTrad = false } = options;
  
  // Traduction de l'effet
  let effect = rawCard.e || '';
  let triggerEffect = rawCard.tr || null;
  
  if (autoTrad && lang !== 'en') {
    try {
      if (effect) {
        effect = await translateText(effect, lang);
      }
      if (triggerEffect) {
        triggerEffect = await translateText(triggerEffect, lang);
      }
    } catch (error) {
      // Conserver les versions originales
    }
  }
  
  // Image
  const imageUrl = `https://onepiece-cardgame.dev/images/cards/${rawCard.cid}.png`;
  const images = [{
    url: imageUrl,
    thumbnail: imageUrl,
    caption: 'Carte',
    isMain: true
  }];
  
  // Description complète
  let fullDescription = effect;
  if (triggerEffect) {
    fullDescription += `\n\n[Trigger] ${triggerEffect}`;
  }
  
  return {
    id: rawCard.cid,
    source: 'onepiece',
    title: rawCard.n,
    subtitle: buildSubtitle(rawCard),
    description: fullDescription,
    images,
    year: extractYear(rawCard),
    metadata: {
      // Identifiants
      cardId: rawCard.cid,
      cardNumber: rawCard.cid,
      
      // Type et attributs
      type: rawCard.type_name,
      color: rawCard.color_name,
      rarity: rawCard.rarity_name,
      attribute: rawCard.attribute_name,
      
      // Coûts et stats
      cost: rawCard.cs,
      power: rawCard.p,
      counter: rawCard.co,
      life: rawCard.lf, // lf = life (pour Leader)
      
      // Effets
      effect,
      ...(triggerEffect && { triggerEffect }),
      
      // Set info
      set: rawCard.set_info ? {
        id: rawCard.set_info.src_id,
        name: rawCard.set_info.name,
        releaseDate: rawCard.set_info.release_date
      } : null,
      
      // Tags/Catégories
      tags: parseCardTags(rawCard)
    },
    externalLinks: {
      onePieceCardGame: `https://onepiece-cardgame.dev/cards/${rawCard.cid}`
    }
  };
}

/**
 * Construire le subtitle avec toutes les infos pertinentes
 */
function buildSubtitle(card) {
  const parts = [];
  
  if (card.color_name && card.color_name !== 'Unknown') {
    parts.push(card.color_name);
  }
  
  if (card.type_name) {
    parts.push(card.type_name);
  }
  
  if (card.rarity_name && card.rarity_name !== 'Unknown') {
    parts.push(card.rarity_name);
  }
  
  return parts.join(' / ');
}

/**
 * Extraire les tags/catégories de la carte
 */
function parseCardTags(card) {
  const tags = [];
  
  // Ajouter le type
  if (card.type_name) tags.push(card.type_name);
  
  // Ajouter la couleur
  if (card.color_name && card.color_name !== 'Unknown') {
    tags.push(card.color_name);
  }
  
  // Ajouter l'attribut si présent
  if (card.attribute_name && card.attribute_name !== 'N/A') {
    tags.push(card.attribute_name);
  }
  
  // Ajouter la rareté
  if (card.rarity_name && card.rarity_name !== 'Unknown') {
    tags.push(card.rarity_name);
  }
  
  return tags;
}

/**
 * Extraire l'année de sortie d'une carte
 */
function extractYear(card) {
  // Utiliser les infos du set si disponibles
  if (card.set_info?.release_date) {
    const match = card.set_info.release_date.match(/\b(20\d{2})\b/);
    if (match) return parseInt(match[1]);
  }
  
  // Mapping basé sur les préfixes de sets One Piece
  const setPrefix = card.cid?.match(/^([A-Z]+\d+)/)?.[1];
  
  const setYears = {
    'OP01': 2022, // Romance Dawn
    'OP02': 2023, // Paramount War
    'OP03': 2023, // Pillars of Strength
    'OP04': 2023, // Kingdoms of Intrigue
    'OP05': 2023, // Awakening of the New Era
    'OP06': 2024, // Wings of the Captain
    'OP07': 2024, // 500 Years in the Future
    'OP08': 2024, // Two Legends
    'ST01': 2022, // Starter Deck: Straw Hat Crew
    'ST02': 2022, // Starter Deck: Worst Generation
    'ST03': 2023, // Starter Deck: The Seven Warlords of the Sea
    'ST04': 2023, // Starter Deck: Animal Kingdom Pirates
    'ST05': 2023, // Starter Deck: ONE PIECE FILM edition
    'ST06': 2023, // Starter Deck: Navy
    'ST07': 2024, // Starter Deck: Big Mom Pirates
    'ST08': 2024, // Starter Deck: Monkey.D.Luffy
    'ST09': 2024, // Starter Deck: Yamato
    'ST10': 2024, // Starter Deck: Uta
    'P': null     // Promo cards (année variable)
  };
  
  return setYears[setPrefix] || null;
}
