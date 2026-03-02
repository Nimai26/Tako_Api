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

    // Auto-migration : créer les tables si elles n'existent pas
    await runMigrations();

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

/**
 * Auto-migration : vérifie et crée les tables/index/fonctions manquantes
 * Utilise IF NOT EXISTS / CREATE OR REPLACE pour être idempotent
 */
async function runMigrations() {
  try {
    // Lister les tables existantes
    const tablesResult = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const existingTables = new Set(tablesResult.rows.map(r => r.table_name));

    let created = [];

    // ── 1. Table discovery_cache (système de cache) ──────────────────────
    if (!existingTables.has('discovery_cache')) {
      log.info('🔄 Migration: création de discovery_cache...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS discovery_cache (
          id SERIAL PRIMARY KEY,
          cache_key VARCHAR(255) UNIQUE NOT NULL,
          provider VARCHAR(50) NOT NULL,
          endpoint VARCHAR(50) NOT NULL,
          category VARCHAR(50),
          period VARCHAR(20),
          data JSONB NOT NULL,
          total_results INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP NOT NULL,
          last_accessed TIMESTAMP DEFAULT NOW(),
          fetch_count INTEGER DEFAULT 0,
          refresh_count INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_cache_key ON discovery_cache(cache_key);
        CREATE INDEX IF NOT EXISTS idx_provider_endpoint ON discovery_cache(provider, endpoint);
        CREATE INDEX IF NOT EXISTS idx_expires_at ON discovery_cache(expires_at);
        CREATE INDEX IF NOT EXISTS idx_last_accessed ON discovery_cache(last_accessed);
      `);
      created.push('discovery_cache');
    }

    // ── 2. Table products (MEGA Construx archive) ────────────────────────
    if (!existingTables.has('products')) {
      log.info('🔄 Migration: création de products...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          sku VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          pdf_url TEXT,
          image_url TEXT,
          pdf_path VARCHAR(500),
          image_path VARCHAR(500),
          discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_category CHECK (category IN (
            'halo', 'pokemon', 'hot-wheels', 'barbie',
            'masters-of-universe', 'masters-of-the-universe', 'other'
          ))
        );
        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
        CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
      `);
      created.push('products');
    }

    // ── 3. Table kreo_products (KRE-O archive) ──────────────────────────
    if (!existingTables.has('kreo_products')) {
      log.info('🔄 Migration: création de kreo_products...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS kreo_products (
          id SERIAL PRIMARY KEY,
          set_number VARCHAR(20) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          franchise VARCHAR(50) NOT NULL,
          sub_line VARCHAR(100),
          year SMALLINT,
          piece_count INTEGER,
          kreons_count INTEGER,
          kreons_included TEXT,
          description TEXT,
          price_retail NUMERIC(8,2),
          product_type VARCHAR(50) DEFAULT 'building_set',
          image_url TEXT,
          image_path VARCHAR(255),
          pdf_url TEXT,
          pdf_path VARCHAR(255),
          wiki_url TEXT,
          wiki_image_url TEXT,
          discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_kreo_franchise ON kreo_products(franchise);
        CREATE INDEX IF NOT EXISTS idx_kreo_product_type ON kreo_products(product_type);
        CREATE INDEX IF NOT EXISTS idx_kreo_sub_line ON kreo_products(sub_line);
        CREATE INDEX IF NOT EXISTS idx_kreo_year ON kreo_products(year);
      `);
      created.push('kreo_products');
    }

    // ── 4. Fonctions PL/pgSQL utilitaires ────────────────────────────────
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_last_accessed()
      RETURNS TRIGGER AS $t$
      BEGIN
        NEW.last_accessed = NOW();
        RETURN NEW;
      END;
      $t$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION purge_old_cache_entries(days_threshold INTEGER DEFAULT 90)
      RETURNS INTEGER AS $t$
      DECLARE
        deleted_count INTEGER;
      BEGIN
        DELETE FROM discovery_cache 
        WHERE last_accessed < NOW() - INTERVAL '1 day' * days_threshold;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
      END;
      $t$ LANGUAGE plpgsql;
    `);

    if (created.length > 0) {
      log.info(`✅ Auto-migration terminée (tables créées: ${created.join(', ')})`);
    } else {
      log.debug('Schema OK (toutes les tables existent)');
    }
  } catch (err) {
    log.error(`❌ Auto-migration échouée: ${err.message}`);
    // Non bloquant : le serveur continuera en mode dégradé
  }
}
