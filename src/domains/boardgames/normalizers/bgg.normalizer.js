/**
 * BGG Normalizer
 * 
 * Normalizes BoardGameGeek API responses to a consistent format.
 * 
 * @module normalizers/bgg
 */

/**
 * Extract localized name from alternate names
 * Patterns de noms français courants dans BGG
 */
const FRENCH_NAME_PATTERNS = [
  /^Les .+/i,           // "Les Colons de Catane"
  /^Le .+/i,            // "Le Trône de Fer"
  /^La .+/i,            // "La Vallée des Vikings"
  /^L'.+/i,             // "L'Âge de Pierre"
  /^Un.+ /i,            // "Une Aventure..."
  /^Des .+/i,           // "Des Chiffres et des Lettres"
  /: Le Jeu$/i,         // "Monopoly: Le Jeu"
  /\(Version Française\)/i
];

const GERMAN_NAME_PATTERNS = [
  /^Die .+/i,           // "Die Siedler von Catan"
  /^Der .+/i,           // "Der Herr der Ringe"
  /^Das .+/i,           // "Das Spiel"
  /^Ein.+ /i,           // "Eine Reise..."
  /: Das Spiel$/i
];

const SPANISH_NAME_PATTERNS = [
  /^Los .+/i,           // "Los Colonos de Catán"
  /^Las .+/i,
  /^El .+/i,
  /^La .+/i,
  /: El Juego$/i
];

const ITALIAN_NAME_PATTERNS = [
  /^I Coloni/i,         // "I Coloni di Catan"
  /^Il .+/i,
  /^La .+/i,
  /^Gli .+/i,
  /: Il Gioco$/i
];

/**
 * Find localized game name in alternate names
 * @param {string[]} alternateNames - Array of alternate game names
 * @param {string} targetLang - Target language (fr, de, es, it)
 * @returns {string|null} Localized name or null
 */
export function findLocalizedName(alternateNames, targetLang = 'fr') {
  if (!alternateNames || alternateNames.length === 0) return null;
  
  let patterns;
  switch (targetLang) {
    case 'fr':
      patterns = FRENCH_NAME_PATTERNS;
      break;
    case 'de':
      patterns = GERMAN_NAME_PATTERNS;
      break;
    case 'es':
      patterns = SPANISH_NAME_PATTERNS;
      break;
    case 'it':
      patterns = ITALIAN_NAME_PATTERNS;
      break;
    default:
      return null;
  }
  
  // Cherche le premier nom qui correspond aux patterns de la langue
  for (const name of alternateNames) {
    for (const pattern of patterns) {
      if (pattern.test(name)) {
        return name;
      }
    }
  }
  
  return null;
}

/**
 * Normalize BGG search results
 * @param {object} rawData - Raw BGG search data
 * @returns {object} Normalized search results
 */
export function normalizeSearchResult(rawData) {
  if (!rawData || !rawData.results) {
    return { results: [], total: 0, query: '' };
  }
  
  return {
    results: rawData.results.map(game => ({
      id: game.id,
      type: game.type,
      name: game.name,
      year: game.year,
      url: game.url,
      source: 'boardgamegeek'
    })),
    total: rawData.total || rawData.results.length,
    query: rawData.query || '',
    source: 'boardgamegeek'
  };
}

/**
 * Normalize BGG game details
 * @param {object} rawGame - Raw BGG game data
 * @returns {object} Normalized game data
 */
export function normalizeGame(rawGame) {
  if (!rawGame) {
    return null;
  }
  
  return {
    id: rawGame.id,
    type: rawGame.type,
    name: rawGame.name,
    alternateNames: rawGame.alternateNames || [],
    description: rawGame.description,
    year: rawGame.year,
    players: {
      min: rawGame.players?.min,
      max: rawGame.players?.max
    },
    playTime: {
      min: rawGame.playTime?.min,
      max: rawGame.playTime?.max,
      average: rawGame.playTime?.average
    },
    minAge: rawGame.minAge,
    image: rawGame.image,
    thumbnail: rawGame.thumbnail,
    stats: {
      rating: rawGame.stats?.rating,
      numRatings: rawGame.stats?.numRatings,
      rank: rawGame.stats?.rank,
      complexity: rawGame.stats?.complexity
    },
    categories: rawGame.categories || [],
    mechanics: rawGame.mechanics || [],
    designers: rawGame.designers || [],
    artists: rawGame.artists || [],
    publishers: rawGame.publishers || [],
    url: rawGame.url,
    source: 'boardgamegeek'
  };
}
