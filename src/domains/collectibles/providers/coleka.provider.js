/**
 * src/domains/collectibles/providers/coleka.provider.js - Provider Coleka
 * 
 * Site de référencement de figurines, LEGO, Funko Pop, et autres objets de collection
 * Nécessite FlareSolverr pour contourner la protection anti-bot
 * 
 * @module domains/collectibles/providers/coleka
 */

import FlareSolverrClient from '../../../infrastructure/scraping/FlareSolverrClient.js';
import { translateText, extractLangCode } from '../../../shared/utils/translator.js';
import { logger } from '../../../shared/utils/logger.js';

const COLEKA_BASE_URL = 'https://www.coleka.com';
const MAX_RETRIES = 3;
const DEFAULT_NBPP = 20;

let fsrClient = null;

/**
 * Récupère ou crée le client FlareSolverr
 * @returns {FlareSolverrClient}
 */
function getFsrClient() {
  if (!fsrClient) {
    fsrClient = new FlareSolverrClient();
  }
  return fsrClient;
}

/**
 * Déduplique les images Coleka en gardant la meilleure qualité
 * Les URLs thumbs.coleka.com sont des miniatures avec suffixes de dimensions (ex: _470x246)
 * Les URLs www.coleka.com sont les originaux en pleine qualité
 * @param {string[]} images - Liste des URLs d'images
 * @returns {string[]} - Liste dédupliquée avec la meilleure qualité
 */
