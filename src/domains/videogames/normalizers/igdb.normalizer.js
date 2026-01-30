/**
 * Normalizer IGDB
 * 
 * Transforme les données IGDB en format Tako standardisé
 * La traduction est gérée au niveau des routes, pas ici.
 * 
 * @module domains/videogames/normalizers/igdb
 */

/**
 * Génère l'URL d'une image IGDB
 */
function getImageUrl(imageId, size = 't_cover_big') {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`;
}

/**
 * Normalise un jeu depuis les résultats de recherche IGDB
 */
export function normalizeSearchResult(game) {
  return {
    id: `igdb-${game.id}`,
    sourceId: game.id,
    source: 'igdb',
    title: game.name,
    slug: game.slug || null,
    summary: game.summary || null,
    releaseDate: game.first_release_date 
      ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
      : null,
    rating: game.total_rating ? Math.round(game.total_rating * 10) / 10 : null,
    ratingCount: game.total_rating_count || 0,
    cover: game.cover?.image_id 
      ? getImageUrl(game.cover.image_id, 't_cover_big')
      : null,
    coverThumb: game.cover?.image_id 
      ? getImageUrl(game.cover.image_id, 't_thumb')
      : null,
    platforms: game.platforms?.map(p => p.name || p) || [],
    genres: game.genres?.map(g => g.name || g) || [],
    category: mapCategory(game.category)
  };
}

/**
 * Normalise un jeu avec tous les détails
 */
export function normalizeGame(game) {
  return {
    id: `igdb-${game.id}`,
    sourceId: game.id,
    source: 'igdb',
    
    // Informations de base
    title: game.name,
    slug: game.slug || null,
    summary: game.summary || null,
    storyline: game.storyline || null,
    
    // Dates
    releaseDate: game.first_release_date 
      ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
      : null,
    createdAt: game.created_at 
      ? new Date(game.created_at * 1000).toISOString()
      : null,
    updatedAt: game.updated_at 
      ? new Date(game.updated_at * 1000).toISOString()
      : null,
    
    // Notes
    rating: game.total_rating ? Math.round(game.total_rating * 10) / 10 : null,
    ratingCount: game.total_rating_count || 0,
    criticRating: game.aggregated_rating ? Math.round(game.aggregated_rating * 10) / 10 : null,
    criticRatingCount: game.aggregated_rating_count || 0,
    userRating: game.rating ? Math.round(game.rating * 10) / 10 : null,
    userRatingCount: game.rating_count || 0,
    hypes: game.hypes || 0,
    follows: game.follows || 0,
    
    // Classification
    category: mapCategory(game.category),
    status: mapStatus(game.status),
    ageRatings: normalizeAgeRatings(game.age_ratings),
    
    // Médias
    cover: game.cover?.image_id 
      ? getImageUrl(game.cover.image_id, 't_cover_big')
      : null,
    coverThumb: game.cover?.image_id 
      ? getImageUrl(game.cover.image_id, 't_thumb')
      : null,
    screenshots: game.screenshots?.map(s => ({
      id: s.id,
      url: getImageUrl(s.image_id, 't_screenshot_huge'),
      thumb: getImageUrl(s.image_id, 't_screenshot_med')
    })) || [],
    artworks: game.artworks?.map(a => ({
      id: a.id,
      url: getImageUrl(a.image_id, 't_1080p'),
      thumb: getImageUrl(a.image_id, 't_screenshot_med')
    })) || [],
    videos: game.videos?.map(v => ({
      id: v.id,
      name: v.name,
      videoId: v.video_id,
      url: `https://www.youtube.com/watch?v=${v.video_id}`,
      thumbnail: `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`
    })) || [],
    
    // Taxonomie
    genres: game.genres?.map(g => g.name || g) || [],
    themes: game.themes?.map(t => t.name || t) || [],
    keywords: game.keywords?.map(k => k.name || k) || [],
    gameModes: game.game_modes?.map(m => m.name || m) || [],
    playerPerspectives: game.player_perspectives?.map(p => p.name || p) || [],
    
    // Plateformes
    platforms: game.platforms?.map(p => ({
      id: p.id,
      name: p.name || p,
      abbreviation: p.abbreviation || null,
      slug: p.slug || null
    })) || [],
    
    // Relations
    involvedCompanies: game.involved_companies?.map(ic => ({
      id: ic.company?.id || ic.id,
      name: ic.company?.name || null,
      developer: ic.developer || false,
      publisher: ic.publisher || false,
      porting: ic.porting || false,
      supporting: ic.supporting || false
    })) || [],
    
    // Déduire développeurs et éditeurs
    developers: game.involved_companies
      ?.filter(ic => ic.developer)
      .map(ic => ic.company?.name || null)
      .filter(Boolean) || [],
    publishers: game.involved_companies
      ?.filter(ic => ic.publisher)
      .map(ic => ic.company?.name || null)
      .filter(Boolean) || [],
    
    // Franchises et collections
    franchise: game.franchise ? {
      id: game.franchise.id || game.franchise,
      name: game.franchise.name || null
    } : null,
    franchises: game.franchises?.map(f => ({
      id: f.id || f,
      name: f.name || null
    })) || [],
    collection: game.collection ? {
      id: game.collection.id || game.collection,
      name: game.collection.name || null
    } : null,
    
    // Jeux liés
    parentGame: game.parent_game ? {
      id: game.parent_game.id || game.parent_game,
      name: game.parent_game.name || null
    } : null,
    dlcs: game.dlcs?.map(d => ({
      id: d.id || d,
      name: d.name || null
    })) || [],
    expansions: game.expansions?.map(e => ({
      id: e.id || e,
      name: e.name || null
    })) || [],
    remakes: game.remakes?.map(r => ({
      id: r.id || r,
      name: r.name || null
    })) || [],
    remasters: game.remasters?.map(r => ({
      id: r.id || r,
      name: r.name || null
    })) || [],
    similarGames: game.similar_games?.map(s => ({
      id: s.id || s,
      name: s.name || null,
      cover: s.cover?.image_id ? getImageUrl(s.cover.image_id, 't_cover_small') : null
    })) || [],
    
    // Sites et liens
    websites: game.websites?.map(w => ({
      category: mapWebsiteCategory(w.category),
      url: w.url,
      trusted: w.trusted || false
    })) || [],
    
    // URLs directes
    url: `https://www.igdb.com/games/${game.slug}`
  };
}

