/**
 * Cache Refresher
 * Rafraîchit les entrées de cache expirées en appelant les providers
 * Tako API v1.0.0
 */

import { getExpiredEntries, saveCached } from './discovery-cache.repository.js';
import { createLogger } from '../../shared/utils/logger.js';

const log = createLogger('CacheRefresh');

// Mapping des providers vers leurs fonctions de fetch
const PROVIDER_FETCHERS = {
  tmdb: {
    trending: async (options) => {
      const { TmdbProvider } = await import('../../domains/media/providers/tmdb.provider.js');
      const provider = new TmdbProvider();
      return await provider.getTrending(options.category, options.period, {
        limit: 20,
        lang: 'fr-FR',
        page: 1
      });
    },
    popular: async (options) => {
      const { TmdbProvider } = await import('../../domains/media/providers/tmdb.provider.js');
      const provider = new TmdbProvider();
      return await provider.getPopular(options.category, {
        limit: 20,
        lang: 'fr-FR',
        page: 1
      });
    },
    'top-rated': async (options) => {
      const { TmdbProvider } = await import('../../domains/media/providers/tmdb.provider.js');
      const provider = new TmdbProvider();
      return await provider.getTopRated(options.category, {
        limit: 20,
        lang: 'fr-FR',
        page: 1
      });
    },
    upcoming: async (options) => {
      const { TmdbProvider } = await import('../../domains/media/providers/tmdb.provider.js');
      const provider = new TmdbProvider();
      if (options.category === 'movie') {
        return await provider.getUpcomingMovies({ limit: 20, lang: 'fr-FR', page: 1 });
      } else if (options.category === 'tv') {
        if (options.variant === 'on-the-air') {
          return await provider.getOnTheAir({ limit: 20, lang: 'fr-FR', page: 1 });
        } else {
          return await provider.getAiringToday({ limit: 20, lang: 'fr-FR', page: 1 });
        }
      }
    }
  },
  
  jikan: {
    trending: async () => {
      const { JikanProvider } = await import('../../domains/anime-manga/providers/jikan.provider.js');
      const provider = new JikanProvider();
      return await provider.getTrending({ limit: 20 });
    },
    top: async () => {
      const { JikanProvider } = await import('../../domains/anime-manga/providers/jikan.provider.js');
      const provider = new JikanProvider();
      return await provider.getTop({ limit: 20 });
    },
    upcoming: async () => {
      const { JikanProvider } = await import('../../domains/anime-manga/providers/jikan.provider.js');
      const provider = new JikanProvider();
      return await provider.getUpcoming({ limit: 20 });
    },
    schedule: async (options) => {
      const { JikanProvider } = await import('../../domains/anime-manga/providers/jikan.provider.js');
      const provider = new JikanProvider();
      return await provider.getSchedule(options.day);
    }
  },
  
  rawg: {
    popular: async () => {
      const { RawgProvider } = await import('../../domains/videogames/providers/rawg.provider.js');
      const provider = new RawgProvider();
      return await provider.getPopular({ limit: 20 });
    },
    trending: async () => {
      const { RawgProvider } = await import('../../domains/videogames/providers/rawg.provider.js');
      const provider = new RawgProvider();
      return await provider.getTrending({ limit: 20 });
    },
    upcoming: async () => {
      const { RawgProvider } = await import('../../domains/videogames/providers/rawg.provider.js');
      const provider = new RawgProvider();
      return await provider.getUpcoming({ limit: 20 });
    }
  },
  
  igdb: {
    popular: async () => {
      const { IgdbProvider } = await import('../../domains/videogames/providers/igdb.provider.js');
      const provider = new IgdbProvider();
      return await provider.getPopular({ limit: 20 });
    },
    upcoming: async () => {
      const { IgdbProvider } = await import('../../domains/videogames/providers/igdb.provider.js');
      const provider = new IgdbProvider();
      return await provider.getUpcoming({ limit: 20 });
    }
  },
  
  deezer: {
    charts: async () => {
      const { DeezerProvider } = await import('../../domains/music/providers/deezer.provider.js');
      const provider = new DeezerProvider();
      return await provider.getCharts({ limit: 20 });
    }
  },
  
  itunes: {
    charts: async () => {
      const { ItunesProvider } = await import('../../domains/music/providers/itunes.provider.js');
      const provider = new ItunesProvider();
      return await provider.getCharts({ limit: 20 });
    }
  }
};

/**
 * Rafraîchit une entrée de cache expirée
 * @param {Object} entry - Entrée de cache à rafraîchir
 * @returns {Promise<boolean>} Succès du refresh
 */
