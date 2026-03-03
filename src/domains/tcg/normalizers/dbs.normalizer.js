/**
 * Normalizer Dragon Ball Super Card Game
 * Normalise les données PostgreSQL vers le format Tako_Api unifié
 */

import { logger } from '../../../shared/utils/logger.js';

/**
 * Normalise les résultats de recherche DBS
 */
export async function normalizeSearchResults(rawData, options = {}) {
  const { lang = 'fr' } = options;

  if (!rawData || !rawData.results || rawData.results.length === 0) {
    return [];
  }

  return rawData.results.map(card => normalizeCard(card));
}

/**
 * Normalise les détails d'une carte DBS
 */
export async function normalizeCardDetails(rawCard, options = {}) {
  const { lang = 'fr' } = options;

  if (!rawCard) {
    throw new Error('Aucune donnée de carte fournie');
  }

  const base = normalizeCard(rawCard);

  // Enrichir avec données complètes
  const images = [];
  if (rawCard.image_url) {
    images.push({
      url: rawCard.image_url,
      thumbnail: rawCard.image_url,
      caption: 'Front',
      type: 'front',
    });
  }
  if (rawCard.image_back_url) {
    images.push({
      url: rawCard.image_back_url,
      thumbnail: rawCard.image_back_url,
      caption: 'Back',
      type: 'back',
    });
  }

  // Parse JSON fields safely
  const traits = safeJsonParse(rawCard.card_traits);
  const character = safeJsonParse(rawCard.card_character);
  const era = safeJsonParse(rawCard.card_era);
  const keywords = safeJsonParse(rawCard.keywords);
  const erratas = safeJsonParse(rawCard.erratas);
  const variants = safeJsonParse(rawCard.variants);
  const backTraits = safeJsonParse(rawCard.card_back_traits);
  const backCharacter = safeJsonParse(rawCard.card_back_character);
  const backEra = safeJsonParse(rawCard.card_back_era);

  return {
    ...base,
    description: rawCard.card_skill_text || rawCard.card_skill || null,
    images,
    metadata: {
      ...base.metadata,
      traits,
      character,
      era,
      keywords,
      energyCost: rawCard.card_energy_cost || null,
      comboCost: rawCard.card_combo_cost || null,
      comboPower: rawCard.card_combo_power || null,
      skillHtml: rawCard.card_skill || null,
      skillText: rawCard.card_skill_text || null,
      back: rawCard.card_back_name ? {
        name: rawCard.card_back_name,
        power: rawCard.card_back_power,
        skillHtml: rawCard.card_back_skill,
        skillText: rawCard.card_back_skill_text,
        traits: backTraits,
        character: backCharacter,
        era: backEra,
      } : null,
      bans: {
        isBanned: rawCard.is_banned || false,
        isLimited: rawCard.is_limited || false,
        limitedTo: rawCard.limited_to,
      },
      errata: {
        hasErrata: rawCard.has_errata || false,
        erratas,
      },
      variants,
      source: rawCard.source || null,
      discoveredAt: rawCard.discovered_at,
      updatedAt: rawCard.updated_at,
    },
  };
}

/**
 * Normalise les sets DBS
 */
export async function normalizeSets(rawData, options = {}) {
  if (!rawData || !rawData.sets) return [];

  return rawData.sets.map(set => ({
    id: set.set_code,
    name: set.name,
    game: set.game,
    cardCount: set.card_count || 0,
    source: set.source,
  }));
}

/**
 * Normalise un set avec ses cartes
 */
export async function normalizeSetDetails(rawData, options = {}) {
  if (!rawData) return null;

  return {
    id: rawData.set_code,
    name: rawData.name,
    game: rawData.game,
    cardCount: rawData.card_count || 0,
    source: rawData.source,
    cards: (rawData.cards || []).map(card => normalizeCard(card)),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function normalizeCard(card) {
  const gameLabel = card.game === 'masters' ? 'DBS Masters' : 'Fusion World';

  return {
    id: card.card_number,
    internalId: card.id,
    source: 'dbs',
    collection: `Dragon Ball Super - ${gameLabel}`,
    title: card.card_name,
    subtitle: [card.card_type, card.card_color].filter(Boolean).join(' · '),
    description: card.card_skill_text || null,
    image: card.image_url || null,
    thumbnail: card.image_url || null,
    year: null,
    metadata: {
      game: card.game,
      cardNumber: card.card_number,
      cardType: card.card_type,
      color: card.card_color,
      rarity: card.card_rarity,
      power: card.card_power,
      setCode: card.set_code,
    },
    detailUrl: `/api/tcg/dbs/card/${encodeURIComponent(card.card_number)}${card.game ? `?game=${card.game}` : ''}`,
  };
}

function safeJsonParse(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return typeof value === 'string' ? [value] : [];
  }
}
