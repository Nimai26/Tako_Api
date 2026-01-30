/**
 * Tako API - Point d'entrée serveur
 * 
 * Gère le démarrage du serveur et le graceful shutdown
 */

import { app } from './app.js';
import { config } from './config/index.js';
import { logger } from './shared/utils/logger.js';
import { initDatabase, closeDatabase } from './infrastructure/database/index.js';

const log = logger.create('Server');

/**
 * Démarre le serveur
 */
async function start() {
  log.info('=========================================');
  log.info(`🐙 Tako API v${config.env.version}`);
  log.info('=========================================');
  
  // Initialiser la base de données si activée
  if (config.cache.enabled) {
    try {
      await initDatabase();
      log.info('✅ Database cache initialisé');
    } catch (err) {
      log.error('⚠️  Erreur initialisation database', { error: err.message });
      log.warn('   Le serveur continuera sans cache persistant');
    }
  }
  
  // Démarrer le serveur HTTP
  const server = app.listen(config.env.port, '0.0.0.0', () => {
    log.info(`🚀 Server running at http://0.0.0.0:${config.env.port}`);
    log.info(`   Environment: ${config.env.nodeEnv}`);
    log.info(`   Locale: ${config.env.defaultLocale}`);
  });
  
  // Graceful shutdown
  const shutdown = async (signal) => {
    log.warn(`${signal} reçu. Arrêt gracieux...`);
    
    // Fermer la connexion DB
    if (config.cache.enabled) {
      try {
        await closeDatabase();
        log.info('✅ Database fermée');
      } catch (err) {
        log.error('Erreur fermeture database', { error: err.message });
      }
    }
    
    // Fermer le serveur HTTP
    server.close(() => {
      log.info('✅ Serveur HTTP fermé');
      process.exit(0);
    });
    
    // Forcer après 10s
    setTimeout(() => {
      log.error('⚠️  Forçage de l\'arrêt après timeout');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Lancer le serveur
start().catch(err => {
  console.error('❌ Erreur fatale au démarrage:', err);
  process.exit(1);
});