async function refreshCacheEntry(entry) {
  const { cache_key, provider, endpoint, category, period } = entry;
  
  try {
    log.debug(`Refreshing cache: ${cache_key}`);
    
    // Trouver le fetcher approprié
    const providerFetchers = PROVIDER_FETCHERS[provider];
    if (!providerFetchers) {
      log.warn(`No fetcher for provider: ${provider}`);
      return false;
    }
    
    const fetcher = providerFetchers[endpoint];
    if (!fetcher) {
      log.warn(`No fetcher for ${provider}/${endpoint}`);
      return false;
    }
    
    // Préparer les options
    const options = {};
    if (category) options.category = category;
    if (period) options.period = period;
    
    // Parser le cache_key pour extraire les options supplémentaires
    const keyParts = cache_key.split(':');
    if (keyParts.length >= 4 && endpoint === 'schedule') {
      options.day = keyParts[3]; // jikan:schedule:monday
    }
    if (keyParts.length >= 5 && endpoint === 'upcoming' && provider === 'tmdb') {
      options.variant = keyParts[4]; // tmdb:upcoming:tv::on-the-air
    }
    
    // Appeler le provider
    const startTime = Date.now();
    const data = await fetcher(options);
    const duration = Date.now() - startTime;
    
    // Déterminer le TTL selon le type d'endpoint
    let ttl = 24 * 60 * 60; // 24h par défaut
    if (endpoint === 'upcoming' || endpoint === 'schedule') {
      ttl = 6 * 60 * 60; // 6h pour upcoming/schedule
    } else if (endpoint === 'charts') {
      ttl = 24 * 60 * 60; // 24h pour charts
    }
    
    // Sauvegarder en cache
    await saveCached(cache_key, provider, endpoint, data, {
      category,
      period,
      ttl
    });
    
    log.info(`✅ Cache refreshed: ${cache_key} (${duration}ms)`, {
      results: data.total || data.data?.length || 0
    });
    
    return true;
  } catch (err) {
    log.error(`❌ Failed to refresh ${cache_key}: ${err.message}`);
    return false;
  }
}

/**
 * Rafraîchit toutes les entrées expirées
 * @param {number} batchSize - Nombre d'entrées à rafraîchir par batch
 * @returns {Promise<{total: number, success: number, failed: number}>}
 */
export async function refreshExpiredCaches(batchSize = 10) {
  const startTime = Date.now();
  
  try {
    // Récupérer les entrées expirées
    const expiredEntries = await getExpiredEntries(batchSize);
    
    if (expiredEntries.length === 0) {
      log.debug('No expired cache entries to refresh');
      return { total: 0, success: 0, failed: 0 };
    }
    
    log.info(`🔄 Refreshing ${expiredEntries.length} expired cache entries...`);
    
    // Rafraîchir chaque entrée
    let success = 0;
    let failed = 0;
    
    for (const entry of expiredEntries) {
      const result = await refreshCacheEntry(entry);
      if (result) {
        success++;
      } else {
        failed++;
      }
      
      // Petit délai entre chaque refresh pour ne pas surcharger les APIs
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const duration = Date.now() - startTime;
    log.info(`✅ Cache refresh complete: ${success} success, ${failed} failed (${duration}ms)`);
    
    return {
      total: expiredEntries.length,
      success,
      failed,
      duration
    };
  } catch (err) {
    log.error(`❌ Cache refresh error: ${err.message}`);
    return { total: 0, success: 0, failed: 0, error: err.message };
  }
}

/**
 * Rafraîchit un provider spécifique
 * @param {string} provider - Nom du provider (tmdb, jikan, etc.)
 * @returns {Promise<Object>}
 */
export async function refreshProviderCaches(provider) {
  const startTime = Date.now();
  
  try {
    // Récupérer toutes les entrées du provider
    const { queryAll } = await import('./connection.js');
    const entries = await queryAll(
      `SELECT * FROM discovery_cache 
       WHERE provider = $1 
       ORDER BY expires_at ASC 
       LIMIT 20`,
      [provider]
    );
    
    if (entries.length === 0) {
      log.debug(`No cache entries for provider: ${provider}`);
      return { total: 0, success: 0, failed: 0 };
    }
    
    log.info(`🔄 Refreshing ${entries.length} cache entries for ${provider}...`);
    
    let success = 0;
    let failed = 0;
    
    for (const entry of entries) {
      const result = await refreshCacheEntry(entry);
      if (result) {
        success++;
      } else {
        failed++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const duration = Date.now() - startTime;
    log.info(`✅ Provider refresh complete (${provider}): ${success} success, ${failed} failed (${duration}ms)`);
    
    return {
      provider,
      total: entries.length,
      success,
      failed,
      duration
    };
  } catch (err) {
    log.error(`❌ Provider refresh error (${provider}): ${err.message}`);
    return { provider, total: 0, success: 0, failed: 0, error: err.message };
  }
}
