/**
 * Routes TMDB
 * 
 * Endpoints pour l'API The Movie Database (TMDB).
 * 
 * Routes disponibles :
 * - GET /health - Vérifier la disponibilité
 * - GET /search - Recherche multi (films, séries, personnes)
 * - GET /search/movies - Rechercher uniquement des films
 * - GET /search/series - Rechercher uniquement des séries
 * - GET /movies/:id - Détails d'un film
 * - GET /series/:id - Détails d'une série
 * - GET /series/:id/season/:season - Détails d'une saison
 * - GET /series/:id/season/:season/episode/:episode - Détails d'un épisode
 * - GET /collections/:id - Détails d'une collection/saga
 * - GET /persons/:id - Détails d'une personne
 * - GET /directors/:id/movies - Films d'un réalisateur
 * 
 * Support traduction :
 * - lang : Code langue (fr-FR, en-US, etc.)
 * - autoTrad : Activer la traduction automatique (1 ou true)
 */

import { Router } from 'express';
import { TmdbProvider } from '../providers/tmdb.provider.js';
import { asyncHandler } from '../../../shared/utils/async-handler.js';
import { ValidationError } from '../../../shared/errors/index.js';
import {
  translateSearchResults,
  translateText,
  isAutoTradEnabled,
  extractLangCode
} from '../../../shared/utils/translator.js';

const router = Router();
const provider = new TmdbProvider();

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Traduit les champs description et genres d'un résultat détaillé
 */
