/**
 * Routes iTunes
 * 
 * Endpoints pour l'API iTunes Search (albums, artistes, tracks)
 * 
 * @module domains/music/routes/itunes
 */

import { Router } from 'express';
import * as itunesProvider from '../providers/itunes.provider.js';
import * as itunesNormalizer from '../normalizers/itunes.normalizer.js';
import { logger } from '../../../shared/utils/logger.js';
import { withDiscoveryCache, getTTL } from '../../../shared/utils/cache-wrapper.js';

const router = Router();
const log = logger.create('iTunesRoutes');

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /health
 * Vérifie la disponibilité de l'API iTunes
 */
router.get('/health', async (req, res) => {
  try {
    const health = await itunesProvider.healthCheck();
    
    res.json({
      provider: 'itunes',
      status: health.status,
      latency: health.latency,
      features: [
        'Recherche albums/artistes/tracks',
        'Catalogue Apple Music/iTunes Store',
        'Previews audio 30 secondes',
        'Prix et disponibilité par pays',
        'Liens d\'achat/streaming'
      ]
    });
  } catch (error) {
    log.error('Health check failed', { error: error.message });
    res.status(503).json({
      provider: 'itunes',
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
 * Recherche globale (all)
 */
router.get('/search', async (req, res) => {
  try {
    const { q, type = 'musicArtist,album,musicTrack', limit = 25, country = 'FR' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre q (query) est requis'
      });
    }
    
    const data = await itunesProvider.search(q, { 
      entity: type,
      limit: parseInt(limit),
      country
    });
    
    // Grouper par type
    const results = {
      artists: [],
      albums: [],
      tracks: []
    };
    
    for (const item of data.results || []) {
      if (item.wrapperType === 'artist') {
        results.artists.push({
          id: item.artistId,
          name: item.artistName,
          genre: item.primaryGenreName,
          url: item.artistLinkUrl || item.artistViewUrl
        });
      } else if (item.wrapperType === 'collection' || item.collectionType === 'Album') {
        results.albums.push({
          id: item.collectionId,
          title: item.collectionName,
          artist: item.artistName,
          artistId: item.artistId,
          cover: item.artworkUrl100?.replace('100x100', '600x600'),
          trackCount: item.trackCount,
          releaseDate: item.releaseDate,
          genre: item.primaryGenreName,
          price: item.collectionPrice,
          currency: item.currency,
          url: item.collectionViewUrl
        });
      } else if (item.wrapperType === 'track') {
        results.tracks.push({
          id: item.trackId,
          title: item.trackName,
          artist: item.artistName,
          artistId: item.artistId,
          album: item.collectionName,
          albumId: item.collectionId,
          duration: item.trackTimeMillis,
          previewUrl: item.previewUrl,
          cover: item.artworkUrl100?.replace('100x100', '600x600'),
          genre: item.primaryGenreName,
          price: item.trackPrice,
          currency: item.currency,
          url: item.trackViewUrl
        });
      }
    }
    
    res.json({
      success: true,
      provider: 'itunes',
      domain: 'music',
      query: q,
      total: data.resultCount,
      results,
      source: 'itunes'
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
 * Recherche d'albums
 */
router.get('/search/albums', async (req, res) => {
  try {
    const { q, limit = 25, country = 'FR' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre q (query) est requis'
      });
    }
    
    const data = await itunesProvider.searchAlbums(q, { 
      limit: parseInt(limit),
      country
    });
    const normalized = itunesNormalizer.normalizeAlbumSearchResponse(data, q);
    
    res.json({
      success: true,
      provider: 'itunes',
      domain: 'music',
      ...normalized,
      source: 'itunes'
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
 * GET /search/artists
 * Recherche d'artistes
 */
router.get('/search/artists', async (req, res) => {
  try {
    const { q, limit = 25, country = 'FR' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre q (query) est requis'
      });
    }
    
    const data = await itunesProvider.searchArtists(q, { 
      limit: parseInt(limit),
      country 
    });
    const normalized = itunesNormalizer.normalizeArtistSearchResponse(data, q);
    
    res.json({
      success: true,
      provider: 'itunes',
      domain: 'music',
      ...normalized,
      source: 'itunes'
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
 * GET /search/tracks
 * Recherche de tracks/chansons
 */
router.get('/search/tracks', async (req, res) => {
  try {
    const { q, limit = 25, country = 'FR' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre q (query) est requis'
      });
    }
    
    const data = await itunesProvider.searchTracks(q, { 
      limit: parseInt(limit),
      country 
    });
    const normalized = itunesNormalizer.normalizeTrackSearchResponse(data, q);
    
    res.json({
      success: true,
      provider: 'itunes',
      domain: 'music',
      ...normalized,
      source: 'itunes'
    });
  } catch (error) {
    log.error('Track search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DÉTAILS ALBUM
// ============================================================================

/**
 * GET /albums/:id
 * Détails d'un album avec ses tracks
 */
router.get('/albums/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { country = 'FR' } = req.query;
    
    const data = await itunesProvider.getAlbum(id, { country });
    const normalized = itunesNormalizer.normalizeAlbumDetail(data);
    
    res.json({
      success: true,
      provider: 'itunes',
      domain: 'music',
      type: 'album',
      id: parseInt(id),
      data: normalized,
      source: 'itunes'
    });
  } catch (error) {
    log.error('Get album failed', { error: error.message });
    res.status(error.message.includes('non trouvé') ? 404 : 500).json({
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
    const { country = 'FR' } = req.query;
    
    const data = await itunesProvider.getArtist(id, { country });
    const normalized = itunesNormalizer.normalizeArtistDetail(data);
    
    res.json({
      success: true,
      provider: 'itunes',
      domain: 'music',
      type: 'artist',
      id: parseInt(id),
      data: normalized,
      source: 'itunes'
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
 * GET /artists/:id/albums
 * Albums d'un artiste
 */
router.get('/artists/:id/albums', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, country = 'FR' } = req.query;
    
    const data = await itunesProvider.getArtistAlbums(id, { 
      limit: parseInt(limit),
      country 
    });
    const normalized = itunesNormalizer.normalizeArtistAlbums(data, id);
    
    res.json({
      success: true,
      provider: 'itunes',
      domain: 'music',
      type: 'artist-albums',
      ...normalized,
      source: 'itunes'
    });
  } catch (error) {
    log.error('Get artist albums failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DÉTAILS TRACK
// ============================================================================

/**
 * GET /tracks/:id
 * Détails d'un track
 */
router.get('/tracks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { country = 'FR' } = req.query;
    
    const data = await itunesProvider.lookup(id, { country, entity: 'song' });
    
    if (!data.results || data.results.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Track ${id} non trouvé`
      });
    }
    
    const track = data.results[0];
    
    res.json({
      success: true,
      provider: 'itunes',
      domain: 'music',
      type: 'track',
      id: parseInt(id),
      data: {
        id: track.trackId,
        title: track.trackName,
        artist: {
          id: track.artistId,
          name: track.artistName
        },
        album: {
          id: track.collectionId,
          title: track.collectionName,
          cover: {
            small: track.artworkUrl60,
            medium: track.artworkUrl100,
            large: track.artworkUrl100?.replace('100x100', '600x600')
          }
        },
        trackNumber: track.trackNumber,
        discNumber: track.discNumber,
        duration: track.trackTimeMillis,
        durationFormatted: track.trackTimeMillis 
          ? `${Math.floor(track.trackTimeMillis / 60000)}:${String(Math.floor((track.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}`
          : null,
        genre: track.primaryGenreName,
        releaseDate: track.releaseDate,
        explicit: track.trackExplicitness === 'explicit',
        previewUrl: track.previewUrl,
        price: track.trackPrice,
        currency: track.currency,
        url: track.trackViewUrl,
        isStreamable: track.isStreamable
      },
      source: 'itunes'
    });
  } catch (error) {
    log.error('Get track failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// CHARTS (🆕)
// ============================================================================

/**
 * GET /charts
 * Top charts iTunes par pays
 */
router.get('/charts', async (req, res) => {
  try {
    const { 
      country = 'fr',
      category = 'album', // album ou song
      limit = 25 
    } = req.query;
    
    // Validation de la catégorie
    const validCategories = ['album', 'song'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: `Catégorie invalide. Valeurs acceptées: ${validCategories.join(', ')}`
      });
    }
    
    const { data: rawData, fromCache, cacheKey } = await withDiscoveryCache({
      provider: 'itunes',
      endpoint: 'charts',
      fetchFn: async () => {
        return await itunesProvider.getCharts({ 
          country: country.toLowerCase(),
          entity: category,
          limit: parseInt(limit)
        });
      },
      cacheOptions: {
        category: `${country.toLowerCase()}-${category}`,
        ttl: getTTL('charts')
      }
    });
    
    // L'API RSS iTunes retourne un format différent
    const feed = rawData?.feed;
    if (!feed || !feed.entry) {
      return res.json({
        success: true,
        provider: 'itunes',
        domain: 'music',
        endpoint: 'charts',
        data: [],
        metadata: {
          country: country.toUpperCase(),
          category,
          limit: parseInt(limit),
          count: 0,
          cached: fromCache,
          cacheKey
        }
      });
    }
    
    // Normalisation simplifiée
    const results = feed.entry.map((item, index) => ({
      position: index + 1,
      id: item.id?.attributes?.['im:id'],
      title: item['im:name']?.label || item.title?.label,
      artist: item['im:artist']?.label,
      cover: item['im:image']?.[2]?.label || item['im:image']?.[1]?.label,
      genre: item.category?.attributes?.label,
      releaseDate: item['im:releaseDate']?.label,
      price: item['im:price']?.label,
      url: item.link?.attributes?.href
    }));
    
    res.json({
      success: true,
      provider: 'itunes',
      domain: 'music',
      endpoint: 'charts',
      data: results,
      metadata: {
        country: country.toUpperCase(),
        category,
        limit: parseInt(limit),
        count: results.length,
        updated: feed.updated?.label,
        cached: fromCache,
        cacheKey
      }
    });
  } catch (error) {
    log.error('Get charts failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
