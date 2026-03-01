/**
 * Infrastructure - MEGA Archive Index
 * 
 * Point d'entrée pour l'infrastructure MEGA :
 * - PostgreSQL (catalogue de produits)
 * - MinIO (PDFs d'instructions + images)
 */

export {
  initMegaDatabase,
  closeMegaDatabase,
  isMegaConnected,
  megaQuery,
  megaQueryOne,
  megaQueryAll
} from './mega-database.js';

export {
  initMegaMinIO,
  isMegaMinIOConnected,
  getPresignedUrl,
  getProductUrls,
  getObjectStream,
  listCategoryFiles,
  getBucketStats
} from './mega-minio.js';

/**
 * Initialise toute l'infrastructure MEGA
 */
export async function initMegaInfrastructure() {
  const [dbOk, minioOk] = await Promise.all([
    (await import('./mega-database.js')).initMegaDatabase(),
    (await import('./mega-minio.js')).initMegaMinIO()
  ]);

  return { db: dbOk, minio: minioOk };
}
