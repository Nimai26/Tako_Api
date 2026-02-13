# 🔍 RAPPORT D'ANALYSE COMPARATIVE : JIKAN vs TMDB

**Date :** 5 février 2026  
**Objet :** Analyse des implémentations Jikan et TMDB pour identifier les incohérences  
**Analysé par :** Tako API Technical Review

---

## 📋 RÉSUMÉ EXÉCUTIF

### Problèmes identifiés

1. **❌ CRITIQUE : Filtrage NSFW incohérent et non fonctionnel (Jikan)**
2. **❌ MAJEUR : Routes discovery mal enregistrées dans le cache (Jikan)**
3. **⚠️ MOYEN : Architecture routes discovery différente entre Jikan et TMDB**
4. **⚠️ MOYEN : Paramètre `sfw` non utilisable par client (Jikan)**
5. **✅ BON : TMDB implémentation correcte (référence)**

---

## 🎯 PROBLÈME #1 : FILTRAGE NSFW JIKAN (CRITIQUE)

### Description du problème

**Jikan a un système de filtrage NSFW cassé et contradictoire :**

#### 🔴 Contradiction majeure dans le code

**Provider (`jikan.provider.js`)** :
```javascript
// Ligne 272 - searchAnime
params.append('sfw', 'false');  // TOUJOURS false = tout inclure

// Ligne 335 - searchManga  
params.append('sfw', 'false');  // TOUJOURS false = tout inclure
```

**Routes (`jikan.routes.js`)** :
```javascript
// Ligne 94 - Fonction filterBySfw
function filterBySfw(data, sfw) {
  if (sfw === 'nsfw') {
    // Mode NSFW: ne garder que les hentai
    return data.filter(item => 
      item.genres?.some(g => g.mal_id === 12 || g.name?.toLowerCase().includes('hentai'))
    );
  }
  // Modes 'all' et 'sfw' gérés par l'API Jikan directement
  return data;
}
```

**❌ PROBLÈME** : 
- L'API Jikan est **TOUJOURS** appelée avec `sfw=false` (tout inclure)
- La fonction `filterBySfw()` tente de filtrer **après coup côté client**
- Mais l'API renvoie **TOUT** (hentai inclus) même si on demande `sfw=true`
- Le filtre client-side pour `sfw='nsfw'` est **trop restrictif** (genre ID 12 uniquement)

### Comportement actuel vs attendu

| Paramètre `sfw` | Comportement ACTUEL | Comportement ATTENDU |
|----------------|---------------------|----------------------|
| `sfw=all` | ✅ Tout inclure (défaut) | ✅ Tout inclure |
| `sfw=sfw` | ❌ Tout inclure (hentai compris) | ✅ Sans hentai (API Jikan `sfw=true`) |
| `sfw=nsfw` | ❌ Filtre client-side genre 12 uniquement | ✅ Hentai uniquement (rating `rx`) |

### Exemple concret

Route : `GET /anime-manga/jikan/search/anime?q=naruto&sfw=sfw`

**Actuellement** :
1. Provider appelle `https://api.jikan.moe/v4/anime?q=naruto&sfw=false` ❌
2. API renvoie TOUT (hentai inclus)
3. Route ne filtre PAS car `filterBySfw` n'est **JAMAIS appelée** dans `search/anime`
4. Client reçoit du contenu hentai même avec `sfw=sfw` ❌

**Devrait faire** :
1. Provider appelle `https://api.jikan.moe/v4/anime?q=naruto&sfw=true` ✅
2. API renvoie seulement contenu SFW
3. Pas de filtre client nécessaire
4. Client reçoit contenu safe ✅

### Impact

- **Routes search (search/anime, search/manga)** : Filtrage NSFW **NON FONCTIONNEL** ❌
- **Routes discovery (trending, top, upcoming)** : Filtrage appliqué mais **INEFFICACE** ⚠️
- **Risque** : Contenu adulte exposé aux utilisateurs demandant `sfw=true`

---

## 🎯 PROBLÈME #2 : CACHE DISCOVERY MAL ENREGISTRÉ (MAJEUR)

### Description du problème

