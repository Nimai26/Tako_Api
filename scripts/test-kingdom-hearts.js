/**
 * Test spécifique pour Kingdom Hearts avec RAWG
 * 
 * Usage: node scripts/test-kingdom-hearts.js
 */

import dotenv from 'dotenv';
dotenv.config();

import * as rawgProvider from '../src/domains/videogames/providers/rawg.provider.js';
import { normalizeGame as normalizeRawgGame } from '../src/domains/videogames/normalizers/rawg.normalizer.js';

async function testKingdomHeartsSearch() {
  console.log('\n========================================');
  console.log('TEST RAWG - Recherche Kingdom Hearts');
  console.log('========================================\n');
  
  try {
    const searchResults = await rawgProvider.search('Kingdom Hearts', { pageSize: 10 });
    
    console.log(`Résultats trouvés: ${searchResults.results?.length || 0}`);
    
    if (searchResults.results && searchResults.results.length > 0) {
      console.log('\n--- PREMIERS RÉSULTATS ---');
      searchResults.results.slice(0, 5).forEach((game, index) => {
        console.log(`${index + 1}. ${game.name} (ID: ${game.id}, Slug: ${game.slug})`);
      });
      
      // Tester le premier résultat
      const firstGame = searchResults.results[0];
      console.log(`\n--- TEST DÉTAILLÉ: ${firstGame.name} ---`);
      return firstGame.slug || firstGame.id;
    }
  } catch (error) {
    console.error('❌ Erreur recherche:', error.message);
    return null;
  }
}

async function testKingdomHeartsDetails(identifier) {
  console.log('\n========================================');
  console.log(`TEST RAWG - Détails Kingdom Hearts (${identifier})`);
  console.log('========================================\n');
  
  try {
    const rawGame = await rawgProvider.getGame(identifier);
    
    console.log('--- DONNÉES BRUTES API ---');
    console.log('ID:', rawGame.id);
    console.log('Name:', rawGame.name);
    console.log('Slug:', rawGame.slug);
    console.log('Released:', rawGame.released);
    console.log('\nDevelopers (brut):', JSON.stringify(rawGame.developers, null, 2));
    console.log('Publishers (brut):', JSON.stringify(rawGame.publishers, null, 2));
    
    console.log('\n--- NORMALISATION TAKO API ---');
    const normalized = normalizeRawgGame(rawGame);
    
    console.log('Developers (normalisé):', JSON.stringify(normalized.developers, null, 2));
    console.log('Publishers (normalisé):', JSON.stringify(normalized.publishers, null, 2));
    
    console.log('\n--- VALIDATION ---');
    
    // Vérification developers
    if (!rawGame.developers || rawGame.developers.length === 0) {
      console.log('⚠️  API RAWG: Aucun developer dans la réponse brute!');
    } else {
      console.log(`✅ API RAWG: ${rawGame.developers.length} developer(s) présent(s)`);
    }
    
    if (!normalized.developers || normalized.developers.length === 0) {
      console.log('❌ NORMALISATION: Aucun developer après normalisation!');
    } else {
      console.log(`✅ NORMALISATION: ${normalized.developers.length} developer(s) après normalisation`);
    }
    
    // Vérification publishers
    if (!rawGame.publishers || rawGame.publishers.length === 0) {
      console.log('⚠️  API RAWG: Aucun publisher dans la réponse brute!');
    } else {
      console.log(`✅ API RAWG: ${rawGame.publishers.length} publisher(s) présent(s)`);
    }
    
    if (!normalized.publishers || normalized.publishers.length === 0) {
      console.log('❌ NORMALISATION: Aucun publisher après normalisation!');
    } else {
      console.log(`✅ NORMALISATION: ${normalized.publishers.length} publisher(s) après normalisation`);
    }
    
    // Résumé
    console.log('\n--- RÉSUMÉ ---');
    const devOk = normalized.developers && normalized.developers.length > 0;
    const pubOk = normalized.publishers && normalized.publishers.length > 0;
    
    if (devOk && pubOk) {
      console.log('✅ Developers et Publishers sont présents et correctement normalisés');
    } else {
      console.log('❌ PROBLÈME CONFIRMÉ:');
      if (!devOk) console.log('  - Developers manquants');
      if (!pubOk) console.log('  - Publishers manquants');
    }
    
    return rawGame;
    
  } catch (error) {
    console.error('❌ Erreur récupération détails:', error.message);
    console.error(error.stack);
    return null;
  }
}

async function testMultipleKingdomHearts() {
  console.log('\n========================================');
  console.log('TEST RAWG - Plusieurs Kingdom Hearts');
  console.log('========================================\n');
  
  const testGames = [
    'kingdom-hearts',
    'kingdom-hearts-hd-i5-plus-ii5-remix',
    'kingdom-hearts-ii',
    'kingdom-hearts-iii'
  ];
  
  for (const slug of testGames) {
    try {
      console.log(`\n--- ${slug} ---`);
      const rawGame = await rawgProvider.getGame(slug);
      console.log(`Name: ${rawGame.name}`);
      console.log(`Developers: ${rawGame.developers?.map(d => d.name).join(', ') || 'AUCUN'}`);
      console.log(`Publishers: ${rawGame.publishers?.map(p => p.name).join(', ') || 'AUCUN'}`);
      
      if ((!rawGame.developers || rawGame.developers.length === 0) || 
          (!rawGame.publishers || rawGame.publishers.length === 0)) {
        console.log('⚠️  Données manquantes pour ce jeu!');
      }
      
    } catch (error) {
      console.log(`❌ Erreur: ${error.message}`);
    }
  }
}

async function run() {
  console.log('='.repeat(60));
  console.log('TEST KINGDOM HEARTS - RAWG PROVIDER');
  console.log('Vérification spécifique du problème signalé');
  console.log('='.repeat(60));
  
  // 1. Recherche du jeu
  const identifier = await testKingdomHeartsSearch();
  
  if (identifier) {
    // 2. Test détaillé
    await testKingdomHeartsDetails(identifier);
  }
  
  // 3. Test de plusieurs versions
  await testMultipleKingdomHearts();
  
  console.log('\n' + '='.repeat(60));
  console.log('TESTS TERMINÉS');
  console.log('='.repeat(60) + '\n');
}

run().catch(console.error);
