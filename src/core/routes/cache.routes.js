/**
 * Routes Cache Admin
 * Endpoints pour gérer le cache discovery
 */

import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { getCacheStats, clearAllCache } from '../../infrastructure/database/discovery-cache.repository.js';
import { forceRefresh, forceRefreshExpired } from '../../infrastructure/database/refresh-scheduler.js';
import { getPoolStats } from '../../infrastructure/database/connection.js';

const router = Router();

/**
 * GET /api/cache/stats
 * Statistiques du cache discovery
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await getCacheStats();
  const poolStats = getPoolStats();
  
  res.json({
    success: true,
    cache: stats,
    database: poolStats
  });
}));

/**
 * POST /api/cache/refresh/:provider
 * Force le refresh d'un provider
 * 
 * Exemples :
 * - POST /api/cache/refresh/tmdb
 * - POST /api/cache/refresh/jikan
 */
router.post('/refresh/:provider', asyncHandler(async (req, res) => {
  const { provider } = req.params;
  
  const result = await forceRefresh(provider);
  
  res.json({
    success: true,
    provider,
    ...result
  });
}));

/**
 * POST /api/cache/refresh
 * Force le refresh des entrées expirées
 * 
 * Query params :
 * - batchSize : Nombre d'entrées à rafraîchir (défaut 10)
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const batchSize = parseInt(req.query.batchSize) || 10;
  
  const result = await forceRefreshExpired(batchSize);
  
  res.json({
    success: true,
    ...result
  });
}));

/**
 * DELETE /api/cache/clear
 * Vide tout le cache (DANGER)
 */
router.delete('/clear', asyncHandler(async (req, res) => {
  const deleted = await clearAllCache();
  
  res.json({
    success: true,
    deleted,
    message: 'Cache cleared'
  });
}));

export default router;