**Les routes discovery Jikan ne sont PAS mises en cache correctement.**

#### Analyse du code

**Provider Jikan (`jikan.provider.js` lignes 920-1040)** :

```javascript
async getTop(type = 'anime', options = {}) {
  const { limit, page, filter, subtype, sfw = 'all' } = options;
  
  // ❌ PROBLÈME: sfw dans options mais pas utilisé dans clé cache
  // Gestion du filtre SFW
  if (sfw === 'sfw') {
    params.append('sfw', 'true');
  } else if (sfw === 'nsfw') {
    params.append('sfw', 'false');
    params.append('rating', 'rx');
  } else {
    params.append('sfw', 'false');  // Défaut
  }
  
  return { data: normalizedData, pagination, type, filter };
}

async getCurrentSeason(options = {}) {
  const { limit, page, filter, sfw = 'all' } = options;
  
  // ❌ MÊME PROBLÈME
  if (sfw === 'sfw') {
    params.append('sfw', 'true');
  } // ...
  
  return { data: normalizedData, pagination, season, year };
}
```

**Routes Jikan (`jikan.routes.js` lignes 1500-1900)** :

```javascript
// Route /trending/tv
router.get('/trending/tv', asyncHandler(async (req, res) => {
  const { limit, page, sfw = 'all', lang, autoTrad } = req.query;

  const { data: results, fromCache, cacheKey } = await withDiscoveryCache({
    provider: 'jikan',
    endpoint: 'trending',
    fetchFn: async () => {
      let results = await provider.getCurrentSeason({
        limit: limitNum,
        page: pageNum,
        filter: sfw === 'nsfw' ? null : 'tv',
        sfw  // ✅ Passé au provider
      });

      results.data = await enrichWithBackdrops(results.data);
      results.data = filterBySfw(results.data, sfw);
      return results;
    },
    cacheOptions: {
      category: 'tv',
      sfw,  // ✅ Inclus dans options cache
      ttl: getTTL('trending')
    }
  });
  // ...
}));
```

**Comparaison TMDB (`tmdb.routes.js` lignes 638-720)** :

```javascript
router.get('/trending', asyncHandler(async (req, res) => {
  const { category = 'movie', period = 'week', limit, page, lang, autoTrad } = req.query;

  const { data: results, fromCache, cacheKey } = await withDiscoveryCache({
    provider: 'tmdb',
    endpoint: 'trending',
    fetchFn: async () => {
      return await provider.getTrending(category, period, {
        limit: limitNum,
        lang,
        page: pageNum
      });
    },
    cacheOptions: {
      category,    // ✅ Inclus
      period,      // ✅ Inclus
      ttl: getTTL('trending')
    }
  });
  // ...
}));
```

### Problème identifié

**❌ Le paramètre `sfw` est inclus dans `cacheOptions` MAIS :**

1. **Enrichissement APRÈS cache** : `enrichWithBackdrops()` et `filterBySfw()` sont appelés **DANS** `fetchFn`
2. **Pas de distinction de cache** : Un cache `sfw=all` sera réutilisé pour `sfw=sfw` car la clé ne change pas vraiment
3. **Performance** : `enrichWithBackdrops()` appelle l'API Jikan (Pictures endpoint) **à chaque fois**, même si le résultat est en cache

**Comportement constaté :**

```
Requête 1: GET /trending/tv?sfw=all
→ Miss cache
→ Appel provider.getCurrentSeason({ sfw: 'all' })
→ Enrichissement backdrops (appels API /pictures)
→ Filtre sfw (aucun effet pour 'all')
→ Stockage cache avec clé: jikan-trending-tv-all
→ Retour résultat

Requête 2: GET /trending/tv?sfw=sfw
→ Hit cache jikan-trending-tv-sfw (différent)
→ Appel provider.getCurrentSeason({ sfw: 'sfw' })
→ Enrichissement backdrops (appels API /pictures RÉPÉTÉS) ❌
→ Filtre sfw (devrait retirer hentai mais API déjà filtré)
→ Stockage cache
→ Retour résultat
```

