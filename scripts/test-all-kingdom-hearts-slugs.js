/**
 * Test complet de tous les slugs Kingdom Hearts dans RAWG
 * Pour identifier lequel pose problème
 */

import dotenv from 'dotenv';
dotenv.config();

import * as rawgProvider from '../src/domains/videogames/providers/rawg.provider.js';

const possibleSlugs = [
  'kingdom-hearts',
  'kingdom-hearts-2',
  'kingdom-hearts-ii',
  'kingdom-hearts-iii',
  'kingdom-hearts-3',
  'kingdom-hearts-chain-of-memories',
  'kingdom-hearts-recoded',
  'kingdom-hearts-birth-by-sleep',
  'kingdom-hearts-hd-15-remix',
  'kingdom-hearts-hd-25-remix',
  'kingdom-hearts-hd-i5-plus-ii5-remix'
];

async function testSlug(slug) {
  try {
    const game = await rawgProvider.getGame(slug);
    const hasDevs = game.developers && game.developers.length > 0;
    const hasPubs = game.publishers && game.publishers.length > 0;
    
    const status = hasDevs && hasPubs ? '✅' : '⚠️ ';
    
    console.log(`${status} ${slug}`);
    console.log(`   Name: ${game.name || 'undefined'}`);
    console.log(`   Devs: ${hasDevs ? game.developers.map(d => d.name).join(', ') : 'AUCUN'}`);
    console.log(`   Pubs: ${hasPubs ? game.publishers.map(p => p.name).join(', ') : 'AUCUN'}`);
    
    return { slug, found: true, hasData: hasDevs && hasPubs, game };
  } catch (error) {
    if (error.message.includes('404')) {
      console.log(`❌ ${slug} - Non trouvé (404)`);
      return { slug, found: false };
    }
    console.log(`❌ ${slug} - Erreur: ${error.message}`);
    return { slug, found: false, error: error.message };
  }
}

async function run() {
  console.log('='.repeat(70));
  console.log('TEST EXHAUSTIF - KINGDOM HEARTS SLUGS RAWG');
  console.log('='.repeat(70));
  console.log('');
  
  const results = [];
  
  for (const slug of possibleSlugs) {
    const result = await testSlug(slug);
    results.push(result);
    console.log('');
  }
  
  console.log('='.repeat(70));
  console.log('RÉSUMÉ');
  console.log('='.repeat(70));
  console.log('');
  
  const found = results.filter(r => r.found);
  const complete = results.filter(r => r.found && r.hasData);
  const incomplete = results.filter(r => r.found && !r.hasData);
  
  console.log(`Total slugs testés: ${possibleSlugs.length}`);
  console.log(`Jeux trouvés: ${found.length}`);
  console.log(`Avec developers/publishers: ${complete.length}`);
  console.log(`Sans developers/publishers: ${incomplete.length}`);
  
  if (incomplete.length > 0) {
    console.log('');
    console.log('⚠️  JEUX SANS DONNÉES:');
    incomplete.forEach(r => {
      console.log(`   - ${r.slug} (${r.game?.name || 'inconnu'})`);
    });
  }
  
  console.log('');
  console.log('='.repeat(70));
}

run().catch(console.error);
