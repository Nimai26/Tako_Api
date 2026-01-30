/**
 * JeuxVideo.com (JVC) Normalizer
 * 
 * Transforms raw JVC data into Tako_Api standard format.
 * 
 * @module normalizers/jvc
 */

/**
 * Normalize search results
 * @param {object} rawData - Raw search data from provider
 * @returns {object} Normalized search results
 */
export function normalizeSearchResult(rawData) {
  if (!rawData || !rawData.results) {
    return {
      results: [],
      total: 0,
      provider: 'jvc'
    };
  }
  
  const normalizedResults = rawData.results.map(game => ({
    id: game.id,
    title: game.title,
    cover: game.coverUrl,
    platform: game.platform,
    url: game.url,
    provider: 'jvc'
  }));
  
  return {
    results: normalizedResults,
    total: rawData.total || normalizedResults.length,
    query: rawData.query,
    provider: 'jvc'
  };
}

/**
 * Normalize game details
 * @param {object} rawGame - Raw game data from provider
 * @returns {object} Normalized game details
 */
export function normalizeGame(rawGame) {
  if (!rawGame) {
    return null;
  }
  
  // Normalize ratings (JVC uses 0-20 scale, normalize to 0-5)
  const normalizeRating = (rating) => {
    if (!rating) return null;
    return Math.round((rating / 20) * 5 * 10) / 10; // Convert to 0-5 scale with 1 decimal
  };
  
  return {
    id: rawGame.id,
    title: rawGame.title,
    summary: rawGame.description,
    cover: rawGame.cover,
    releaseDate: rawGame.releaseDate,
    
    // Platforms
    platforms: rawGame.platforms || [],
    
    // Genres (preserve French names for translation)
    genres: rawGame.genres || [],
    
    // Companies
    developer: rawGame.developer,
    publisher: rawGame.publisher,
    
    // Age rating
    pegi: rawGame.pegi,
    minAge: rawGame.minAge,
    
    // Multiplayer info
    players: rawGame.nbPlayers,
    isMultiplayer: rawGame.isMultiplayer,
    
    // Media formats
    media: rawGame.media || [],
    
    // Ratings (normalized to 0-5 scale)
    rating: {
      critics: normalizeRating(rawGame.ratings?.test),
      users: normalizeRating(rawGame.ratings?.users)
    },
    
    // Links
    reviewUrl: rawGame.testUrl,
    url: rawGame.url,
    
    // Metadata
    provider: 'jvc',
    language: 'fr' // JVC is French-native
  };
}