**❌ PROBLÈME** : `enrichWithBackdrops()` est **toujours exécuté** même avec cache hit, car il est **dans fetchFn**

---

## 🎯 PROBLÈME #3 : ARCHITECTURE DISCOVERY DIFFÉRENTE

### TMDB (✅ Architecture correcte - référence)

**Provider (`tmdb.provider.js`)** :
```javascript
async getTrending(mediaType = 'movie', timeWindow = 'week', options = {}) {
  // Appel API TMDB /trending/{mediaType}/{timeWindow}
  // Normalisation
  // Retour data + pagination
  return this.normalizer.normalizeSearchResponse(results, { ... });
}

async getPopular(mediaType = 'movie', options = {}) {
  // Appel API TMDB /{mediaType}/popular
  // Normalisation
  return this.normalizer.normalizeSearchResponse(results, { ... });
}

async getUpcoming(mediaType = 'movie', options = {}) {
  // Utilise /discover avec filtre date >= today
  // Normalisation
  return this.normalizer.normalizeSearchResponse(results, { ... });
}
```

**Routes (`tmdb.routes.js`)** :
```javascript
router.get('/trending', asyncHandler(async (req, res) => {
  // Validation params
  // Cache wrap
  const { data: results } = await withDiscoveryCache({
    provider: 'tmdb',
    endpoint: 'trending',
    fetchFn: async () => {
      return await provider.getTrending(category, period, { ... });
    },
    cacheOptions: { category, period, ttl: getTTL('trending') }
  });
  // Traduction APRÈS cache (multi-langue)
  // Retour réponse
}));

router.get('/popular', asyncHandler(async (req, res) => {
  // Même pattern
  const { data: results } = await withDiscoveryCache({
    provider: 'tmdb',
    endpoint: 'popular',
    fetchFn: async () => provider.getPopular(category, { ... }),
    cacheOptions: { category, ttl: getTTL('popular') }
  });
}));

router.get('/upcoming', asyncHandler(async (req, res) => {
  // Même pattern
  const { data: results } = await withDiscoveryCache({
    provider: 'tmdb',
    endpoint: 'upcoming',
    fetchFn: async () => provider.getUpcoming(category, { ... }),
    cacheOptions: { category, ttl: getTTL('upcoming') }
  });
}));
```

**✅ Points forts TMDB :**
- Routes claires `/trending`, `/popular`, `/upcoming`, `/top-rated`
- Paramètre `category` (movie/tv) pour filtrer le type
- Paramètre `period` (day/week) pour trending
- Cache **par endpoint + catégorie + period**
- Traduction **APRÈS** cache (optimisation multi-langue)
- Aucun post-traitement dans `fetchFn`

### JIKAN (❌ Architecture incohérente)

**Provider (`jikan.provider.js`)** :
```javascript
async getTop(type = 'anime', options = {}) {
  // Appel API Jikan /top/{type}
  // Gestion sfw (mais pas dans clé cache)
  // Normalisation
  return { data, pagination, type, filter };
}

async getCurrentSeason(options = {}) {
  // Appel API Jikan /seasons/now
  // Gestion sfw
  // Normalisation
  return { data, pagination, season, year };
}

async getUpcoming(options = {}) {
  // Appel API Jikan /seasons/upcoming
  // Gestion sfw
  // Normalisation
  return { data, pagination };
}

async getSchedule(day = null, options = {}) {
  // Appel API Jikan /schedules?filter={day}
  // Normalisation
  return { data, pagination, day };
}
```

