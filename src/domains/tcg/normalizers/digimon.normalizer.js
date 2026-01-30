/**
 * Normalizer Digimon Card Game
 * Transforme les réponses digimoncard.io en format Tako API unifié
 */

import { translateText } from '../../../shared/utils/translator.js';

/**
 * Normaliser les résultats de recherche Digimon
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
  
  // Subtitle avec type et level/stage
  let subtitle = rawCard.type || 'Card';
  if (rawCard.level) {
    subtitle = `Lv.${rawCard.level} ${subtitle}`;
  } else if (rawCard.stage) {
    subtitle = `${rawCard.stage} ${subtitle}`;
  }
  
  // Description basique
  let description = rawCard.effect || rawCard.maineffect || '';
  
  // Traduction si nécessaire
  if (autoTrad && lang !== 'en' && description) {
    try {
      description = await translateText(description, lang);
    } catch (error) {
      // Conserver la version originale
    }
  }
  
  // Image
  const imageUrl = rawCard.image_url || '';
  
  return {
    id: rawCard.id || rawCard.cardnumber,
    source: 'digimon',
    collection: 'Digimon Card Game',
    title: rawCard.name,
    subtitle,
    description: `${subtitle} - ${description.substring(0, 150)}${description.length > 150 ? '...' : ''}`,
    image: imageUrl,
    thumbnail: imageUrl,
    year: extractYear(rawCard),
    metadata: {
      cardNumber: rawCard.cardnumber || rawCard.id,
      type: rawCard.type,
      color: rawCard.color,
      stage: rawCard.stage,
      level: rawCard.level,
      attribute: rawCard.attribute,
      rarity: rawCard.rarity,
      // Pour les Digimon
      ...(rawCard.dp !== undefined && { dp: rawCard.dp }),
      ...(rawCard.playcost !== undefined && { playCost: rawCard.playcost }),
      ...(rawCard.digivolvecost1 !== undefined && { digivolveCost: rawCard.digivolvecost1 }),
      ...(rawCard.digitype && { digiType: rawCard.digitype }),
      ...(rawCard.form && { form: rawCard.form })
    },
    detailUrl: `/api/tcg/digimon/card/${encodeURIComponent(rawCard.id || rawCard.cardnumber)}`
  };
}

/**
 * Normaliser les détails complets d'une carte
 */
export async function normalizeCardDetails(rawCard, options = {}) {
  const { lang = 'en', autoTrad = false } = options;
  
  // Traduction des effets
  let mainEffect = rawCard.maineffect || rawCard.effect || '';
  let inheritedEffect = rawCard.soureeffect || '';
  let securityEffect = rawCard.securityeffect || '';
  
  if (autoTrad && lang !== 'en') {
    try {
      if (mainEffect) {
        mainEffect = await translateText(mainEffect, lang);
      }
      if (inheritedEffect) {
        inheritedEffect = await translateText(inheritedEffect, lang);
      }
      if (securityEffect) {
        securityEffect = await translateText(securityEffect, lang);
      }
    } catch (error) {
      // Conserver les versions originales
    }
  }
  
  // Images
  const images = [];
  if (rawCard.image_url) {
    images.push({
      url: rawCard.image_url,
      thumbnail: rawCard.image_url,
      caption: 'Carte',
      isMain: true
    });
  }
  
  // Construire la description complète
  let fullDescription = mainEffect;
  if (inheritedEffect) {
    fullDescription += `\n\n[Inherited Effect]\n${inheritedEffect}`;
  }
  if (securityEffect) {
    fullDescription += `\n\n[Security]\n${securityEffect}`;
  }
  
  return {
    id: rawCard.id || rawCard.cardnumber,
    source: 'digimon',
    title: rawCard.name,
    subtitle: buildSubtitle(rawCard),
    description: fullDescription,
    images,
    year: extractYear(rawCard),
    metadata: {
      // Identifiants
      cardNumber: rawCard.cardnumber || rawCard.id,
      id: rawCard.id,
      
      // Type et attributs
      type: rawCard.type,
      color: rawCard.color,
      stage: rawCard.stage,
      level: rawCard.level,
      attribute: rawCard.attribute,
      
      // Digimon spécifique
      ...(rawCard.dp !== undefined && { dp: rawCard.dp }), // Digimon Power
      ...(rawCard.playcost !== undefined && { playCost: rawCard.playcost }),
      ...(rawCard.digivolvecost1 !== undefined && { digivolveCost1: rawCard.digivolvecost1 }),
      ...(rawCard.digivolvecost2 !== undefined && { digivolveCost2: rawCard.digivolvecost2 }),
      ...(rawCard.digivolvelevel1 && { digivolveLevel1: rawCard.digivolvelevel1 }),
      ...(rawCard.digivolvelevel2 && { digivolveLevel2: rawCard.digivolvelevel2 }),
      
      // Informations additionnelles
      digiType: rawCard.digitype,
      form: rawCard.form,
      
      // Effets détaillés
      mainEffect,
      ...(inheritedEffect && { inheritedEffect }),
      ...(securityEffect && { securityEffect }),
      
      // Rareté et set
      rarity: rawCard.rarity,
      series: rawCard.series,
      set: rawCard.set,
      
      // Artiste
      illustrator: rawCard.illustrator,
      
      // Notes de carte
      notes: rawCard.notes
    },
    externalLinks: {
      digimoncard: rawCard.id ? `https://digimoncard.io/card/${rawCard.id}` : null
    }
  };
}

/**
 * Construire le subtitle avec toutes les infos pertinentes
 */
function buildSubtitle(card) {
  const parts = [];
  
  if (card.level) {
    parts.push(`Lv.${card.level}`);
  } else if (card.stage) {
    parts.push(card.stage);
  }
  
  if (card.type) {
    parts.push(card.type);
  }
  
  if (card.attribute) {
    parts.push(card.attribute);
  }
  
  return parts.join(' / ');
}

/**
 * Extraire l'année de sortie d'une carte
 */
function extractYear(card) {
  // Mapping des sets Digimon par préfixe
  const setYears = {
    'ST': 2020,  // Starter Decks
    'BT': 2020,  // Booster Sets (BT1-BT17+)
    'EX': 2021,  // Special Booster
    'P': null,   // Promo cards (variable)
    'RB': 2021,  // Release Special Booster
    'DC': 2024   // Digimon Con
  };
  
  // Extraire le préfixe du card number
  if (card.cardnumber || card.id) {
    const cardId = card.cardnumber || card.id;
    const prefix = cardId.match(/^([A-Z]+)/)?.[1];
    
    if (prefix && setYears[prefix] !== undefined) {
      return setYears[prefix];
    }
    
    // Estimation basée sur le numéro de booster (BT1=2020, +1 an tous les ~6 sets)
    if (prefix === 'BT') {
      const setNum = parseInt(cardId.match(/\d+/)?.[0]);
      if (setNum) {
        return 2020 + Math.floor(setNum / 6);
      }
    }
  }
  
  return null;
}
