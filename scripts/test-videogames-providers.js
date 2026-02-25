/**
 * Test des providers de jeux vidéo pour vérifier la présence de developers/publishers
 * 
 * Usage: node scripts/test-videogames-providers.js
 */

import dotenv from 'dotenv';
dotenv.config();

// Import des providers
import * as igdbProvider from '../src/domains/videogames/providers/igdb.provider.js';
import * as rawgProvider from '../src/domains/videogames/providers/rawg.provider.js';

// Import des normalizers
import { normalizeGame as normalizeIgdbGame } from '../src/domains/videogames/normalizers/igdb.normalizer.js';
import { normalizeGame as normalizeRawgGame } from '../src/domains/videogames/normalizers/rawg.normalizer.js';

// ============================================================================
// TESTS
// ============================================================================

async function testIGDB() {
  console.log('\n========================================');
  console.log('TEST IGDB - The Witcher 3');
  console.log('========================================\n');
  
  try {
    // Test avec The Witcher 3 (ID: 1942)
    const gameId = 1942;
    console.log(`Récupération du jeu ID ${gameId}...`);
    
    const rawGame = await igdbProvider.getGame(gameId);
    console.log('\n--- DONNÉES BRUTES (extrait) ---');
    console.log('ID:', rawGame.id);
    console.log('Name:', rawGame.name);
    console.log('Involved Companies:', JSON.stringify(rawGame.involved_companies, null, 2));
    
    console.log('\n--- NORMALISATION ---');
    const normalized = normalizeIgdbGame(rawGame);
    console.log('Developers:', normalized.developers);
    console.log('Publishers:', normalized.publishers);
    
    // Validation
    if (!normalized.developers || normalized.developers.length === 0) {
      console.log('\n⚠️  ALERTE: Aucun developer trouvé!');
    } else {
      console.log(`\n✅ ${normalized.developers.length} developer(s) trouvé(s)`);
    }
    
    if (!normalized.publishers || normalized.publishers.length === 0) {
      console.log('⚠️  ALERTE: Aucun publisher trouvé!');
    } else {
      console.log(`✅ ${normalized.publishers.length} publisher(s) trouvé(s)`);
    }
    
  } catch (error) {
    console.error('❌ Erreur IGDB:', error.message);
    console.error(error.stack);
  }
}

async function testRAWG() {
  console.log('\n========================================');
  console.log('TEST RAWG - The Witcher 3');
  console.log('========================================\n');
  
  try {
    // Test avec The Witcher 3 (slug: the-witcher-3-wild-hunt)
    const gameSlug = 'the-witcher-3-wild-hunt';
    console.log(`Récupération du jeu "${gameSlug}"...`);
    
    const rawGame = await rawgProvider.getGame(gameSlug);
    console.log('\n--- DONNÉES BRUTES (extrait) ---');
    console.log('ID:', rawGame.id);
    console.log('Name:', rawGame.name);
    console.log('Developers:', JSON.stringify(rawGame.developers, null, 2));
    console.log('Publishers:', JSON.stringify(rawGame.publishers, null, 2));
    
    console.log('\n--- NORMALISATION ---');
    const normalized = normalizeRawgGame(rawGame);
    console.log('Developers:', JSON.stringify(normalized.developers, null, 2));
    console.log('Publishers:', JSON.stringify(normalized.publishers, null, 2));
    
    // Validation
    if (!normalized.developers || normalized.developers.length === 0) {
      console.log('\n⚠️  ALERTE: Aucun developer trouvé!');
    } else {
      console.log(`\n✅ ${normalized.developers.length} developer(s) trouvé(s)`);
    }
    
    if (!normalized.publishers || normalized.publishers.length === 0) {
      console.log('⚠️  ALERTE: Aucun publisher trouvé!');
    } else {
      console.log(`✅ ${normalized.publishers.length} publisher(s) trouvé(s)`);
    }
    
  } catch (error) {
    console.error('❌ Erreur RAWG:', error.message);
    console.error(error.stack);
  }
}

async function testWithDifferentGame() {
  console.log('\n========================================');
  console.log('TEST IGDB - Elden Ring');
  console.log('========================================\n');
  
  try {
    // Test avec Elden Ring (ID: 119171)
    const gameId = 119171;
    console.log(`Récupération du jeu ID ${gameId}...`);
    
    const rawGame = await igdbProvider.getGame(gameId);
    console.log('\n--- DONNÉES BRUTES (extrait) ---');
    console.log('ID:', rawGame.id);
    console.log('Name:', rawGame.name);
    console.log('Involved Companies (count):', rawGame.involved_companies?.length || 0);
    
    const normalized = normalizeIgdbGame(rawGame);
    console.log('\n--- NORMALISATION ---');
    console.log('Developers:', normalized.developers);
    console.log('Publishers:', normalized.publishers);
    
    // Validation
    console.log('\nRésultat:');
    console.log(`- Developers: ${normalized.developers?.length || 0} trouvé(s)`);
    console.log(`- Publishers: ${normalized.publishers?.length || 0} trouvé(s)`);
    
  } catch (error) {
    console.error('❌ Erreur IGDB:', error.message);
  }
}

async function testRAWGWithDifferentGame() {
  console.log('\n========================================');
  console.log('TEST RAWG - Elden Ring');
  console.log('========================================\n');
  
  try {
    const gameSlug = 'elden-ring';
    console.log(`Récupération du jeu "${gameSlug}"...`);
    
    const rawGame = await rawgProvider.getGame(gameSlug);
    console.log('\n--- DONNÉES BRUTES (extrait) ---');
    console.log('ID:', rawGame.id);
    console.log('Name:', rawGame.name);
    console.log('Developers (count):', rawGame.developers?.length || 0);
    console.log('Publishers (count):', rawGame.publishers?.length || 0);
    
    const normalized = normalizeRawgGame(rawGame);
    console.log('\n--- NORMALISATION ---');
    console.log('Developers:', normalized.developers?.map(d => d.name));
    console.log('Publishers:', normalized.publishers?.map(p => p.name));
    
    // Validation
    console.log('\nRésultat:');
    console.log(`- Developers: ${normalized.developers?.length || 0} trouvé(s)`);
    console.log(`- Publishers: ${normalized.publishers?.length || 0} trouvé(s)`);
    
  } catch (error) {
    console.error('❌ Erreur RAWG:', error.message);
  }
}

// ============================================================================
// EXÉCUTION
// ============================================================================

async function run() {
  console.log('='.repeat(60));
  console.log('TEST DES PROVIDERS DE JEUX VIDÉO');
  console.log('Vérification de la présence de developers/publishers');
  console.log('='.repeat(60));
  
  await testIGDB();
  await testRAWG();
  await testWithDifferentGame();
  await testRAWGWithDifferentGame();
  
  console.log('\n' + '='.repeat(60));
  console.log('TESTS TERMINÉS');
  console.log('='.repeat(60) + '\n');
}

run().catch(console.error);