**Routes (`jikan.routes.js`)** :
```javascript
// ❌ PROBLÈME: Routes discovery éclatées
router.get('/top/anime', ...);      // Utilise getTop('anime')
router.get('/top/manga', ...);      // Utilise getTop('manga')

// ❌ Routes discovery par catégorie (confusion)
router.get('/trending/tv', ...);    // Utilise getCurrentSeason({ filter: 'tv' })
router.get('/trending/movie', ...); // Utilise getCurrentSeason({ filter: 'movie' })
router.get('/top/tv', ...);         // Utilise getTop('anime', { subtype: 'tv' })
router.get('/top/movie', ...);      // Utilise getTop('anime', { subtype: 'movie' })
router.get('/upcoming/tv', ...);    // Utilise getUpcoming({ filter: 'tv' })
router.get('/upcoming/movie', ...); // Utilise getUpcoming({ filter: 'movie' })

// ✅ Mais AUSSI routes génériques (confusion)
router.get('/top', ...);            // Prend type=anime|manga en query param
router.get('/upcoming', ...);       // Pas de filtre catégorie
router.get('/schedule', ...);       // Jour en query param

// ❌ Post-processing dans fetchFn (inefficace)
fetchFn: async () => {
  let results = await provider.getCurrentSeason({ ... });
  results.data = await enrichWithBackdrops(results.data);  // ❌ Appels API
  results.data = filterBySfw(results.data, sfw);          // ❌ Filtre client
  return results;
}
```

**❌ Problèmes identifiés :**

1. **Routes discovery dupliquées** : `/trending/tv` ET `/top` avec `type=anime&subtype=tv`
2. **Nomenclature incohérente** : 
   - TMDB: `category=movie/tv`
   - Jikan: `type=anime/manga` + `subtype=tv/movie` + routes `/tv` et `/movie`
3. **Post-processing dans `fetchFn`** → pas de bénéfice cache
4. **Filtrage client-side** au lieu de serveur-side
5. **Enrichissement coûteux** (backdrops) refait à chaque fois

---

## 🎯 PROBLÈME #4 : PARAMÈTRE `sfw` NON UTILISABLE PAR CLIENT

### Routes search (search/anime, search/manga)

**Code actuel (`jikan.routes.js` lignes 230-340)** :

```javascript
router.get('/search/anime', asyncHandler(async (req, res) => {
  const { 
    q, page, maxResults, type, status, rating, 
    minScore, year, season, genres, orderBy, sort,
    lang, autoTrad 
  } = req.query;
  
  // ❌ AUCUN paramètre sfw accepté
  
  let result = await provider.searchAnime(q, {
    page, maxResults, type, status, rating,
    minScore, year, season, genres, orderBy, sort
    // ❌ sfw non passé
  });
  
  // ❌ filterBySfw JAMAIS appelé
  
  res.json({
    success: true,
    provider: 'jikan',
    ...result,
    meta: {
      lang, autoTrad,
      note: 'Contenu adulte NON filtré'  // ⚠️ Warning dans réponse
    }
  });
}));
```

**❌ Conséquence** :
- Client ne peut PAS demander `sfw=true` sur `/search/anime`
- Toutes les recherches retournent **tout le contenu** (hentai inclus)
- Warning "Contenu adulte NON filtré" dans metadata mais aucun moyen de filtrer

### Routes discovery (trending, top, upcoming)

**Code actuel (`jikan.routes.js` lignes 1480-1900)** :

```javascript
router.get('/trending/tv', asyncHandler(async (req, res) => {
  const { limit, page, sfw = 'all', lang, autoTrad } = req.query;
  
  // ✅ Paramètre sfw accepté
  
  const { data: results } = await withDiscoveryCache({
    // ...
    fetchFn: async () => {
      let results = await provider.getCurrentSeason({
        limit, page,
        filter: sfw === 'nsfw' ? null : 'tv',
        sfw  // ✅ Passé au provider
      });
      
      results.data = await enrichWithBackdrops(results.data);
      results.data = filterBySfw(results.data, sfw);  // ⚠️ Filtre client
      return results;
    },
    cacheOptions: { category: 'tv', sfw, ttl: getTTL('trending') }
  });
}));
```

**⚠️ Problème partiel** :
- Paramètre `sfw` accepté ✅
- Mais filtrage **inefficace** car API appelée avec mauvais paramètre
- Post-processing coûteux non optimisé par cache

---

## 📊 TABLEAU COMPARATIF COMPLET