/**
 * Normalise un genre IGDB
 */
export function normalizeGenre(genre) {
  return {
    id: genre.id,
    name: genre.name,
    slug: genre.slug
  };
}

/**
 * Normalise une plateforme IGDB
 */
export function normalizePlatform(platform) {
  return {
    id: platform.id,
    name: platform.name,
    abbreviation: platform.abbreviation || null,
    slug: platform.slug || null,
    alternativeName: platform.alternative_name || null,
    generation: platform.generation || null,
    summary: platform.summary || null,
    logo: platform.platform_logo?.image_id 
      ? getImageUrl(platform.platform_logo.image_id, 't_logo_med')
      : null
  };
}

/**
 * Normalise une entreprise (développeur/éditeur)
 */
export function normalizeCompany(company) {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug || null,
    description: company.description || null,
    country: company.country || null,
    startDate: company.start_date 
      ? new Date(company.start_date * 1000).toISOString().split('T')[0]
      : null,
    logo: company.logo?.image_id 
      ? getImageUrl(company.logo.image_id, 't_logo_med')
      : null,
    websites: company.websites?.map(w => ({
      category: mapWebsiteCategory(w.category),
      url: w.url
    })) || [],
    parent: company.parent ? {
      id: company.parent.id || company.parent,
      name: company.parent.name || null
    } : null,
    developedGamesCount: company.developed?.length || 0,
    publishedGamesCount: company.published?.length || 0
  };
}

/**
 * Normalise une franchise
 */
