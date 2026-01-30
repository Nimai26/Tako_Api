/**
 * Routes TVDB
 * 
 * Endpoints pour l'API TheTVDB.
 * 
 * Routes disponibles :
 * - GET /health - Vérifier la disponibilité
 * - GET /search - Recherche (séries, films, personnes)
 * - GET /search/movies - Rechercher uniquement des films
 * - GET /search/series - Rechercher uniquement des séries
 * - GET /movies/:id - Détails d'un film
 * - GET /series/:id - Détails d'une série
 * - GET /series/:id/seasons - Liste des saisons
 * - GET /seasons/:id - Détails d'une saison
 * - GET /series/:id/episodes - Épisodes d'une série
 * - GET /episodes/:id - Détails d'un épisode
 * - GET /lists/:id - Détails d'une liste/saga
 * - GET /persons/:id - Détails d'une personne
 * - GET /directors/:id/works - Films/séries d'un réalisateur
 * 
 * Support traduction :
 * - lang : Code langue (fr, en, de, etc.)
 * - autoTrad : Activer la traduction automatique (1 ou true)
 */

import { Router } from 'express';
import { TvdbProvider } from '../providers/tvdb.provider.js';
import { asyncHandler } from '../../../shared/utils/async-handler.js';
import { ValidationError } from '../../../shared/errors/index.js';
import {
  translateSearchResults,
  translateText,
  isAutoTradEnabled,
  extractLangCode
} from '../../../shared/utils/translator.js';