| Aspect | TMDB ✅ | JIKAN ❌ |
|--------|---------|----------|
| **Filtrage contenu adulte** | N/A (pas de contenu adulte) | Cassé (sfw ignoré) |
| **Routes discovery** | `/trending`, `/popular`, `/upcoming`, `/top-rated` | `/trending/{cat}`, `/top/{cat}`, `/upcoming/{cat}` + `/top` générique |
| **Paramètre catégorie** | `category=movie\|tv` (clair) | `type=anime\|manga` + `subtype=tv\|movie` + routes `/tv` `/movie` (confus) |
| **Cache discovery** | Par endpoint + category + period | Par endpoint + category + sfw (mais inefficace) |
| **Post-processing** | Traduction APRÈS cache (optimisé) | Enrichissement + filtre DANS fetchFn (non optimisé) |
| **Appels API externes** | Minimisés (1 par cache miss) | Multiples (pictures endpoint) même avec cache |
| **Filtrage client vs server** | N/A | Client-side (inefficace) au lieu de server-side |
| **Cohérence architecture** | ✅ Excellente | ⚠️ Mélange routes spécialisées + génériques |
| **Documentation routes** | ✅ Claire | ⚠️ Contradictoire (sfw=false dans commentaires) |

---

## 🔧 SOLUTIONS RECOMMANDÉES

### 1. Fixer le filtrage NSFW (PRIORITÉ CRITIQUE)

#### A. Modifier le Provider (`jikan.provider.js`)

```javascript
// ❌ AVANT (lignes 272, 335, 925, 985, 1075)
params.append('sfw', 'false');  // TOUJOURS false

// ✅ APRÈS
async searchAnime(query, options = {}) {
  const { sfw = 'all', ... } = options;
  
  const params = new URLSearchParams({ q: query, page, limit });
  
  // Gestion SFW/NSFW
  if (sfw === 'sfw') {
    params.append('sfw', 'true');   // API filtre hentai
  } else if (sfw === 'nsfw') {
    params.append('sfw', 'false');  // Tout inclure
    params.append('rating', 'rx');  // Mais ne garder que hentai (Rx rating)
  } else {
    params.append('sfw', 'false');  // Défaut: tout inclure
  }
  
  // ...
}
```

**Appliquer à** :
- `searchAnime()`
- `searchManga()`
- `getTop()`
- `getCurrentSeason()`
- `getUpcoming()`
- `getSchedule()`

#### B. Modifier les Routes (`jikan.routes.js`)

```javascript
// ✅ Ajouter paramètre sfw aux routes search
router.get('/search/anime', asyncHandler(async (req, res) => {
  const { 
    q, page, maxResults, 
    sfw = 'all',  // ✅ NOUVEAU
    type, status, rating, minScore, year, season, genres, orderBy, sort,
    lang, autoTrad 
  } = req.query;
  
  let result = await provider.searchAnime(q, {
    page, maxResults,
    sfw,  // ✅ Passer au provider
    type, status, rating, minScore, year, season, genres, orderBy, sort
  });
  
  // ❌ SUPPRIMER filterBySfw (fait par API maintenant)
  
  res.json({
    success: true,
    provider: 'jikan',
    ...result,
    meta: {
      lang, autoTrad,
      sfw,  // ✅ Indiquer mode SFW utilisé
      note: sfw === 'all' ? 'Tout contenu inclus (hentai compris)' : 
            sfw === 'sfw' ? 'Contenu sûr uniquement' : 
            'Hentai uniquement'
    }
  });
}));
```

#### C. Supprimer `filterBySfw` client-side

```javascript
// ❌ SUPPRIMER cette fonction (lignes 89-100)
function filterBySfw(data, sfw) {
  // Plus nécessaire car API gère le filtrage
}

// ❌ SUPPRIMER tous les appels
results.data = filterBySfw(results.data, sfw);
```

### 2. Optimiser le cache discovery (PRIORITÉ HAUTE)

#### A. Déplacer l'enrichissement HORS du `fetchFn`

