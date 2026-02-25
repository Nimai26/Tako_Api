/**
 * Test de traduction pour Kingdom Hearts avec RAWG
 * Vérifie que les paramètres autoTrad et lang fonctionnent correctement
 * 
 * Usage: node scripts/test-kingdom-hearts-french.js
 */

import dotenv from 'dotenv';
dotenv.config();

import * as rawgProvider from '../src/domains/videogames/providers/rawg.provider.js';
import { normalizeGame as normalizeRawgGame } from '../src/domains/videogames/normalizers/rawg.normalizer.js';
import { translateText, extractLangCode } from '../src/shared/utils/translator.js';

async function testWithoutTranslation() {
  console.log('\n========================================');
  console.log('TEST 1: SANS TRADUCTION (par défaut)');
  console.log('========================================\n');
  
  try {
    const game = await rawgProvider.getGame('kingdom-hearts');
    const normalized = normalizeRawgGame(game);
    
    console.log('Title:', normalized.title);
    console.log('Description (début):', normalized.description?.substring(0, 100) + '...');
    console.log('Genres:', normalized.genres?.map(g => g.name).join(', '));
    console.log('Langue:', 'EN (anglais - par défaut)');
    
    return normalized;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

async function testWithTranslation() {
  console.log('\n========================================');
  console.log('TEST 2: AVEC TRADUCTION (autoTrad=true&lang=fr)');
  console.log('========================================\n');
  
  try {
    const game = await rawgProvider.getGame('kingdom-hearts');
    let normalized = normalizeRawgGame(game);
    
    // Simuler exactement ce que fait la route avec autoTrad et lang
    const autoTrad = true;
    const lang = 'fr';
    const targetLang = extractLangCode(lang);
    
    console.log('Target Lang extrait:', targetLang);
    
    if (autoTrad && targetLang) {
      // Traduire la description
      if (normalized.description && normalized.description.length > 20) {
        console.log('\nTraduction de la description...');
        const translated = await translateText(
          normalized.description,
          targetLang,
          { enabled: true, sourceLang: 'en' }
        );
        
        if (translated.translated) {
          normalized.description = translated.text;
          console.log('✅ Description traduite');
        }
      }
      
      // Note: Les genres ne sont pas traduits dans la route actuelle pour les détails
      // Seulement dans translateGameGenres() qui est utilisé pour la recherche
    }
    
    console.log('\nRésultat:');
    console.log('Title:', normalized.title);
    console.log('Description (début):', normalized.description?.substring(0, 150) + '...');
    console.log('Genres:', normalized.genres?.map(g => g.name).join(', '));
    
    return normalized;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

async function showCorrectURLs() {
  console.log('\n========================================');
  console.log('URLS CORRECTES POUR L\'APPLICATION EXTERNE');
  console.log('========================================\n');
  
  console.log('❌ INCORRECT (sans traduction):');
  console.log('   GET /api/videogames/rawg/game/kingdom-hearts');
  console.log('   → Retourne les données en anglais\n');
  
  console.log('✅ CORRECT (avec traduction française):');
  console.log('   GET /api/videogames/rawg/game/kingdom-hearts?autoTrad=true&lang=fr');
  console.log('   OU');
  console.log('   GET /api/videogames/rawg/game/kingdom-hearts?autoTrad=1&lang=fr-FR');
  console.log('   → Retourne les données traduites en français\n');
  
  console.log('📝 ParamètresQuery:');
  console.log('   - autoTrad: true, 1, "true", ou "1" (active la traduction)');
  console.log('   - lang: "fr", "fr-FR", "en", "en-US", etc.');
  console.log('');
  
  console.log('💡 Vous pouvez aussi utiliser le header Accept-Language:');
  console.log('   GET /api/videogames/rawg/game/kingdom-hearts?autoTrad=true');
  console.log('   Header: Accept-Language: fr-FR');
  console.log('');
}

async function testCurlExamples() {
  console.log('\n========================================');
  console.log('EXEMPLES CURL');
  console.log('========================================\n');
  
  const baseUrl = 'http://localhost:3000';
  
  console.log('1. Sans traduction (anglais par défaut):');
  console.log(`   curl "${baseUrl}/api/videogames/rawg/game/kingdom-hearts"`);
  console.log('');
  
  console.log('2. Avec traduction française:');
  console.log(`   curl "${baseUrl}/api/videogames/rawg/game/kingdom-hearts?autoTrad=true&lang=fr"`);
  console.log('');
  
  console.log('3. Avec Accept-Language header:');
  console.log(`   curl -H "Accept-Language: fr-FR" "${baseUrl}/api/videogames/rawg/game/kingdom-hearts?autoTrad=true"`);
  console.log('');
  
  console.log('4. Pour extraire seulement la description:');
  console.log(`   curl "${baseUrl}/api/videogames/rawg/game/kingdom-hearts?autoTrad=true&lang=fr" | jq '.data.description'`);
  console.log('');
}

async function run() {
  console.log('='.repeat(70));
  console.log('TEST TRADUCTION FRANÇAISE - RAWG PROVIDER');
  console.log('Kingdom Hearts - Comparaison avec/sans traduction');
  console.log('='.repeat(70));
  
  const withoutTrad = await testWithoutTranslation();
  const withTrad = await testWithTranslation();
  
  console.log('\n========================================');
  console.log('COMPARAISON');
  console.log('========================================\n');
  
  if (withoutTrad && withTrad) {
    console.log('Description EN:', withoutTrad.description?.substring(0, 80) + '...');
    console.log('Description FR:', withTrad.description?.substring(0, 80) + '...');
    
    const isSame = withoutTrad.description === withTrad.description;
    if (isSame) {
      console.log('\n⚠️  Les descriptions sont identiques!');
      console.log('    La traduction n\'est peut-être pas activée correctement.');
    } else {
      console.log('\n✅ Les descriptions sont différentes - traduction fonctionne!');
    }
  }
  
  await showCorrectURLs();
  await testCurlExamples();
  
  console.log('='.repeat(70));
  console.log('TESTS TERMINÉS');
  console.log('='.repeat(70));
  console.log('');
}

run().catch(console.error);
