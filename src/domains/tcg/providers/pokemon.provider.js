/**
 * Provider Pokémon TCG
 * API: https://pokemontcg.io/
 * Documentation: https://docs.pokemontcg.io/
 * 
 * API Key: TCG_POKEMON_TOKEN (optionnel, augmente rate limit)
 * Rate Limit: 1000/jour sans clé, 5000/jour avec clé
 */

import { logger } from '../../../shared/utils/logger.js';

const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.TCG_POKEMON_TOKEN || null;

/**
 * Recherche de cartes Pokémon TCG
 * @param {string} query - Nom de la carte à rechercher
 * @param {object} options - Options de recherche
 * @param {string} options.lang - Code langue (fr, en, de, etc.)
 * @param {number} options.max - Nombre max de résultats (défaut: 20)
 * @param {number} options.page - Page de résultats (défaut: 1)
 * @param {string} options.set - Filtrer par set ID (ex: base1, jungle)
 * @param {string} options.type - Filtrer par type (ex: Fire, Water, Grass)
 * @param {string} options.rarity - Filtrer par rareté (ex: Common, Rare, Ultra Rare)
 * @param {string} options.supertype - Filtrer par supertype (Pokemon, Trainer, Energy)
 * @param {string} options.subtype - Filtrer par subtype (ex: EX, GX, VMAX)
 * @returns {Promise<object>} - Résultats bruts de l'API
 */
export async function searchPokemonCards(query, options = {}) {
  const {
    lang = 'en',
    max = 20,
    page = 1,
    set = null,
    type = null,
    rarity = null,
    supertype = null,
    subtype = null
  } = options;

  // Construire la query avec syntaxe Lucene
  const queryParts = [`name:${query}*`];
  if (set) queryParts.push(`set.id:${set}`);
  if (type) queryParts.push(`types:${type}`);
  if (rarity) queryParts.push(`rarity:"${rarity}"`);
  if (supertype) queryParts.push(`supertype:${supertype}`);
  if (subtype) queryParts.push(`subtypes:${subtype}`);

  const searchQuery = queryParts.join(' ');
  const url = `${POKEMON_TCG_API}/cards?q=${encodeURIComponent(searchQuery)}&page=${page}&pageSize=${max}`;

  // Headers avec API key si disponible
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Tako_Api/1.0'
  };

  if (API_KEY) {
    headers['X-Api-Key'] = API_KEY;
  }

  try {
    logger.info(`[Pokemon TCG] Recherche: ${query} (page ${page}, max ${max})`);
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Pokemon TCG API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    logger.info(`[Pokemon TCG] Trouvé ${data.data?.length || 0} résultats pour: ${query}`);
    
    return {
      results: data.data || [],
      total: data.totalCount || 0,
      page: data.page || page,
      pageSize: data.pageSize || max,
      count: data.count || (data.data?.length || 0)
    };
  } catch (error) {
    logger.error(`[Pokemon TCG] Erreur recherche: ${error.message}`);
    throw error;
  }
}

/**
 * Détails d'une carte Pokémon TCG
 * @param {string} cardId - ID unique de la carte (ex: base1-4, swsh1-25)
 * @returns {Promise<object>} - Données complètes de la carte
 */
export async function getPokemonCardDetails(cardId) {
  const url = `${POKEMON_TCG_API}/cards/${cardId}`;
  
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Tako_Api/1.0'
  };

  if (API_KEY) {
    headers['X-Api-Key'] = API_KEY;
  }

  try {
    logger.info(`[Pokemon TCG] Récupération carte: ${cardId}`);
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Pokemon TCG API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    logger.info(`[Pokemon TCG] Carte récupérée: ${data.data?.name || cardId}`);
    
    return data.data;
  } catch (error) {
    logger.error(`[Pokemon TCG] Erreur détails carte: ${error.message}`);
    throw error;
  }
}

/**
 * Liste des sets Pokémon TCG
 * @param {object} options - Options de filtrage
 * @param {string} options.series - Filtrer par série (ex: Sword & Shield, Sun & Moon)
 * @param {number} options.year - Filtrer par année de sortie
 * @param {number} options.max - Nombre max de résultats
 * @returns {Promise<object>} - Liste des sets
 */
export async function getPokemonSets(options = {}) {
  const { 
    series = null, 
    year = null,
    max = 100
  } = options;

  let url = `${POKEMON_TCG_API}/sets`;
  
  // Filtres
  const params = [];
  if (series) params.push(`series:"${series}"`);
  if (year) params.push(`releaseDate:${year}*`);
  
  if (params.length > 0) {
    url += `?q=${encodeURIComponent(params.join(' '))}`;
  }
  
  url += `${params.length > 0 ? '&' : '?'}pageSize=${max}`;

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Tako_Api/1.0'
  };

  if (API_KEY) {
    headers['X-Api-Key'] = API_KEY;
  }

  try {
    logger.info(`[Pokemon TCG] Récupération sets (series: ${series || 'all'}, year: ${year || 'all'})`);
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Pokemon TCG API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    logger.info(`[Pokemon TCG] Trouvé ${data.data?.length || 0} sets`);
    
    return {
      results: data.data || [],
      total: data.totalCount || 0,
      count: data.count || (data.data?.length || 0)
    };
  } catch (error) {
    logger.error(`[Pokemon TCG] Erreur récupération sets: ${error.message}`);
    throw error;
  }
}

/**
 * Health check Pokemon TCG API
 * @returns {Promise<object>} - Statut de l'API
 */
export async function healthCheck() {
  try {
    const response = await fetch(`${POKEMON_TCG_API}/cards?pageSize=1`, {
      headers: API_KEY ? { 'X-Api-Key': API_KEY } : {}
    });
    
    return {
      healthy: response.ok,
      status: response.status,
      hasApiKey: !!API_KEY,
      message: response.ok ? 'API Pokemon TCG disponible' : `Erreur ${response.status}`
    };
  } catch (error) {
    logger.error(`[Pokemon TCG] Health check error: ${error.message}`);
    return {
      healthy: false,
      hasApiKey: !!API_KEY,
      message: error.message
    };
  }
}