```javascript
// ❌ AVANT
router.get('/trending/tv', asyncHandler(async (req, res) => {
  const { data: results } = await withDiscoveryCache({
    fetchFn: async () => {
      let results = await provider.getCurrentSeason({ sfw, ... });
      results.data = await enrichWithBackdrops(results.data);  // ❌ Dans fetchFn
      results.data = filterBySfw(results.data, sfw);           // ❌ Dans fetchFn
      return results;
    },
    cacheOptions: { category: 'tv', sfw, ttl: getTTL('trending') }
  });
}));

// ✅ APRÈS
router.get('/trending/tv', asyncHandler(async (req, res) => {
  const { data: results, fromCache } = await withDiscoveryCache({
    fetchFn: async () => {
      // Seulement l'appel provider (léger)
      return await provider.getCurrentSeason({ sfw, filter: 'tv', ... });
    },
    cacheOptions: { category: 'tv', sfw, ttl: getTTL('trending') }
  });
  
  // ✅ Enrichissement APRÈS cache (si nécessaire)
  if (!fromCache && results.data?.length > 0) {
    results.data = await enrichWithBackdrops(results.data);
  }
  
  // Traduction APRÈS cache (multi-langue)
  if (autoTradEnabled && targetLang && results.data?.length > 0) {
    results.data = await translateSearchResults(results.data, targetLang, { ... });
  }
  
  res.json({ ... });
}));
```

**❌ PROBLÈME avec cette approche** : Les backdrops ne seront pas en cache !

**✅ MEILLEURE SOLUTION** : Mettre backdrops dans le cache aussi

```javascript
router.get('/trending/tv', asyncHandler(async (req, res) => {
  // Option 1: Cache avec backdrops inclus
  const { data: results, fromCache } = await withDiscoveryCache({
    fetchFn: async () => {
      let results = await provider.getCurrentSeason({ sfw, filter: 'tv', ... });
      // Enrichir avant de mettre en cache
      results.data = await enrichWithBackdrops(results.data);
      return results;
    },
    cacheOptions: { 
      category: 'tv', 
      sfw, 
      enriched: true,  // ✅ Indiquer que backdrops inclus
      ttl: getTTL('trending') 
    }
  });
  
  // Traduction APRÈS cache
  // ...
}));
```

### 3. Uniformiser l'architecture discovery (PRIORITÉ MOYENNE)

#### Option A : Suivre le modèle TMDB (recommandé)

**Garder seulement les routes spécialisées** :

```javascript
// ✅ Routes discovery claires
router.get('/trending', ...);      // Paramètre category=tv|movie|all
router.get('/top', ...);           // Paramètre category=tv|movie|manga
router.get('/upcoming', ...);      // Paramètre category=tv|movie
router.get('/schedule', ...);      // Paramètre day=monday|...

// ❌ SUPPRIMER les routes redondantes
// router.get('/trending/tv', ...);
// router.get('/trending/movie', ...);
// router.get('/top/tv', ...);
// router.get('/top/movie', ...);
// router.get('/upcoming/tv', ...);
// router.get('/upcoming/movie', ...);
```

#### Option B : Garder les 2 (actuel - complexe)

Si on veut garder les routes `/trending/tv` et `/trending?category=tv`, il faut :

1. **Partager la logique** entre les deux
2. **Éviter la duplication** de code
3. **Documenter clairement** qu'elles font la même chose

```javascript
// Helper partagé
async function getTrendingAnime(category, sfw, options) {
  const { data: results, fromCache } = await withDiscoveryCache({
    provider: 'jikan',
    endpoint: 'trending',
    fetchFn: async () => provider.getCurrentSeason({ 
      sfw, 
      filter: category === 'all' ? null : category,
      ...options 
    }),
    cacheOptions: { category, sfw, ttl: getTTL('trending') }
  });
  return { results, fromCache };
}

// Route générique
router.get('/trending', asyncHandler(async (req, res) => {
  const { category = 'all', sfw = 'all', ... } = req.query;
  const { results, fromCache } = await getTrendingAnime(category, sfw, { ... });
  // ...
}));

// Route spécialisée (alias)
router.get('/trending/tv', asyncHandler(async (req, res) => {
  const { sfw = 'all', ... } = req.query;
  const { results, fromCache } = await getTrendingAnime('tv', sfw, { ... });
  // ...
}));
```

### 4. Documentation claire (PRIORITÉ BASSE)

#### Mettre à jour les commentaires

