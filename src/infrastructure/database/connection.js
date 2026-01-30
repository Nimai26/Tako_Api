/**
 * Infrastructure - Database Connection
 * Gestion de la connexion PostgreSQL
 * 
 * TODO: Migrer depuis toys_api/lib/database/connection.js
 */

import { config } from '../../config/index.js';
import { logger } from '../../shared/utils/logger.js';

const log = logger.create('Database');

let pool = null;

/**
 * Initialise la connexion à la base de données
 */
export async function initDatabase() {
  if (!config.cache.enabled) {
    log.info('Database cache désactivé');
    return false;
  }
  
  // TODO: Implémenter la connexion PostgreSQL
  // Reprendre le code de toys_api/lib/database/connection.js
  
  log.warn('Database connection not implemented yet');
  return false;
}

/**
 * Ferme la connexion à la base de données
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    log.info('Database connection closed');
  }
}

/**
 * Exécute une requête SQL
 */
export async function query(sql, params = []) {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return pool.query(sql, params);
}

/**
 * Exécute une requête et retourne une seule ligne
 */
export async function queryOne(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0] || null;
}

/**
 * Retourne les stats du pool de connexions
 */
export function getPoolStats() {
  if (!pool) {
    return { connected: false };
  }
  
  return {
    connected: true,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
}