export function normalizeFranchise(franchise) {
  return {
    id: franchise.id,
    name: franchise.name,
    slug: franchise.slug || null,
    gamesCount: franchise.games?.length || 0,
    games: franchise.games?.map(g => ({
      id: g.id || g,
      name: g.name || null,
      cover: g.cover?.image_id ? getImageUrl(g.cover.image_id, 't_cover_small') : null
    })) || []
  };
}

/**
 * Normalise une collection de jeux
 */
export function normalizeCollection(collection) {
  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug || null,
    gamesCount: collection.games?.length || 0,
    games: collection.games?.map(g => ({
      id: g.id || g,
      name: g.name || null,
      cover: g.cover?.image_id ? getImageUrl(g.cover.image_id, 't_cover_small') : null
    })) || []
  };
}

/**
 * Normalise les classifications d'âge
 */
function normalizeAgeRatings(ageRatings) {
  if (!ageRatings) return [];
  
  return ageRatings.map(ar => ({
    category: mapAgeRatingCategory(ar.category),
    rating: mapAgeRatingValue(ar.category, ar.rating),
    synopsis: ar.synopsis || null,
    contentDescriptions: ar.content_descriptions?.map(cd => cd.description) || []
  }));
}

/**
 * Map des catégories de jeu IGDB
 */
function mapCategory(category) {
  const categories = {
    0: 'main_game',
    1: 'dlc_addon',
    2: 'expansion',
    3: 'bundle',
    4: 'standalone_expansion',
    5: 'mod',
    6: 'episode',
    7: 'season',
    8: 'remake',
    9: 'remaster',
    10: 'expanded_game',
    11: 'port',
    12: 'fork',
    13: 'pack',
    14: 'update'
  };
  return categories[category] || 'unknown';
}

/**
 * Map des statuts de jeu IGDB
 */
function mapStatus(status) {
  const statuses = {
    0: 'released',
    2: 'alpha',
    3: 'beta',
    4: 'early_access',
    5: 'offline',
    6: 'cancelled',
    7: 'rumored',
    8: 'delisted'
  };
  return statuses[status] || 'unknown';
}

/**
 * Map des catégories de site web
 */
function mapWebsiteCategory(category) {
  const categories = {
    1: 'official',
    2: 'wikia',
    3: 'wikipedia',
    4: 'facebook',
    5: 'twitter',
    6: 'twitch',
    8: 'instagram',
    9: 'youtube',
    10: 'iphone',
    11: 'ipad',
    12: 'android',
    13: 'steam',
    14: 'reddit',
    15: 'itch',
    16: 'epicgames',
    17: 'gog',
    18: 'discord'
  };
  return categories[category] || 'other';
}

/**
 * Map des catégories de classification d'âge
 */
function mapAgeRatingCategory(category) {
  const categories = {
    1: 'ESRB',
    2: 'PEGI',
    3: 'CERO',
    4: 'USK',
    5: 'GRAC',
    6: 'CLASS_IND',
    7: 'ACB'
  };
  return categories[category] || 'unknown';
}

/**
 * Map des valeurs de classification d'âge
 */
function mapAgeRatingValue(category, rating) {
  // ESRB
  if (category === 1) {
    const esrb = {
      1: 'RP', // Rating Pending
      2: 'EC', // Early Childhood
      3: 'E', // Everyone
      4: 'E10', // Everyone 10+
      5: 'T', // Teen
      6: 'M', // Mature 17+
      7: 'AO' // Adults Only 18+
    };
    return esrb[rating] || 'Unknown';
  }
  
  // PEGI
  if (category === 2) {
    const pegi = {
      1: '3',
      2: '7',
      3: '12',
      4: '16',
      5: '18'
    };
    return pegi[rating] || 'Unknown';
  }
  
  return rating?.toString() || 'Unknown';
}

// Export par défaut pour compatibilité
export default {
  normalizeSearchResult,
  normalizeGame,
  normalizeGenre,
  normalizePlatform,
  normalizeCompany,
  normalizeFranchise,
  normalizeCollection
};