```javascript
/**
 * Jikan Routes (MyAnimeList API)
 * 
 * Routes pour l'API Jikan - Anime et Manga.
 * 
 * ✅ FILTRAGE CONTENU ADULTE/HENTAI:
 * - Paramètre sfw accepté sur TOUTES les routes
 * - Valeurs: 'all' (défaut, tout inclure), 'sfw' (sans hentai), 'nsfw' (hentai uniquement)
 * - Filtrage fait par API Jikan (server-side)
 * 
 * Endpoints discovery:
 * - GET /trending?category=tv|movie|all - Anime de la saison actuelle
 * - GET /top?type=anime|manga&filter=bypopularity|favorite|airing - Top anime/manga
 * - GET /upcoming?category=tv|movie - Anime à venir (prochaine saison)
 * - GET /schedule?day=monday|... - Planning de diffusion
 * 
 * Routes spécialisées (alias):
 * - GET /trending/tv - Équivalent à /trending?category=tv
 * - GET /trending/movie - Équivalent à /trending?category=movie
 * - GET /top/tv - Équivalent à /top?type=anime&subtype=tv
 * - GET /top/movie - Équivalent à /top?type=anime&subtype=movie
 * - GET /upcoming/tv - Équivalent à /upcoming?category=tv
 * - GET /upcoming/movie - Équivalent à /upcoming?category=movie
 */
```

---

## 📈 IMPACT ET PRIORISATION

### Impact Utilisateur

| Problème | Sévérité | Impact Utilisateur | Impact Métier |
|----------|----------|-------------------|---------------|
| Filtrage NSFW cassé | 🔴 Critique | Contenu adulte exposé aux mineurs | Risque légal/compliance |
| Cache discovery inefficace | 🟠 Majeur | Latence élevée (appels API répétés) | Coût API, expérience dégradée |
| Architecture incohérente | 🟡 Moyen | Confusion API, doc complexe | Maintenance difficile |
| Paramètre sfw manquant (search) | 🟠 Majeur | Impossible de filtrer recherches | Frustration utilisateurs |

### Priorisation des correctifs

#### 🔴 P0 - URGENT (cette semaine)

1. **Fixer filtrage NSFW dans provider** (2-3h)
   - Modifier `searchAnime`, `searchManga`, `getTop`, `getCurrentSeason`, `getUpcoming`
   - Utiliser `sfw=true` quand demandé au lieu de `sfw=false` systématique

2. **Ajouter paramètre `sfw` aux routes search** (1h)
   - `search/anime` et `search/manga`
   - Valider et passer au provider

#### 🟠 P1 - IMPORTANT (semaine prochaine)

3. **Optimiser cache discovery** (4-6h)
   - Déplacer `enrichWithBackdrops` hors de `fetchFn` OU l'inclure dans cache
   - Supprimer `filterBySfw` client-side (devenu inutile)
   - Tester performance avant/après

#### 🟡 P2 - AMÉLIORATIONS (2 semaines)

4. **Uniformiser architecture routes** (6-8h)
   - Décider : garder seulement routes génériques OU garder les deux avec helpers
   - Refactoriser duplication
   - Mettre à jour documentation

5. **Améliorer documentation** (2h)
   - Corriger commentaires contradictoires
   - Ajouter exemples d'utilisation clairs
   - Documenter paramètre `sfw` partout

---

## ✅ CHECKLIST DE VALIDATION

### Après correctifs, vérifier :

#### Filtrage NSFW

- [ ] `GET /search/anime?q=test&sfw=sfw` ne retourne PAS de hentai
- [ ] `GET /search/anime?q=test&sfw=nsfw` retourne SEULEMENT du hentai
- [ ] `GET /search/anime?q=test&sfw=all` retourne tout
- [ ] `GET /trending/tv?sfw=sfw` ne retourne PAS de hentai
- [ ] `GET /top/anime?sfw=nsfw` retourne SEULEMENT du hentai

#### Cache

- [ ] `GET /trending/tv` 1ère fois : `fromCache=false`, appel API Jikan + Pictures
- [ ] `GET /trending/tv` 2ème fois : `fromCache=true`, PAS d'appel API
- [ ] `GET /trending/tv?sfw=sfw` : Cache différent de `sfw=all`
- [ ] Les backdrops sont présents même en cache hit
- [ ] Latence < 100ms en cache hit (vs 2-5s en cache miss)

