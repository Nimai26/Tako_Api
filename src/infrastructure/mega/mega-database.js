/**
 * Infrastructure - MEGA Archive Database
 * 
 * Pool PostgreSQL dédié à la base de données MEGA Construx.
 * Séparé du cache Tako (autre serveur, autre base).
 * 
 * Serveur : Louis (10.20.0.10:5434)
 * Base    : mega_archive
 * Table   : products (199 produits archivés)
 */

import pg from 'pg';
import { env } from '../../config/env.js';
import { logger } from '../../shared/utils/logger.js';

const { Pool } = pg;
const log = logger.create('MegaDB');

let pool = null;
let isConnected = false;

/**
 * Initialise la connexion au pool MEGA
 */
export async function initMegaDatabase() {
  const megaConfig = env.mega?.db;

  if (!megaConfig?.host || !megaConfig?.password) {
    log.warn('⚠️ MEGA DB non configuré (MEGA_DB_HOST / MEGA_DB_PASSWORD manquants)');
    return false;
  }

  try {
    pool = new Pool({
      host: megaConfig.host,
      port: megaConfig.port || 5434,
      database: megaConfig.name || 'mega_archive',
      user: megaConfig.user || 'megauser',
      password: megaConfig.password,
      // Pool léger (lecture seule, peu de requêtes)
      min: 1,
      max: 5,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 10000
    });

    pool.on('error', (err) => {
      log.error(`Erreur pool MEGA: ${err.message}`);
      isConnected = false;
    });

    // Test de connexion
    const client = await pool.connect();
    const result = await client.query('SELECT COUNT(*) as count FROM products');
    client.release();

    isConnected = true;
    log.info(`✅ MEGA DB connecté (${result.rows[0].count} produits)`);
    log.info(`   Host: ${megaConfig.host}:${megaConfig.port}`);

    return true;
  } catch (err) {
    log.error(`❌ MEGA DB connexion échouée: ${err.message}`);
    isConnected = false;
    return false;
  }
}

/**
 * Ferme le pool MEGA
 */
export async function closeMegaDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
    log.info('MEGA DB connexion fermée');
  }
}

/**
 * Vérifie si la DB MEGA est connectée
 */
export function isMegaConnected() {
  return isConnected;
}

/**
 * Exécute une requête SQL sur la DB MEGA
 */
export async function megaQuery(sql, params = []) {
  if (!pool || !isConnected) {
    throw new Error('MEGA Database non connectée');
  }
  return pool.query(sql, params);
}

/**
 * Retourne une seule ligne
 */
export async function megaQueryOne(sql, params = []) {
  const result = await megaQuery(sql, params);
  return result.rows[0] || null;
}

/**
 * Retourne toutes les lignes
 */
export async function megaQueryAll(sql, params = []) {
  const result = await megaQuery(sql, params);
  return result.rows;
}
