/**
 * Normalizer Disney Lorcana
 * Transforme les réponses LorcanaJSON en format Tako API unifié
 */

import { translateText } from '../../../shared/utils/translator.js';

/**
 * Normaliser les résultats de recherche Lorcana
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
  
  // Subtitle avec version et type
  let subtitle = rawCard.type || 'Card';
  if (rawCard.version) {
    subtitle = `${rawCard.version} - ${subtitle}`;
  }
  
  // Description basique
  let description = '';
  if (rawCard.abilities) {
    description = rawCard.abilities.map(a => a.text).join(' ');
  }
  
  // Traduction si nécessaire
  if (autoTrad && lang !== 'en' && description) {
    try {
      description = await translateText(description, lang);
    } catch (error) {
      // Conserver la version originale
    }
  }
  
  // Image
  const imageUrl = rawCard.images?.full || rawCard.images?.thumbnail || '';
  const thumbnailUrl = rawCard.images?.thumbnail || imageUrl;
  
  return {
    id: rawCard.fullIdentifier || String(rawCard.id),
    source: 'lorcana',
    collection: 'Disney Lorcana',
    title: rawCard.fullName || rawCard.name,
    subtitle,
    description: `${subtitle} - ${description.substring(0, 150)}${description.length > 150 ? '...' : ''}`,
    image: imageUrl,
    thumbnail: thumbnailUrl,
    year: extractYear(rawCard),
    metadata: {
      name: rawCard.name,
      version: rawCard.version,
      type: rawCard.type,
      color: rawCard.color,
      cost: rawCard.cost,
      inkwell: rawCard.inkwell,
      rarity: rawCard.rarity,
      setCode: rawCard.setCode,
      setName: rawCard.setName,
      collectorNumber: rawCard.collectorNumber,
      // Stats spécifiques aux personnages
      ...(rawCard.strength !== undefined && { strength: rawCard.strength }),
      ...(rawCard.willpower !== undefined && { willpower: rawCard.willpower }),
      ...(rawCard.lore !== undefined && { lore: rawCard.lore })
    },
    detailUrl: `/api/tcg/lorcana/card/${rawCard.fullIdentifier || rawCard.id}`
  };
}

/**
 * Normaliser les détails complets d'une carte
 */
export async function normalizeCardDetails(rawCard, options = {}) {
  const { lang = 'en', autoTrad = false } = options;
  
  // Traduction des textes
  let flavorText = rawCard.flavorText || null;
  let abilities = rawCard.abilities || [];
  
  if (autoTrad && lang !== 'en') {
    try {
      if (flavorText) {
        flavorText = await translateText(flavorText, lang);
      }
      if (abilities.length > 0) {
        abilities = await Promise.all(
          abilities.map(async (ability) => ({
            ...ability,
            text: await translateText(ability.text, lang)
          }))
        );
      }
    } catch (error) {
      // Conserver les versions originales
    }
  }
  
  // Images multiples si disponibles
  const images = [];
  if (rawCard.images) {
    if (rawCard.images.full) {
      images.push({
        url: rawCard.images.full,
        thumbnail: rawCard.images.thumbnail || rawCard.images.full,
        caption: 'Carte complète',
        isMain: true
      });
    }
    if (rawCard.images.foil && rawCard.images.foil !== rawCard.images.full) {
      images.push({
        url: rawCard.images.foil,
        thumbnail: rawCard.images.thumbnail,
        caption: 'Version foil',
        isMain: false
      });
    }
  }
  
  return {
    id: rawCard.fullIdentifier || String(rawCard.id),
    source: 'lorcana',
    title: rawCard.fullName || rawCard.name,
    subtitle: rawCard.version ? `${rawCard.version} - ${rawCard.type}` : rawCard.type,
    description: abilities.map(a => a.text).join('\n\n'),
    flavorText,
    images,
    year: extractYear(rawCard),
    metadata: {
      // Informations de base
      name: rawCard.name,
      version: rawCard.version,
      fullName: rawCard.fullName,
      type: rawCard.type,
      classifications: rawCard.classifications,
      
      // Attributs de jeu
      color: rawCard.color,
      cost: rawCard.cost,
      inkwell: rawCard.inkwell,
      
      // Stats (personnages)
      ...(rawCard.strength !== undefined && { strength: rawCard.strength }),
      ...(rawCard.willpower !== undefined && { willpower: rawCard.willpower }),
      ...(rawCard.lore !== undefined && { lore: rawCard.lore }),
      
      // Stats (lieux)
      ...(rawCard.moveCost !== undefined && { moveCost: rawCard.moveCost }),
      
      // Abilities détaillées
      abilities: abilities.map(a => ({
        type: a.type,
        name: a.name,
        text: a.text,
        effect: a.effect
      })),
      
      // Set info
      setInfo: {
        code: rawCard.setCode,
        name: rawCard.setName,
        number: rawCard.setNumber,
        collectorNumber: rawCard.collectorNumber,
        total: rawCard.setTotal
      },
      
      // Rareté et édition
      rarity: rawCard.rarity,
      
      // Artiste
      artist: rawCard.artist,
      
      // Identifiants
      code: rawCard.code,
      fullIdentifier: rawCard.fullIdentifier,
      
      // Franchise d'origine
      franchise: rawCard.franchise,
      franchiseIcon: rawCard.franchiseIcon
    },
    externalLinks: {
      lorcanajson: `https://lorcanajson.org/cards/${rawCard.fullIdentifier}`,
      dreamborn: rawCard.fullName ? 
        `https://dreamborn.ink/cards/${rawCard.fullName.toLowerCase().replace(/\s+/g, '-')}` : null
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
    id: set.code,
    source: 'lorcana',
    title: set.name,
    subtitle: 'Set',
    description: null,
    image: set.icon || null,
    thumbnail: set.icon || null,
    year: extractYearFromDate(set.releaseDate),
    metadata: {
      code: set.code,
      name: set.name,
      releaseDate: set.releaseDate,
      total: set.total,
      icon: set.icon
    }
  }));
}

/**
 * Extraire l'année de sortie d'une carte
 */
function extractYear(card) {
  // Essayer depuis le set
  if (card.setReleaseDate) {
    return extractYearFromDate(card.setReleaseDate);
  }
  
  // Mapping manuel des sets Lorcana
  const setYears = {
    'TFC': 2023, // The First Chapter
    'ROF': 2023, // Rise of the Floodborn
    'ITI': 2024, // Into the Inklands
    'URR': 2024, // Ursula's Return
    'SHI': 2024, // Shimmering Skies
    'AZU': 2025  // Azurite Sea
  };
  
  return setYears[card.setCode] || null;
}

/**
 * Extraire l'année depuis une date
 */
function extractYearFromDate(dateString) {
  if (!dateString) return null;
  
  const match = dateString.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : null;
}
