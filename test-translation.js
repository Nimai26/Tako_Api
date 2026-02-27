/**
 * Test translation functionality
 */

import { translateText } from './src/shared/utils/translator.js';

async function testTranslation() {
  console.log('=== TEST TRANSLATION ===\n');
  
  const testCases = [
    {
      text: "Harry Potter and the Philosopher's Stone",
      lang: 'fr',
      options: { enabled: true, sourceLang: 'en' }
    },
    {
      text: "The Lord of the Rings",
      lang: 'fr',
      options: { enabled: true, sourceLang: 'en' }
    },
    {
      text: "A Song of Ice and Fire",
      lang: 'fr',
      options: { enabled: true, sourceLang: 'en' }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\nTest: "${testCase.text}"`);
    console.log(`Options: enabled=${testCase.options.enabled}, sourceLang=${testCase.options.sourceLang}, destLang=${testCase.lang}`);
    
    try {
      const result = await translateText(testCase.text, testCase.lang, testCase.options);
      console.log(`Résultat: translated=${result.translated}`);
      if (result.translated) {
        console.log(`  Original: ${testCase.text}`);
        console.log(`  Traduit:  ${result.text}`);
        console.log(`  De: ${result.from} -> Vers: ${result.to}`);
      } else {
        console.log(`  Pas traduit: ${result.text}`);
      }
    } catch (err) {
      console.error(`  ERREUR: ${err.message}`);
    }
  }
  
  console.log('\n=== FIN TESTS ===');
}

testTranslation().catch(console.error);
