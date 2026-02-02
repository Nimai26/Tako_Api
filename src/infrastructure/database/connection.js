/**
 * Infrastructure - Database Connection
 * Gestion de la connexion PostgreSQL
 */

import pg from 'pg';
import { config } from '../../config/index.js';
import { logger } from '../../shared/utils/logger.js';

const { Pool } = pg;
const log = logger.create('Database');

// Pool de connexions (singleton)
let pool = null;
let isConnected = false;

/**
 * Initialise la connexion à la base de données
 */
export async function initDatabase() {
  if (!config.cache.enabled) {
    log.info('📦 Database cache désactivé (DB_ENABLED=false)');
    return false;
  }

  if (!config.cache.database.password) {
    log.warn('⚠️ DB_PASSWORD non défini - Cache désactivé');
    return false;
  }

  try {
    const dbConfig = {
      host: config.cache.database.host,
      port: config.cache.database.port,
      database: config.cache.database.name,
      user: config.cache.database.user,
      password: config.cache.database.password,
      
      // Pool configuration
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    };

    if (config.cache.database.ssl) {
      dbConfig.ssl = { rejectUnauthorized: false };
    }

    pool = new Pool(dbConfig);

    // Gestion des erreurs du pool
    pool.on('error', (err) => {
      log.error(`Erreur pool PostgreSQL: ${err.message}`);
      isConnected = false;
    });

    pool.on('connect', () => {
      log.debug('Nouvelle connexion au pool');
    });

    // Test de connexion
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now, version() as version');
    client.release();

    isConnected = true;
    
    const pgVersion = result.rows[0].version.split(' ')[1];
    log.info(`✅ PostgreSQL connecté (v${pgVersion})`);
    log.info(`   Host: ${dbConfig.host}:${dbConfig.port}`);
    log.info(`   Database: ${dbConfig.database}`);
    log.info(`   Pool: 2-10 connexions`);

    return true;
  } catch (err) {
    log.error(`❌ Connexion PostgreSQL échouée: ${err.message}`);
    log.warn('   Cache will be disabled');
    isConnected = false;
    return false;
  }
}

/**
 * Ferme la connexion à la base de données
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
    log.info('Database connection closed');
  }
}

/**
 * Retourne si la DB est connectée
 */
export function getIsConnected() {
  return isConnected;
}

/**
 * Exécute une requête SQL
 */
export async function query(sql, params = []) {
  if (!pool || !isConnected) {
    throw new Error('Database not connected');
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
 * Exécute une requête et retourne toutes les lignes
 */
export async function queryAll(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Retourne les stats du pool de connexions
 */
export function getPoolStats() {
  if (!pool) {
    return { connected: false };
  }
  
  return {
    connected: isConnected,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
}
