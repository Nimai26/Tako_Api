/**
 * Infrastructure - MEGA Archive Index
 * 
 * Point d'entrée pour l'infrastructure MEGA :
 * - PostgreSQL (catalogue de produits)
 * - Stockage fichiers (filesystem local via express.static)
 */

export {
  initMegaDatabase,
  closeMegaDatabase,
  isMegaConnected,
  megaQuery,
  megaQueryOne,
  megaQueryAll
} from './mega-database.js';

// Réexporter le stockage fichiers pour rétrocompatibilité
export {
  isStorageReady as isMegaMinIOConnected,
  getFileUrl,
  fileExists,
  getAbsolutePath,
  getArchiveStats as getBucketStats
} from '../storage/index.js';

/**
 * Initialise toute l'infrastructure MEGA
 */
export async function initMegaInfrastructure() {
  const { initMegaDatabase } = await import('./mega-database.js');
  const { initStorage } = await import('../storage/index.js');

  const dbOk = await initMegaDatabase();
  const storageOk = initStorage();

  return { db: dbOk, storage: storageOk, minio: storageOk };
}