function deduplicateColekaImages(images) {
  if (!images || images.length === 0) return [];
  
  // Map pour stocker: clé normalisée -> meilleure URL
  const imageMap = new Map();
  
  for (const url of images) {
    if (!url) continue;
    
    // Extraire le nom de base de l'image (sans domaine ni dimensions)
    let baseName = url
      .replace(/^https?:\/\/(?:thumbs\.|www\.)?coleka\.com\//, '')
      .replace(/_\d+x\d+/, '')  // Retirer les dimensions
      .replace(/\.[^.]+$/, ''); // Retirer l'extension
    
    const existing = imageMap.get(baseName);
    
    if (!existing) {
      imageMap.set(baseName, url);
    } else {
      // Privilégier www.coleka.com sur thumbs.coleka.com
      const existingIsThumbnail = existing.includes('thumbs.coleka.com');
      const newIsThumbnail = url.includes('thumbs.coleka.com');
      
      if (existingIsThumbnail && !newIsThumbnail) {
        imageMap.set(baseName, url);
      } else if (existingIsThumbnail === newIsThumbnail) {
        const existingHasDimensions = /_\d+x\d+/.test(existing);
        const newHasDimensions = /_\d+x\d+/.test(url);
        if (existingHasDimensions && !newHasDimensions) {
          imageMap.set(baseName, url);
        }
      }
    }
  }
  
  return Array.from(imageMap.values());
}

/**
 * Résout le challenge anti-bot Coleka
 * Le site demande de cliquer sur un bouton qui fait un POST à /verify/ajax.php
 * @param {string} lang - Langue (fr, en)
 * @returns {Promise<boolean>}
 */
async function solveColekaChallenge(lang = 'fr') {
  try {
    const client = getFsrClient();
    
    // L'URL correcte est /verify/ajax.php, pas /verify
    const verifyUrl = `${COLEKA_BASE_URL}/verify/ajax.php`;
    
    // Format du POST: lang=fr&token=timestamp
    const postData = `lang=${lang}&token=${Date.now()}`;
    
    logger.info('[Coleka] Résolution du challenge anti-bot...');
    
    // Faire la requête POST avec les headers appropriés
    const responseText = await client.post(verifyUrl, postData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${COLEKA_BASE_URL}/verify/?lang=${lang}`
      },
      maxTimeout: 60000,
      waitInSeconds: 2
    });
    
    logger.debug(`[Coleka] Réponse verify: ${responseText.substring(0, 200)}`);
    
    // Vérifier si la réponse contient success: true
    if (responseText.includes('"success"') && responseText.includes('true')) {
      logger.info('[Coleka] ✅ Challenge résolu avec succès!');
      return true;
    }
    
    // Essayer de parser la réponse JSON
    try {
      const json = JSON.parse(responseText);
      if (json.success) {
        logger.info('[Coleka] ✅ Challenge résolu avec succès!');
        return true;
      } else {
        logger.warn(`[Coleka] ❌ Challenge échoué: ${json.error || 'unknown'}`);
        return false;
      }
    } catch (e) {
      logger.debug('[Coleka] Réponse non-JSON, vérification par contenu...');
      // Si ce n'est pas du JSON, vérifier si on n'a pas d'erreur
      const success = !responseText.includes('error') && responseText.length > 0;
      if (success) {
        logger.info('[Coleka] ✅ Challenge résolu (réponse non-JSON valide)');
      }
      return success;
    }
  } catch (error) {
    logger.error(`[Coleka] Erreur résolution challenge: ${error.message}`);
    return false;
  }
}

/**
 * Recherche sur Coleka via scraping
 * @param {string} searchTerm - Terme de recherche
 * @param {Object} options - Options de recherche
 * @param {number} options.maxResults - Nombre max de résultats (défaut: 20)
 * @param {string} options.lang - Langue (fr, en)
 * @param {string} options.category - Filtre par catégorie (lego, funko, figurines, etc.)
 * @param {boolean} options.autoTrad - Activer traduction automatique
 * @returns {Promise<Object>} - Résultats de recherche
 */
export async function searchColeka(searchTerm, options = {}) {
  const {
    maxResults = DEFAULT_NBPP,
    lang = 'fr',
    category = null,
    autoTrad = false
  } = options;
  
  const destLang = extractLangCode(lang);
  const shouldTranslate = autoTrad && destLang && destLang !== 'fr';
  
  let attempt = 0;
  let lastError = null;
  const client = getFsrClient();
  
  while (attempt < MAX_RETRIES) {
    attempt++;
    
    try {
      logger.debug(`[Coleka] Tentative ${attempt}/${MAX_RETRIES} pour recherche: "${searchTerm}"`);
      
      // Étape 1: S'assurer qu'on a une session
      const homeUrl = `${COLEKA_BASE_URL}/${lang}`;
      await client.ensureSession(homeUrl);
      
      logger.debug('[Coleka] Étape 1: Visite de la page d\'accueil');
      const homeHtml = await client.get(homeUrl, { waitInSeconds: 1 });
      
      // Vérifier et résoudre le challenge si nécessaire
      if (homeHtml.includes('Simple vérification') || homeHtml.includes('Visiter COLEKA') || homeHtml.includes('verifyBtn')) {
        logger.debug('[Coleka] Étape 2: Challenge détecté, résolution...');
        const challengeSolved = await solveColekaChallenge(lang);
        if (!challengeSolved) {
          throw new Error('Protection anti-bot non contournée');
        }
        // Attendre 2 secondes pour que les cookies soient bien établis
        await new Promise(r => setTimeout(r, 2000));
      }
      
      // Étape 3: Page de recherche
      let searchUrl = `${COLEKA_BASE_URL}/${lang}/search?q=${encodeURIComponent(searchTerm)}&nbpp=${maxResults}`;
      
      // Ajouter le filtre de catégorie si spécifié
      if (category) {
        searchUrl += `&cat=${encodeURIComponent(category)}`;
      }
      
      logger.debug('[Coleka] Étape 3: Visite de la page de recherche');
      const html = await client.get(searchUrl, { waitInSeconds: 3 });
      
      if (html.includes('Simple vérification') || html.includes('Visiter COLEKA')) {
        throw new Error('Protection anti-bot non contournée');
      }
      
      const result = {
        query: searchTerm,
        products: [],
        total: 0,
        category: category,
        source: 'coleka'
      };
      
      // Parser les résultats - chercher les blocs produits avec images
      const productBlockPattern = /<a[^>]*href="(\/[a-z]{2}\/[^"]*_i\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
      const allBlocks = [...html.matchAll(productBlockPattern)];
      const seenUrls = new Set();
      
      // Créer une map des images par ID produit
      const imageMap = new Map();
      const imgPattern = /<img[^>]*(?:data-src|src)="([^"]*(?:coleka\.com|cloudfront)[^"]*)"[^>]*>/gi;
      for (const imgMatch of html.matchAll(imgPattern)) {
        const imgUrl = imgMatch[1];
        const idMatch = imgUrl.match(/_i(\d+)|\/(\d+)(?:_|\.)/);
        if (idMatch) {
          const productId = idMatch[1] || idMatch[2];
          if (!imageMap.has(productId)) {
            imageMap.set(productId, imgUrl.startsWith('http') ? imgUrl : 'https:' + imgUrl);
          }
        }
      }
      
      for (const match of allBlocks) {
        const url = match[1];
        const content = match[2];
        
        // Filtrer les liens non pertinents
        if (url.includes('/search') || url.includes('/user') || url.includes('/market') ||
            url.includes('/verify') || url.includes('#') ||
            url.match(/^\/[a-z]{2}\/?$/) || url.match(/^\/[a-z]{2}\/[^\/]+\/?$/)) {
          continue;
        }
        
        const segments = url.split('/').filter(s => s.length > 0);
        if (segments.length < 3) continue;
        
        const fullUrl = COLEKA_BASE_URL + url;
        if (seenUrls.has(fullUrl)) continue;
        seenUrls.add(fullUrl);
        
        // Extraire l'ID produit depuis l'URL (format: nom_i123456)
        const productIdMatch = url.match(/_i(\d+)$/);
        const productId = productIdMatch ? productIdMatch[1] : null;
        
        // Chercher l'image
        let imageUrl = null;
        const imgInContent = content.match(/<img[^>]*(?:data-src|src)="([^"]+)"[^>]*>/i);
        if (imgInContent) {
          imageUrl = imgInContent[1].startsWith('http') ? imgInContent[1] : 'https:' + imgInContent[1];
        } else if (productId && imageMap.has(productId)) {
          imageUrl = imageMap.get(productId);
        }
        
        let textContent = content
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (textContent.length > 0 && textContent.length < 200) {
          const productData = {
            id: segments[segments.length - 1],
            name: textContent,
            url: fullUrl,
            path: url,
            category: segments[1],
            collection: segments.slice(2, -1).join('/'),
            image: imageUrl
          };
          
          // Traduction du nom si nécessaire
          if (shouldTranslate && textContent) {
            try {
              const translated = await translateText(textContent, destLang, { enabled: true, sourceLang: 'fr' });
              if (translated && translated.translated === true && translated.text) {
                productData.name_translated = translated.text;
              }
            } catch (translationError) {
              logger.warn(`[Coleka] Erreur traduction: ${translationError.message}`);
            }
          }
          
          result.products.push(productData);
        }
      }
      
      result.total = result.products.length;
      logger.debug(`[Coleka] ✅ Trouvé ${result.total} produits`);
      
      return result;

    } catch (err) {
      lastError = err;
      logger.warn(`[Coleka] Erreur tentative ${attempt}: ${err.message}`);
      if (attempt >= MAX_RETRIES) break;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  
  throw lastError || new Error('Échec après toutes les tentatives');
}

/**
 * Récupère les détails d'un item Coleka
 * @param {string} itemId - ID, URL ou chemin de l'item (ex: "fr/lego/star-wars/75192-millennium-falcon_i123")
 * @param {Object} options - Options
 * @param {string} options.lang - Langue (fr, en)
 * @param {boolean} options.autoTrad - Activer traduction automatique
 * @returns {Promise<Object>} - Détails de l'item
 */
export async function getColekaDetails(itemId, options = {}) {
  const {
    lang = 'fr',
    autoTrad = false
  } = options;
  
  const destLang = extractLangCode(lang);
  const shouldTranslate = autoTrad && destLang && destLang !== 'fr';
  
  // Construire l'URL
  let itemUrl;
  if (itemId.startsWith('http')) {
    itemUrl = itemId;
  } else if (itemId.startsWith('/')) {
    itemUrl = `${COLEKA_BASE_URL}${itemId}`;
  } else {
    // Si l'ID ne commence pas par la langue, l'ajouter
    const hasLangPrefix = itemId.match(/^[a-z]{2}\//);
    itemUrl = `${COLEKA_BASE_URL}/${hasLangPrefix ? '' : lang + '/'}${itemId}`;
  }
  
  let attempt = 0;
  let lastError = null;
  const client = getFsrClient();
  
  while (attempt < MAX_RETRIES) {
    attempt++;
    
    try {
      logger.debug(`[Coleka] Tentative ${attempt}/${MAX_RETRIES} pour item: "${itemId}"`);
      
      // Visiter la page d'accueil pour initialiser la session
      const homeUrl = `${COLEKA_BASE_URL}/${lang}`;
      await client.ensureSession(homeUrl);
      
      const homeHtml = await client.get(homeUrl, { waitInSeconds: 1 });
      
      // Résoudre le challenge si nécessaire
      if (homeHtml.includes('Simple vérification') || homeHtml.includes('Visiter COLEKA') || homeHtml.includes('verifyBtn')) {
        logger.debug('[Coleka] Challenge détecté, résolution...');
        const challengeSolved = await solveColekaChallenge(lang);
        if (!challengeSolved) {
          throw new Error('Protection anti-bot non contournée');
        }
        // Attendre 2 secondes pour que les cookies soient bien établis
        await new Promise(r => setTimeout(r, 2000));
      }
      
      // Accéder à la page de l'item
      logger.debug(`[Coleka] Accès à: ${itemUrl}`);
      const html = await client.get(itemUrl, { waitInSeconds: 2 });
      
      if (html.includes('Simple vérification') || html.includes('Visiter COLEKA')) {
        throw new Error('Protection anti-bot non contournée');
      }
      
      // Vérifier si page 404
      const hasValidTitle = html.includes('<h1') && !html.includes('Page introuvable') && !html.includes('Page non trouvée');
      const is404Page = html.includes('<title>404') || html.includes('Page introuvable') || html.includes('Page non trouvée');
      
      if (is404Page || (!hasValidTitle && html.length < 5000)) {
        throw new Error(`Item non trouvé: ${itemId}`);
      }
      
      const item = {
        id: itemId,
        url: itemUrl,
        name: null,
        name_original: null,
        name_translated: null,
        images: [],
        description: null,
        description_original: null,
        description_translated: null,
        brand: null,
        brands: [],
        series: null,
        reference: null,
        year: null,
        barcode: null,
        attributes: {},
        source: 'coleka'
      };
      
      // Extraire le titre
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match) {
        item.name = h1Match[1].trim();
        item.name_original = item.name;
      } else {
        const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
        if (ogTitleMatch) {
          item.name = ogTitleMatch[1].trim();
          item.name_original = item.name;
        }
      }
      
      // Extraire la description
      const descMatch = html.match(/<meta[^>]*(?:name="description"|property="og:description")[^>]*content="([^"]+)"/i);
      if (descMatch) {
        item.description = descMatch[1].trim();
        item.description_original = item.description;
      }
      
      // Traduction du nom si nécessaire
      if (shouldTranslate && item.name) {
        try {
          const translated = await translateText(item.name, destLang, { enabled: true, sourceLang: 'fr' });
          if (translated && translated.translated === true && translated.text) {
            item.name = translated.text;
            item.name_translated = translated.text;
          }
        } catch (translationError) {
          logger.warn(`[Coleka] Erreur traduction nom: ${translationError.message}`);
        }
      }
      
      // Traduction de la description si nécessaire
      if (shouldTranslate && item.description) {
        try {
          const translated = await translateText(item.description, destLang, { enabled: true, sourceLang: 'fr' });
          if (translated && translated.translated === true && translated.text) {
            item.description = translated.text;
            item.description_translated = translated.text;
          }
        } catch (translationError) {
          logger.warn(`[Coleka] Erreur traduction description: ${translationError.message}`);
        }
      }
      
      // Extraire l'image principale (og:image)
      const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
      if (ogImageMatch) {
        item.images.push(ogImageMatch[1]);
      }
      
      // Extraire les images de la galerie
      const galleryPattern = /<img[^>]*(?:class="[^"]*(?:product|gallery|item)[^"]*"|data-src="([^"]+)")[^>]*src="([^"]+)"/gi;
      let imgMatch;
      const seenImages = new Set(item.images);
      while ((imgMatch = galleryPattern.exec(html)) !== null) {
        const imgUrl = imgMatch[1] || imgMatch[2];
        if (imgUrl && !seenImages.has(imgUrl) && !imgUrl.includes('placeholder') && !imgUrl.includes('logo')) {
          const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${COLEKA_BASE_URL}${imgUrl}`;
          if (!seenImages.has(fullUrl)) {
            seenImages.add(fullUrl);
            item.images.push(fullUrl);
          }
        }
      }
      
      // Extraire les données structurées JSON-LD
      const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
      if (jsonLdMatch) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1]);
          if (jsonLd['@type'] === 'Product' || jsonLd.name) {
            item.name = item.name || jsonLd.name;
            item.description = item.description || jsonLd.description;
            item.brand = jsonLd.brand?.name || jsonLd.brand;
            if (jsonLd.image) {
              const images = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
              for (const img of images) {
                if (!seenImages.has(img)) {
                  seenImages.add(img);
                  item.images.push(img);
                }
              }
            }
            if (jsonLd.gtin13 || jsonLd.gtin || jsonLd.ean) {
              item.barcode = jsonLd.gtin13 || jsonLd.gtin || jsonLd.ean;
            }
            if (jsonLd.sku || jsonLd.productID) {
              item.reference = jsonLd.sku || jsonLd.productID;
            }
          }
        } catch (e) {
          logger.debug(`[Coleka] Erreur parsing JSON-LD: ${e.message}`);
        }
      }
      
      // Extraire les attributs depuis les tables
      const attrPatterns = [
        /<(?:tr|li)[^>]*>\s*<(?:td|span)[^>]*>([^<]+)<\/(?:td|span)>\s*<(?:td|span)[^>]*>([^<]+)<\/(?:td|span)>/gi,
        /<(?:dt|label)[^>]*>([^<]+)<\/(?:dt|label)>\s*<(?:dd|span)[^>]*>([^<]+)<\/(?:dd|span)>/gi
      ];
      
      for (const pattern of attrPatterns) {
        let attrMatch;
        while ((attrMatch = pattern.exec(html)) !== null) {
          const key = attrMatch[1].replace(/:$/, '').trim().toLowerCase();
          const value = attrMatch[2].trim();
          
          if (key && value && value.length < 200) {
            if (key.includes('marque') || key.includes('brand')) {
              item.brand = item.brand || value;
            } else if (key.includes('série') || key.includes('series') || key.includes('collection')) {
              item.series = item.series || value;
            } else if (key.includes('référence') || key.includes('reference') || key.includes('sku')) {
              item.reference = item.reference || value;
            } else if (key.includes('année') || key.includes('year') || key.includes('date')) {
              const yearMatch = value.match(/\d{4}/);
              if (yearMatch) item.year = parseInt(yearMatch[0]);
            } else if (key.includes('ean') || key.includes('barcode') || key.includes('gtin')) {
              item.barcode = item.barcode || value;
            } else {
              item.attributes[key] = value;
            }
          }
        }
      }
      
      // Extraire les licences/marques
      const licenceMatch = html.match(/<dt>Licence<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i);
      if (licenceMatch) {
        const brands = [];
        const licencePattern = /<a[^>]*>(?:<span[^>]*>[^<]*<\/span>)?([^<]+)<\/a>/gi;
        let licMatch;
        while ((licMatch = licencePattern.exec(licenceMatch[1])) !== null) {
          const brand = licMatch[1].trim();
          if (brand && brand.length > 0) {
            brands.push(brand);
          }
        }
        if (brands.length > 0) {
          item.brand = item.brand || brands[0];
          item.brands = brands;
        }
      }
      
      // Extraire les catégories depuis le fil d'Ariane
      const breadcrumbMatch = html.match(/<(?:nav|ol|ul)[^>]*(?:class="[^"]*breadcrumb[^"]*"|aria-label="[^"]*breadcrumb[^"]*")[^>]*>([\s\S]*?)<\/(?:nav|ol|ul)>/i);
      if (breadcrumbMatch) {
        const crumbs = [];
        const crumbPattern = /<a[^>]*>([^<]+)<\/a>/gi;
        let crumbMatch;
        while ((crumbMatch = crumbPattern.exec(breadcrumbMatch[1])) !== null) {
          const crumb = crumbMatch[1].trim();
          if (crumb && crumb.toLowerCase() !== 'accueil' && crumb.toLowerCase() !== 'home') {
            crumbs.push(crumb);
          }
        }
        if (crumbs.length > 0) {
          item.attributes.categories = crumbs;
        }
      }
      
      if (!item.name) {
        throw new Error(`Impossible d'extraire les informations de l'item: ${itemUrl}`);
      }
      
      // Dédupliquer les images
      item.images = deduplicateColekaImages(item.images);
      
      logger.debug(`[Coleka] ✅ Item récupéré: ${item.name}`);
      
      return item;

    } catch (err) {
      lastError = err;
      logger.warn(`[Coleka] Erreur tentative ${attempt}: ${err.message}`);
      if (attempt >= MAX_RETRIES) break;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  
  throw lastError || new Error('Échec après toutes les tentatives');
}