async function translateDetailResult(result, targetLang, autoTradEnabled) {
  if (!autoTradEnabled || !targetLang || !result) return result;

  const translated = { ...result };

  // Traduire description si présente
  if (result.description) {
    const { text, translated: wasTranslated } = await translateText(result.description, targetLang, { enabled: true });
    if (wasTranslated) {
      translated.descriptionOriginal = result.description;
      translated.description = text;
      translated.descriptionTranslated = true;
    }
  }

  // Traduire genres si présents (tableau de strings)
  if (result.genres && Array.isArray(result.genres) && result.genres.length > 0) {
    const genreTranslations = await Promise.all(
      result.genres.map(async (genre) => {
        const { text, translated: wasTranslated } = await translateText(genre, targetLang, { enabled: true });
        return wasTranslated ? text : genre;
      })
    );
    
    // Vérifier si au moins un genre a été traduit
    const wasTranslated = genreTranslations.some((g, i) => g !== result.genres[i]);
    if (wasTranslated) {
      translated.genresOriginal = result.genres;
      translated.genres = genreTranslations;
      translated.genresTranslated = true;
    }
  }

  return translated;
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════

router.get('/health', asyncHandler(async (req, res) => {
  const isConfigured = provider.isConfigured();

  res.status(isConfigured ? 200 : 503).json({
    provider: 'tmdb',
    status: isConfigured ? 'healthy' : 'unhealthy',
    message: isConfigured ? 'TMDB API configurée' : 'TMDB_API_KEY non configurée'
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
// RECHERCHE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tmdb/search
 * Recherche multi (films, séries, personnes)
 * 
 * Query params :
 * - q (required) : Terme de recherche
 * - type : Type (multi, movie, tv, person) - défaut: multi
 * - page : Numéro de page (défaut 1)
 * - pageSize : Résultats par page (max 20)
 * - lang : Langue (défaut fr-FR)
 * - year : Année de sortie
 * - adult : Inclure contenu adulte (true/false)
 * - autoTrad : Activer la traduction automatique
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { 
    q, 
    type = 'multi', 
    page = '1', 
    pageSize = '20', 
    lang = 'fr-FR',
    year,
    adult = 'false',
    autoTrad 
  } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    throw new ValidationError('Le paramètre "q" est requis pour la recherche');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let results = await provider.search(q.trim(), {
    type,
    page: parseInt(page) || 1,
    pageSize: parseInt(pageSize) || 20,
    lang,
    year: year ? parseInt(year) : null,
    includeAdult: adult === 'true'
  });

  // Traduction automatique si activée
  if (autoTradEnabled && targetLang && results.data?.length > 0) {
    results = await translateSearchResults(results, targetLang, {
      fields: ['description']
    });
  }

  res.json(results);
}));

/**
 * GET /media/tmdb/search/movies
 * Rechercher uniquement des films
 */
router.get('/search/movies', asyncHandler(async (req, res) => {
  const { 
    q, 
    page = '1', 
    pageSize = '20', 
    lang = 'fr-FR',
    year,
    autoTrad 
  } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    throw new ValidationError('Le paramètre "q" est requis pour la recherche');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let results = await provider.searchMovies(q.trim(), {
    page: parseInt(page) || 1,
    pageSize: parseInt(pageSize) || 20,
    lang,
    year: year ? parseInt(year) : null
  });

  if (autoTradEnabled && targetLang && results.data?.length > 0) {
    results = await translateSearchResults(results, targetLang, {
      fields: ['description']
    });
  }

  res.json(results);
}));

/**
 * GET /media/tmdb/search/series
 * Rechercher uniquement des séries
 */
router.get('/search/series', asyncHandler(async (req, res) => {
  const { 
    q, 
    page = '1', 
    pageSize = '20', 
    lang = 'fr-FR',
    year,
    autoTrad 
  } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    throw new ValidationError('Le paramètre "q" est requis pour la recherche');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let results = await provider.searchSeries(q.trim(), {
    page: parseInt(page) || 1,
    pageSize: parseInt(pageSize) || 20,
    lang,
    year: year ? parseInt(year) : null
  });

  if (autoTradEnabled && targetLang && results.data?.length > 0) {
    results = await translateSearchResults(results, targetLang, {
      fields: ['description']
    });
  }

  res.json(results);
}));

// ═══════════════════════════════════════════════════════════════════════════
// DÉTAILS FILM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tmdb/movies/:id
 * Détails d'un film
 * 
 * Params :
 * - id (required) : ID TMDB du film
 * 
 * Query params :
 * - lang : Langue (défaut fr-FR)
 * - autoTrad : Activer la traduction automatique
 */
router.get('/movies/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang = 'fr-FR', autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('Le paramètre "id" est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await provider.getMovie(id, { lang });

  // Traduction automatique si activée
  result = await translateDetailResult(result, targetLang, autoTradEnabled);

  res.json({
    success: true,
    provider: 'tmdb',
    domain: 'media',
    type: 'movie',
    id,
    data: result,
    meta: {
      lang,
      autoTrad: autoTradEnabled
    }
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
// DÉTAILS SÉRIE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tmdb/series/:id
 * Détails d'une série
 */
router.get('/series/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang = 'fr-FR', autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('Le paramètre "id" est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await provider.getSeries(id, { lang });

  result = await translateDetailResult(result, targetLang, autoTradEnabled);

  res.json({
    success: true,
    provider: 'tmdb',
    domain: 'media',
    type: 'series',
    id,
    data: result,
    meta: {
      lang,
      autoTrad: autoTradEnabled
    }
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
// SAISON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tmdb/series/:id/season/:season
 * Détails d'une saison
 */
router.get('/series/:id/season/:season', asyncHandler(async (req, res) => {
  const { id, season } = req.params;
  const { lang = 'fr-FR', autoTrad } = req.query;

  if (!id || !season) {
    throw new ValidationError('Les paramètres "id" et "season" sont requis');
  }

  const seasonNumber = parseInt(season);
  if (isNaN(seasonNumber)) {
    throw new ValidationError('Le numéro de saison doit être un nombre');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await provider.getSeason(id, seasonNumber, { lang });

  // Traduire overview de la saison
  result = await translateDetailResult(result, targetLang, autoTradEnabled);

  // Traduire les overviews des épisodes si autoTrad activé
  if (autoTradEnabled && targetLang && result.episodes?.length > 0) {
    result.episodes = await Promise.all(
      result.episodes.map(async (ep) => {
        if (ep.overview) {
          const { text, translated } = await translateText(ep.overview, targetLang, { enabled: true });
          if (translated) {
            return { ...ep, overviewOriginal: ep.overview, overview: text };
          }
        }
        return ep;
      })
    );
  }

  res.json({
    success: true,
    provider: 'tmdb',
    domain: 'media',
    type: 'season',
    seriesId: id,
    seasonNumber,
    data: result,
    meta: {
      lang,
      autoTrad: autoTradEnabled
    }
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
// ÉPISODE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tmdb/series/:id/season/:season/episode/:episode
 * Détails d'un épisode
 */
router.get('/series/:id/season/:season/episode/:episode', asyncHandler(async (req, res) => {
  const { id, season, episode } = req.params;
  const { lang = 'fr-FR', autoTrad } = req.query;

  if (!id || !season || !episode) {
    throw new ValidationError('Les paramètres "id", "season" et "episode" sont requis');
  }

  const seasonNumber = parseInt(season);
  const episodeNumber = parseInt(episode);
  
  if (isNaN(seasonNumber) || isNaN(episodeNumber)) {
    throw new ValidationError('Les numéros de saison et épisode doivent être des nombres');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await provider.getEpisode(id, seasonNumber, episodeNumber, { lang });

  // Traduire overview
  if (autoTradEnabled && targetLang && result.overview) {
    const { text, translated } = await translateText(result.overview, targetLang, { enabled: true });
    if (translated) {
      result.overviewOriginal = result.overview;
      result.overview = text;
    }
  }

  res.json({
    success: true,
    provider: 'tmdb',
    domain: 'media',
    type: 'episode',
    seriesId: id,
    seasonNumber,
    episodeNumber,
    data: result,
    meta: {
      lang,
      autoTrad: autoTradEnabled
    }
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
// COLLECTION / SAGA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tmdb/collections/:id
 * Détails d'une collection/saga avec la liste des films
 */
router.get('/collections/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang = 'fr-FR', autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('Le paramètre "id" est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await provider.getCollection(id, { lang });

  // Traduire l'overview de la collection
  if (autoTradEnabled && targetLang && result.overview) {
    const { text, translated } = await translateText(result.overview, targetLang, { enabled: true });
    if (translated) {
      result.overviewOriginal = result.overview;
      result.overview = text;
    }
  }

  // Traduire les overviews des films de la collection
  if (autoTradEnabled && targetLang && result.parts?.length > 0) {
    result.parts = await Promise.all(
      result.parts.map(async (movie) => {
        if (movie.overview) {
          const { text, translated } = await translateText(movie.overview, targetLang, { enabled: true });
          if (translated) {
            return { ...movie, overviewOriginal: movie.overview, overview: text };
          }
        }
        return movie;
      })
    );
  }

  res.json({
    success: true,
    provider: 'tmdb',
    domain: 'media',
    type: 'collection',
    id,
    data: result,
    meta: {
      lang,
      autoTrad: autoTradEnabled
    }
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
// PERSONNE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tmdb/persons/:id
 * Détails d'une personne (acteur, réalisateur, etc.)
 */
router.get('/persons/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang = 'fr-FR', autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('Le paramètre "id" est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await provider.getPerson(id, { lang });

  // Traduire la biographie si autoTrad activé
  if (autoTradEnabled && targetLang && result.biography) {
    const { text, translated } = await translateText(result.biography, targetLang, { enabled: true });
    if (translated) {
      result.biographyOriginal = result.biography;
      result.biography = text;
    }
  }

  res.json({
    success: true,
    provider: 'tmdb',
    domain: 'media',
    type: 'person',
    id,
    data: result,
    meta: {
      lang,
      autoTrad: autoTradEnabled
    }
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
// RÉALISATEUR -> FILMS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tmdb/directors/:id/movies
 * Liste des films réalisés par une personne
 */
router.get('/directors/:id/movies', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang = 'fr-FR', autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('Le paramètre "id" est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  const result = await provider.getDirectorMovies(id, { lang });

  // Traduire les overviews des films si autoTrad activé
  // Note: les films dans getDirectorMovies n'ont pas d'overview complet
  // On pourrait l'ajouter si nécessaire

  res.json({
    success: true,
    provider: 'tmdb',
    domain: 'media',
    type: 'director_filmography',
    directorId: id,
    director: result.person,
    total: result.total,
    data: result.movies,
    meta: {
      lang,
      autoTrad: autoTradEnabled
    }
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
// DISCOVER (Bonus)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tmdb/discover/movies
 * Découvrir des films selon critères
 * 
 * Query params :
 * - page : Page (défaut 1)
 * - sortBy : Tri (popularity.desc, release_date.desc, vote_average.desc)
 * - year : Année de sortie
 * - genre : ID du genre
 * - lang : Langue (défaut fr-FR)
 */
router.get('/discover/movies', asyncHandler(async (req, res) => {
  const { 
    page = '1', 
    sortBy = 'popularity.desc',
    year,
    genre,
    lang = 'fr-FR',
    autoTrad
  } = req.query;

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let results = await provider.discoverMovies({
    page: parseInt(page) || 1,
    sortBy,
    year: year ? parseInt(year) : null,
    genre,
    lang
  });

  if (autoTradEnabled && targetLang && results.data?.length > 0) {
    results = await translateSearchResults(results, targetLang, {
      fields: ['description']
    });
  }

  res.json(results);
}));

export default router;