#### Architecture

- [ ] Routes discovery cohérentes avec TMDB
- [ ] Documentation à jour et sans contradiction
- [ ] Tests end-to-end passent

---

## 📝 NOTES TECHNIQUES COMPLÉMENTAIRES

### API Jikan - Paramètre SFW

Documentation officielle : https://docs.api.jikan.moe/#tag/anime/operation/getAnimeSearch

**Paramètre `sfw` (Safe For Work)** :
- Type : boolean
- Valeurs : `true` (sans hentai) ou `false` (tout inclure)
- Défaut : `false`

**Rating anime Jikan** :
- `G` - All Ages
- `PG` - Children
- `PG-13` - Teens 13 or older
- `R` - 17+ (violence & profanity)
- `R+` - Mild Nudity
- **`Rx` - Hentai** ⚠️

**Pour filtrer hentai uniquement** :
```
GET /anime?rating=rx&sfw=false
```

**Pour exclure hentai** :
```
GET /anime?sfw=true
```

### Cache TTL recommandés

Basé sur TMDB (référence) :

```javascript
// src/shared/utils/cache-wrapper.js
export function getTTL(endpoint) {
  const TTL_MAP = {
    'trending': 3600000,      // 1h (contenu change vite)
    'popular': 7200000,       // 2h
    'top': 21600000,          // 6h (classements stables)
    'upcoming': 43200000,     // 12h (saison future)
    'schedule': 1800000,      // 30min (planning quotidien)
  };
  return TTL_MAP[endpoint] || 3600000;  // Défaut 1h
}
```

### Performance enrichWithBackdrops

**Coût actuel** :
- Appel `/pictures` par anime (rate limit 3 req/s)
- Pour 20 anime = 20 appels = 7 secondes minimum
- Répété à chaque cache miss ET hit si dans `fetchFn`

**Optimisations possibles** :

1. **Inclure dans cache** (recommandé)
   ```javascript
   fetchFn: async () => {
     let results = await provider.getCurrentSeason({ ... });
     results.data = await enrichWithBackdrops(results.data);  // ✅ Avant cache
     return results;
   }
   ```
   → Coût : 1 fois par TTL (1h) = acceptable

2. **Cache séparé backdrops** (complexe)
   ```javascript
   // Cache niveau 1: Résultats sans backdrops (léger)
   // Cache niveau 2: Backdrops par malId (persistant)
   ```
   → Évite répétition mais complexité accrue

3. **Désactiver backdrops** (simple mais moins riche)
   ```javascript
   // Supprimer enrichWithBackdrops
   // Utiliser seulement images.jpg.image_url de base
   ```
   → Performance optimale mais moins de qualité visuelle

**Recommandation** : Option 1 (inclure dans cache)

---

## 🎓 CONCLUSION

### Résumé des problèmes

1. **Filtrage NSFW Jikan** : Cassé, API toujours appelée avec `sfw=false`
2. **Cache discovery** : Inefficace, post-processing coûteux non optimisé
3. **Architecture** : Incohérente, mélange routes spécialisées + génériques
4. **Documentation** : Contradictoire, mentionne `sfw=false` comme volontaire

### Recommandations finales

#### Court terme (P0)
✅ Fixer le filtrage NSFW dans provider et routes  
✅ Ajouter paramètre `sfw` aux routes search  

#### Moyen terme (P1)
✅ Optimiser cache discovery (inclure enrichissement)  
✅ Uniformiser nomenclature avec TMDB  

#### Long terme (P2)
✅ Refactoriser architecture routes (supprimer redondance)  
✅ Améliorer documentation et exemples  

### TMDB comme référence

**TMDB est la référence à suivre pour :**
- Architecture routes discovery claire
- Cache optimisé (traduction après cache)
- Paramètres cohérents (`category`, `period`)
- Documentation sans contradiction

---

**Fin du rapport d'analyse**  
**Prochaine étape :** Implémenter les correctifs P0 et P1
