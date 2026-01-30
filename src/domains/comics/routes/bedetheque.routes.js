/**
 * Routes Bedetheque
 * 
 * Endpoints pour le scraping de Bedetheque.
 * 
 * Routes disponibles :
 * - GET /health - Vérifier la disponibilité
 * - GET /search - Rechercher des BD/albums
 * - GET /album/:id - Détails d'un album
 * 
 * Note: Bedetheque est principalement francophone, 
 * la traduction vers d'autres langues est supportée via autoTrad.
 */

import { Router } from 'express';
import { BedethequeProvider } from '../providers/bedetheque.provider.js';
import { asyncHandler } from '../../../shared/utils/async-handler.js';
import { ValidationError } from '../../../shared/errors/index.js';
import {
  translateSearchResults,
  translateText,
  isAutoTradEnabled,
  extractLangCode
} from '../../../shared/utils/translator.js';

const router = Router();
const provider = new BedethequeProvider();

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════

router.get('/health', asyncHandler(async (req, res) => {
  const health = await provider.healthCheck();

  res.status(health.healthy ? 200 : 503).json({
    provider: 'bedetheque',
    status: health.healthy ? 'healthy' : 'unhealthy',
    latency: health.latency,
    message: health.message
  });
}));

// ═══════════════════════════════════════════════════════════════════════════
// RECHERCHE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /comics/bedetheque/search
 * Rechercher des BD/albums
 * 
 * Query params :
 * - q (required) : Terme de recherche
 * - maxResults : Nombre de résultats (défaut 20)
 * - lang : Langue cible pour traduction
 * - autoTrad : Activer la traduction automatique (1 ou true)
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q, maxResults = '20', lang, autoTrad } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    throw new ValidationError('Le paramètre "q" est requis pour la recherche');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let results = await provider.search(q.trim(), {
    maxResults: parseInt(maxResults) || 20
  });

  // Traduction automatique si activée et langue != français
  if (autoTradEnabled && targetLang && targetLang !== 'fr' && results.data?.length > 0) {
    results = await translateSearchResults(results, targetLang, {
      fields: ['title', 'description']
    });
  }

  res.json(results);
}));

/**
 * GET /comics/bedetheque/search/series
 * Rechercher des séries de BD
 */
router.get('/search/series', asyncHandler(async (req, res) => {
  const { q, maxResults = '20', lang, autoTrad } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    throw new ValidationError('Le paramètre "q" est requis pour la recherche');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let results = await provider.searchSeries(q.trim(), {
    maxResults: parseInt(maxResults) || 20
  });

  if (autoTradEnabled && targetLang && targetLang !== 'fr' && results.data?.length > 0) {
    results = await translateSearchResults(results, targetLang, {
      fields: ['title', 'description']
    });
  }

  res.json(results);
}));

/**
 * GET /comics/bedetheque/search/authors
 * Rechercher des auteurs
 */
router.get('/search/authors', asyncHandler(async (req, res) => {
  const { q, maxResults = '20' } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    throw new ValidationError('Le paramètre "q" est requis pour la recherche');
  }

  const results = await provider.searchAuthors(q.trim(), {
    maxResults: parseInt(maxResults) || 20
  });

  res.json(results);
}));

/**
 * GET /comics/bedetheque/search/albums
 * Rechercher des albums par titre (via FlareSolverr)
 */
router.get('/search/albums', asyncHandler(async (req, res) => {
  const { q, maxResults = '20', lang, autoTrad } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    throw new ValidationError('Le paramètre "q" est requis pour la recherche');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let results = await provider.searchAlbums(q.trim(), {
    maxResults: parseInt(maxResults) || 20
  });

  if (autoTradEnabled && targetLang && targetLang !== 'fr' && results.data?.length > 0) {
    results = await translateSearchResults(results, targetLang, {
      fields: ['title', 'description']
    });
  }

  res.json(results);
}));

// ═══════════════════════════════════════════════════════════════════════════
// DÉTAILS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /comics/bedetheque/album/:id
 * Détails d'un album
 */
router.get('/album/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang, autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('L\'ID de l\'album est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let album = await provider.getAlbumDetails(id);

  // Traduction de la description si activée et langue != français
  if (autoTradEnabled && targetLang && targetLang !== 'fr' && album.description) {
    const translated = await translateText(album.description, targetLang, true);
    if (translated.translated) {
      album = {
        ...album,
        description: translated.text,
        originalDescription: album.description
      };
    }
  }

  res.json(album);
}));

/**
 * GET /comics/bedetheque/serie/:id
 * Détails d'une série
 */
router.get('/serie/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lang, autoTrad } = req.query;

  if (!id) {
    throw new ValidationError('L\'ID de la série est requis');
  }

  const autoTradEnabled = isAutoTradEnabled({ autoTrad });
  const targetLang = extractLangCode(lang);

  let serie = await provider.getSerieDetails(id);

  if (autoTradEnabled && targetLang && targetLang !== 'fr' && serie.description) {
    const translated = await translateText(serie.description, targetLang, true);
    if (translated.translated) {
      serie = {
        ...serie,
        description: translated.text,
        originalDescription: serie.description
      };
    }
  }

  res.json(serie);
}));

/**
 * GET /comics/bedetheque/serie/:id/albums
 * Albums d'une série
 */
router.get('/serie/:id/albums', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { maxResults = '100' } = req.query;

  if (!id) {
    throw new ValidationError('L\'ID de la série est requis');
  }

  const result = await provider.getSerieAlbums(id, {
    maxResults: parseInt(maxResults) || 100
  });

  res.json(result);
}));

/**
 * GET /comics/bedetheque/author/:id/works
 * Œuvres d'un auteur
 */
router.get('/author/:id/works', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { maxResults = '100' } = req.query;

  if (!id) {
    throw new ValidationError('L\'ID de l\'auteur est requis');
  }

  const result = await provider.getAuthorWorks(id, {
    maxResults: parseInt(maxResults) || 100
  });

  res.json(result);
}));

export default router;