const router = Router();
const provider = new TvdbProvider();

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

  // Traduire genres si présents
  if (result.genres && Array.isArray(result.genres) && result.genres.length > 0) {
    const genreTranslations = await Promise.all(
      result.genres.map(async (genre) => {
        const { text, translated: wasTranslated } = await translateText(genre, targetLang, { enabled: true });
        return wasTranslated ? text : genre;
      })
    );
    
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
    provider: 'tvdb',
    status: isConfigured ? 'healthy' : 'unhealthy',
    message: isConfigured ? 'TVDB API configurée' : 'TVDB_API_KEY non configurée'
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
// RECHERCHE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tvdb/search
 * Recherche générale
 * 
 * Query params :
 * - q (required) : Terme de recherche
 * - type : Type (series, movie, person, company)
 * - pageSize : Résultats par page (max 50)
 * - lang : Langue
 * - year : Année de sortie
 * - autoTrad : Activer la traduction automatique
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { 
    q, 
    type, 
    pageSize = '20', 
    lang,
    year,
    autoTrad 
  } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    throw new ValidationError('Le paramètre "q" est requis pour la recherche');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let results = await provider.search(q.trim(), {
    type: type || null,
    pageSize: parseInt(pageSize) || 20,
    lang,
    year: year ? parseInt(year) : null
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
 * GET /media/tvdb/search/movies
 * Rechercher uniquement des films
 */
router.get('/search/movies', asyncHandler(async (req, res) => {
  const { q, pageSize = '20', lang, year, autoTrad } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    throw new ValidationError('Le paramètre "q" est requis pour la recherche');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let results = await provider.searchMovies(q.trim(), {
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
 * GET /media/tvdb/search/series
 * Rechercher uniquement des séries
 */
router.get('/search/series', asyncHandler(async (req, res) => {
  const { q, pageSize = '20', lang, year, autoTrad } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    throw new ValidationError('Le paramètre "q" est requis pour la recherche');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let results = await provider.searchSeries(q.trim(), {
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
 * GET /media/tvdb/movies/:id
 * Détails d'un film
 */
router.get('/movies/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang, autoTrad } = req.query;

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
    provider: 'tvdb',
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
 * GET /media/tvdb/series/:id
 * Détails d'une série
 */
router.get('/series/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang, autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('Le paramètre "id" est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await provider.getSeries(id, { lang });

  result = await translateDetailResult(result, targetLang, autoTradEnabled);

  res.json({
    success: true,
    provider: 'tvdb',
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
// SAISONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tvdb/series/:id/seasons
 * Liste des saisons d'une série
 */
router.get('/series/:id/seasons', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang, autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('Le paramètre "id" est requis');
  }

  const result = await provider.getSeriesSeasons(id, { lang });

  res.json({
    success: true,
    provider: 'tvdb',
    domain: 'media',
    type: 'seasons',
    seriesId: id,
    seriesName: result.seriesName,
    total: result.total,
    data: result.seasons,
    meta: {
      lang
    }
  });
}));

/**
 * GET /media/tvdb/seasons/:id
 * Détails d'une saison (par ID TVDB de la saison)
 */
router.get('/seasons/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang, autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('Le paramètre "id" est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await provider.getSeason(id, { lang });

  // Traduire l'overview de la saison
  if (autoTradEnabled && targetLang && result.overview) {
    const { text, translated } = await translateText(result.overview, targetLang, { enabled: true });
    if (translated) {
      result.overviewOriginal = result.overview;
      result.overview = text;
    }
  }

  // Traduire les overviews des épisodes
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
    provider: 'tvdb',
    domain: 'media',
    type: 'season',
    id,
    data: result,
    meta: {
      lang,
      autoTrad: autoTradEnabled
    }
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
// ÉPISODES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tvdb/series/:id/episodes
 * Liste des épisodes d'une série
 */
router.get('/series/:id/episodes', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang, season, page = '0', autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('Le paramètre "id" est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await provider.getSeriesEpisodes(id, {
    lang,
    season: season ? parseInt(season) : null,
    page: parseInt(page) || 0
  });

  // Traduire les overviews des épisodes
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
    provider: 'tvdb',
    domain: 'media',
    type: 'episodes',
    seriesId: id,
    season: season ? parseInt(season) : null,
    total: result.total,
    data: result.episodes,
    meta: {
      lang,
      autoTrad: autoTradEnabled,
      links: result.links
    }
  });
}));

/**
 * GET /media/tvdb/episodes/:id
 * Détails d'un épisode (par ID TVDB de l'épisode)
 */
router.get('/episodes/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang, autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('Le paramètre "id" est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await provider.getEpisode(id, { lang });

  // Traduire l'overview
  if (autoTradEnabled && targetLang && result.overview) {
    const { text, translated } = await translateText(result.overview, targetLang, { enabled: true });
    if (translated) {
      result.overviewOriginal = result.overview;
      result.overview = text;
    }
  }

  res.json({
    success: true,
    provider: 'tvdb',
    domain: 'media',
    type: 'episode',
    id,
    data: result,
    meta: {
      lang,
      autoTrad: autoTradEnabled
    }
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
// LISTES / SAGAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tvdb/lists/:id
 * Détails d'une liste/saga TVDB
 */
router.get('/lists/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang, autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('Le paramètre "id" est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await provider.getList(id, { lang });

  // Traduire l'overview de la liste
  if (autoTradEnabled && targetLang && result.overview) {
    const { text, translated } = await translateText(result.overview, targetLang, { enabled: true });
    if (translated) {
      result.overviewOriginal = result.overview;
      result.overview = text;
    }
  }

  res.json({
    success: true,
    provider: 'tvdb',
    domain: 'media',
    type: 'list',
    id,
    data: result,
    meta: {
      lang,
      autoTrad: autoTradEnabled
    }
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
// PERSONNES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /media/tvdb/persons/:id
 * Détails d'une personne
 */
router.get('/persons/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang, autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('Le paramètre "id" est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let result = await provider.getPerson(id, { lang });

  // Traduire les biographies si présentes et autoTrad activé
  if (autoTradEnabled && targetLang && result.biographies?.length > 0) {
    // Trouver la biographie en anglais à traduire
    const engBio = result.biographies.find(b => b.language === 'eng');
    if (engBio?.biography) {
      const { text, translated } = await translateText(engBio.biography, targetLang, { enabled: true });
      if (translated) {
        result.biography = text;
        result.biographyOriginal = engBio.biography;
      }
    }
  }

  res.json({
    success: true,
    provider: 'tvdb',
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
 * GET /media/tvdb/directors/:id/works
 * Liste des films/séries réalisés par une personne
 */
router.get('/directors/:id/works', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang, autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('Le paramètre "id" est requis');
  }

  const result = await provider.getDirectorWorks(id, { lang });

  res.json({
    success: true,
    provider: 'tvdb',
    domain: 'media',
    type: 'director_works',
    directorId: id,
    director: result.person,
    movies: result.movies,
    series: result.series,
    totalMovies: result.totalMovies,
    totalSeries: result.totalSeries,
    meta: {
      lang
    }
  });
}));

export default router;
