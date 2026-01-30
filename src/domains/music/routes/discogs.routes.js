/**
 * Routes Discogs
 * 
 * Endpoints pour l'API Discogs (releases, masters, artistes, labels)
 * 
 * @module domains/music/routes/discogs
 */

import { Router } from 'express';
import * as discogsProvider from '../providers/discogs.provider.js';
import * as discogsNormalizer from '../normalizers/discogs.normalizer.js';
import { logger } from '../../../shared/utils/logger.js';
import { translateFields } from '../../../shared/utils/translator.js';

const router = Router();
const log = logger.create('DiscogsRoutes');

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Traduit les champs texte si demandé
 */
async function applyTranslation(data, req) {
  const autoTrad = req.query.autoTrad === '1' || req.query.autoTrad === 'true';
  const lang = req.query.lang || 'fr';
  
  if (!autoTrad) return data;
  
  try {
    // Champs à traduire pour les albums/releases
    const fieldsToTranslate = ['notes', 'profile'];
    return await translateFields(data, fieldsToTranslate, lang);
  } catch (error) {
    log.warn('Translation failed', { error: error.message });
    return data;
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /health
 * Vérifie la disponibilité de l'API Discogs
 */
router.get('/health', async (req, res) => {
  try {
    const health = await discogsProvider.healthCheck();
    
    res.json({
      provider: 'discogs',
      status: health.status,
      latency: health.latency,
      hasToken: health.hasToken,
      rateLimit: health.rateLimit,
      features: [
        'Recherche releases/masters/artistes/labels',
        'Détails albums avec tracklist',
        'Discographie artistes',
        'Recherche par code-barres',
        'Base de données vinyles/CD complète'
      ]
    });
  } catch (error) {
    log.error('Health check failed', { error: error.message });
    res.status(503).json({
      provider: 'discogs',
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ============================================================================
// RECHERCHE
// ============================================================================

/**
 * GET /search
 * Recherche globale sur Discogs
 */
router.get('/search', async (req, res) => {
  try {
    const { q, type = 'release', limit = 25, page = 1 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre q (query) est requis'
      });
    }
    
    const data = await discogsProvider.search(q, { 
      type, 
      limit: parseInt(limit), 
      page: parseInt(page) 
    });
    
    const normalized = discogsNormalizer.normalizeSearchResponse(data, q, type);
    
    res.json({
      success: true,
      provider: 'discogs',
      domain: 'music',
      ...normalized,
      source: 'discogs'
    });
  } catch (error) {
    log.error('Search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /search/albums
 * Recherche d'albums (releases)
 */
router.get('/search/albums', async (req, res) => {
  try {
    const { q, limit = 25, page = 1 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre q (query) est requis'
      });
    }
    
    const data = await discogsProvider.searchReleases(q, { 
      limit: parseInt(limit), 
      page: parseInt(page) 
    });
    
    const normalized = discogsNormalizer.normalizeSearchResponse(data, q, 'release');
    
    res.json({
      success: true,
      provider: 'discogs',
      domain: 'music',
      ...normalized,
      source: 'discogs'
    });
  } catch (error) {
    log.error('Album search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /search/masters
 * Recherche de masters (albums originaux)
 */
router.get('/search/masters', async (req, res) => {
  try {
    const { q, limit = 25, page = 1 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre q (query) est requis'
      });
    }
    
    const data = await discogsProvider.searchMasters(q, { 
      limit: parseInt(limit), 
      page: parseInt(page) 
    });
    
    const normalized = discogsNormalizer.normalizeSearchResponse(data, q, 'master');
    
    res.json({
      success: true,
      provider: 'discogs',
      domain: 'music',
      ...normalized,
      source: 'discogs'
    });
  } catch (error) {
    log.error('Master search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /search/artists
 * Recherche d'artistes
 */
router.get('/search/artists', async (req, res) => {
  try {
    const { q, limit = 25, page = 1 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre q (query) est requis'
      });
    }
    
    const data = await discogsProvider.searchArtists(q, { 
      limit: parseInt(limit), 
      page: parseInt(page) 
    });
    
    const normalized = discogsNormalizer.normalizeSearchResponse(data, q, 'artist');
    
    res.json({
      success: true,
      provider: 'discogs',
      domain: 'music',
      ...normalized,
      source: 'discogs'
    });
  } catch (error) {
    log.error('Artist search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /search/labels
 * Recherche de labels
 */
router.get('/search/labels', async (req, res) => {
  try {
    const { q, limit = 25, page = 1 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre q (query) est requis'
      });
    }
    
    const data = await discogsProvider.searchLabels(q, { 
      limit: parseInt(limit), 
      page: parseInt(page) 
    });
    
    const normalized = discogsNormalizer.normalizeSearchResponse(data, q, 'label');
    
    res.json({
      success: true,
      provider: 'discogs',
      domain: 'music',
      ...normalized,
      source: 'discogs'
    });
  } catch (error) {
    log.error('Label search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// CODE-BARRES
// ============================================================================

/**
 * GET /barcode/:barcode
 * Recherche par code-barres
 */
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    
    const data = await discogsProvider.searchByBarcode(barcode);
    const normalized = discogsNormalizer.normalizeBarcodeSearch(data, barcode);
    
    res.json({
      success: true,
      provider: 'discogs',
      domain: 'music',
      ...normalized,
      source: 'discogs'
    });
  } catch (error) {
    log.error('Barcode search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DÉTAILS RELEASE
// ============================================================================

/**
 * GET /releases/:id
 * Détails d'une release
 */
router.get('/releases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await discogsProvider.getRelease(id);
    let normalized = discogsNormalizer.normalizeReleaseDetail(data);
    normalized = await applyTranslation(normalized, req);
    
    res.json({
      success: true,
      provider: 'discogs',
      domain: 'music',
      type: 'release',
      id,
      data: normalized,
      source: 'discogs'
    });
  } catch (error) {
    log.error('Get release failed', { error: error.message });
    res.status(error.message.includes('non trouvée') ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

// Alias /albums/:id -> /releases/:id
router.get('/albums/:id', async (req, res) => {
  req.params.id = req.params.id;
  return router.handle(req, res);
});

// ============================================================================
// DÉTAILS MASTER
// ============================================================================

/**
 * GET /masters/:id
 * Détails d'un master
 */
router.get('/masters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await discogsProvider.getMaster(id);
    let normalized = discogsNormalizer.normalizeMasterDetail(data);
    normalized = await applyTranslation(normalized, req);
    
    res.json({
      success: true,
      provider: 'discogs',
      domain: 'music',
      type: 'master',
      id,
      data: normalized,
      source: 'discogs'
    });
  } catch (error) {
    log.error('Get master failed', { error: error.message });
    res.status(error.message.includes('non trouvé') ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /masters/:id/versions
 * Versions d'un master
 */
router.get('/masters/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const data = await discogsProvider.getMasterVersions(id, { 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
    
    const versions = (data.versions || []).map((v, idx) => ({
      id: `discogs:release:${v.id}`,
      sourceId: String(v.id),
      title: v.title,
      format: v.format,
      label: v.label,
      country: v.country,
      released: v.released,
      poster: v.thumb
    }));
    
    res.json({
      success: true,
      provider: 'discogs',
      domain: 'music',
      type: 'master-versions',
      masterId: id,
      total: data.pagination?.items || versions.length,
      pagination: {
        page: data.pagination?.page || 1,
        pageSize: data.pagination?.per_page || 50,
        totalPages: data.pagination?.pages || 1
      },
      data: versions,
      source: 'discogs'
    });
  } catch (error) {
    log.error('Get master versions failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DÉTAILS ARTISTE
// ============================================================================

/**
 * GET /artists/:id
 * Détails d'un artiste
 */
router.get('/artists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await discogsProvider.getArtist(id);
    let normalized = discogsNormalizer.normalizeArtistDetail(data);
    normalized = await applyTranslation(normalized, req);
    
    res.json({
      success: true,
      provider: 'discogs',
      domain: 'music',
      type: 'artist',
      id,
      data: normalized,
      source: 'discogs'
    });
  } catch (error) {
    log.error('Get artist failed', { error: error.message });
    res.status(error.message.includes('non trouvé') ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /artists/:id/releases
 * Discographie d'un artiste
 */
router.get('/artists/:id/releases', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, sort = 'year', sortOrder = 'desc' } = req.query;
    
    const data = await discogsProvider.getArtistReleases(id, { 
      page: parseInt(page), 
      limit: parseInt(limit),
      sort,
      sortOrder
    });
    
    const normalized = discogsNormalizer.normalizeArtistReleases(data, id);
    
    res.json({
      success: true,
      provider: 'discogs',
      domain: 'music',
      type: 'artist-releases',
      ...normalized,
      source: 'discogs'
    });
  } catch (error) {
    log.error('Get artist releases failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DÉTAILS LABEL
// ============================================================================

/**
 * GET /labels/:id
 * Détails d'un label
 */
router.get('/labels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await discogsProvider.getLabel(id);
    let normalized = discogsNormalizer.normalizeLabelDetail(data);
    normalized = await applyTranslation(normalized, req);
    
    res.json({
      success: true,
      provider: 'discogs',
      domain: 'music',
      type: 'label',
      id,
      data: normalized,
      source: 'discogs'
    });
  } catch (error) {
    log.error('Get label failed', { error: error.message });
    res.status(error.message.includes('non trouvé') ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /labels/:id/releases
 * Releases d'un label
 */
router.get('/labels/:id/releases', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const data = await discogsProvider.getLabelReleases(id, { 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
    
    const releases = (data.releases || []).map((r, idx) => ({
      id: `discogs:release:${r.id}`,
      sourceId: String(r.id),
      position: idx + 1,
      artist: r.artist,
      title: r.title,
      year: r.year,
      format: r.format,
      catalogNumber: r.catno,
      poster: r.thumb
    }));
    
    res.json({
      success: true,
      provider: 'discogs',
      domain: 'music',
      type: 'label-releases',
      labelId: id,
      total: data.pagination?.items || releases.length,
      pagination: {
        page: data.pagination?.page || 1,
        pageSize: data.pagination?.per_page || 50,
        totalPages: data.pagination?.pages || 1
      },
      data: releases,
      source: 'discogs'
    });
  } catch (error) {
    log.error('Get label releases failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