/**
 * Liste les catégories disponibles sur Coleka
 * @param {Object} options - Options
 * @param {string} options.lang - Langue (fr, en)
 * @returns {Promise<Object>} - Liste des catégories
 */
export async function browseColekaCategories(options = {}) {
  const { lang = 'fr' } = options;
  
  // Catégories principales de Coleka (basées sur l'observation du site)
  const categories = {
    lang,
    categories: [
      {
        id: 'lego',
        name: 'LEGO',
        slug: 'lego',
        description: 'Sets LEGO, minifigures et briques'
      },
      {
        id: 'funko',
        name: 'Funko Pop',
        slug: 'funko',
        description: 'Figurines Funko Pop de toutes licences'
      },
      {
        id: 'figurines',
        name: 'Figurines',
        slug: 'figurines',
        description: 'Figurines d\'action et de collection'
      },
      {
        id: 'playmobil',
        name: 'Playmobil',
        slug: 'playmobil',
        description: 'Sets et figurines Playmobil'
      },
      {
        id: 'jeux-societe',
        name: 'Jeux de société',
        slug: 'jeux-societe',
        description: 'Jeux de plateau et de cartes'
      },
      {
        id: 'cartes-collectionner',
        name: 'Cartes à collectionner',
        slug: 'cartes-collectionner',
        description: 'Cartes Pokemon, Magic, Yu-Gi-Oh, etc.'
      },
      {
        id: 'peluches',
        name: 'Peluches',
        slug: 'peluches',
        description: 'Peluches et jouets en tissu'
      },
      {
        id: 'comics',
        name: 'Comics & BD',
        slug: 'comics',
        description: 'Bandes dessinées et comics'
      }
    ],
    source: 'coleka'
  };
  
  return categories;
}

/**
 * Health check pour Coleka (vérifie FlareSolverr)
 * @returns {Promise<Object>}
 */
export async function healthCheck() {
  try {
    const client = getFsrClient();
    const health = await client.healthCheck();
    
    return {
      status: health.healthy ? 'healthy' : 'unhealthy',
      provider: 'coleka',
      flaresolverr: {
        healthy: health.healthy,
        latency: health.latency,
        message: health.message,
        sessions: health.sessions
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      provider: 'coleka',
      error: error.message,
      flaresolverr: {
        healthy: false,
        message: 'unavailable'
      }
    };
  }
}
