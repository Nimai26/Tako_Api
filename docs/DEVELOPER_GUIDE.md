# Tako API — Guide du Développeur

> **Version** : 2.6.0  
> **Base URL Production** : `https://tako.snowmanprod.fr`  
> **Dernière mise à jour** : 4 mars 2026

---

## Table des matières

1. [Introduction](#1-introduction)
2. [Démarrage rapide](#2-démarrage-rapide)
3. [Authentification & Accès](#3-authentification--accès)
4. [Format de réponse unifié](#4-format-de-réponse-unifié)
5. [Paramètres communs](#5-paramètres-communs)
6. [Pagination](#6-pagination)
7. [Gestion des erreurs](#7-gestion-des-erreurs)
8. [Headers HTTP](#8-headers-http)
9. [Cache & Performance](#9-cache--performance)
10. [Domaines & Endpoints](#10-domaines--endpoints)
    - [10.1 Comics / BD](#101-comics--bd)
    - [10.2 Books / Livres](#102-books--livres)
    - [10.3 Construction Toys](#103-construction-toys--jouets-de-construction)
    - [10.4 Anime & Manga](#104-anime--manga)
    - [10.5 Media / Films & Séries](#105-media--films--séries)
    - [10.6 Videogames / Jeux vidéo](#106-videogames--jeux-vidéo)
    - [10.7 BoardGames / Jeux de société](#107-boardgames--jeux-de-société)
    - [10.8 Collectibles / Objets de collection](#108-collectibles--objets-de-collection)
    - [10.9 TCG / Jeux de cartes](#109-tcg--jeux-de-cartes-à-collectionner)
    - [10.10 Music / Musique](#1010-music--musique)
    - [10.11 E-commerce](#1011-e-commerce)
    - [10.12 Sticker-Albums](#1012-sticker-albums)
11. [Endpoints Discovery (Trending/Popular)](#11-endpoints-discovery-trendingpopularcharts)
12. [Cache Admin](#12-cache-admin)
13. [Servir des fichiers statiques](#13-fichiers-statiques-images-pdfs)
14. [Traduction automatique](#14-traduction-automatique)
15. [Limites & Bonnes pratiques](#15-limites--bonnes-pratiques)
16. [Exemples d'intégration](#16-exemples-dintégration)
17. [FAQ](#17-faq)

---

## 1. Introduction

**Tako API** est une API REST unifiée qui agrège **37 providers** répartis en **12 domaines** (comics, livres, jeux vidéo, anime, films, musique, TCG, collectibles, sticker-albums…). Elle fournit un **format de réponse normalisé** quel que soit le provider, ce qui simplifie considérablement l'intégration côté client.

### Ce que Tako API offre

- **Recherche multi-sources** : un seul format de requête pour interroger TMDB, IGDB, Pokémon TCG, Discogs, etc.
- **Réponses normalisées** : tous les providers retournent la même structure d'objet
- **Traduction automatique** : traduction intégrée vers FR, EN, DE, ES, IT, PT
- **Cache intelligent** : cache PostgreSQL avec refresh automatique pour les endpoints discovery
- **Archives locales** : 130 102 cartes Carddass, 7 902 cartes DBS, 616 constructions MEGA/KRE-O avec images servies directement
- **Zéro authentification** : l'API est publique, aucune clé n'est requise côté client

### Architecture résumée

```
Votre App  →  Tako API  →  37 APIs/Sites externes
                ↓
           PostgreSQL (cache + archives)
                ↓
           Fichiers statiques (images, PDFs)
```

---

## 2. Démarrage rapide

### Votre premier appel

```bash
# Health check
curl https://tako.snowmanprod.fr/health

# Rechercher "batman" dans les comics
curl "https://tako.snowmanprod.fr/api/comics/comicvine/search?q=batman&maxResults=5"

# Rechercher un anime
curl "https://tako.snowmanprod.fr/api/anime-manga/jikan/search/anime?q=naruto&limit=5"

# Chercher un set LEGO
curl "https://tako.snowmanprod.fr/api/construction-toys/brickset/search?q=millennium+falcon"
```

### En JavaScript (fetch)

```javascript
const BASE_URL = 'https://tako.snowmanprod.fr';

// Recherche de films
const res = await fetch(`${BASE_URL}/api/media/tmdb/search/movies?q=matrix`);
const { data, pagination } = await res.json();

data.forEach(movie => {
  console.log(`${movie.title} (${movie.year}) - ${movie.images?.primary}`);
});
```

### En Python (requests)

```python
import requests

BASE_URL = "https://tako.snowmanprod.fr"

res = requests.get(f"{BASE_URL}/api/tcg/pokemon/search", params={"q": "pikachu", "max": 5})
cards = res.json()["data"]

for card in cards:
    print(f"{card['title']} - {card['metadata']['rarity']} - {card['image']}")
```

---

## 3. Authentification & Accès

| Élément | Valeur |
|---------|--------|
| **Authentification client** | **Aucune** — L'API est publique |
| **HTTPS** | ✅ Obligatoire en production (`https://tako.snowmanprod.fr`) |
| **CORS** | ✅ Activé (toutes origines autorisées) |
| **Rate limit client** | Aucun rate limit côté Tako API |

> **Note** : Tako API gère en interne les clés API de chaque provider (TMDB, IGDB, Brickset, etc.). Vous n'avez aucune clé à fournir.

---

## 4. Format de réponse unifié

### Structure d'un item

Chaque élément retourné par l'API suit **le même schéma de base**, quel que soit le provider :

```json
{
  "id": "brickset:31754",
  "type": "construct_toy",
  "source": "brickset",
  "sourceId": "31754",
  "title": "75192 Millennium Falcon",
  "titleOriginal": null,
  "description": "Star Wars • Ultimate Collector Series • 7541 pièces",
  "year": 2017,
  "images": {
    "primary": "https://images.brickset.com/sets/large/75192-1.jpg",
    "thumbnail": "https://images.brickset.com/sets/small/75192-1.jpg",
    "gallery": []
  },
  "urls": {
    "source": "https://brickset.com/sets/75192-1",
    "detail": "/api/construction-toys/brickset/31754"
  },
  "details": {
    "brand": "LEGO",
    "theme": "Star Wars",
    "pieceCount": 7541,
    "price": { "amount": 849.99, "currency": "EUR" }
  }
}
```

**Champs communs à tous les types :**

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | ID Tako unique (`source:sourceId`) |
| `type` | string | Type de contenu (voir table ci-dessous) |
| `source` | string | Provider d'origine |
| `sourceId` | string | ID chez le provider |
| `title` | string | Titre principal |
| `titleOriginal` | string? | Titre original (si différent) |
| `description` | string? | Description textuelle |
| `year` | number? | Année de sortie/publication |
| `images` | object | `{ primary, thumbnail, gallery }` |
| `urls` | object | `{ source, detail }` |
| `details` | object | **Spécifique au type** — varie selon le domaine |

### Types de contenu

| `type` | Domaine | Description |
|--------|---------|-------------|
| `construct_toy` | construction-toys | Jouet de construction |
| `book` | books | Livre |
| `comic` | comics | Comic / BD |
| `videogame` | videogames | Jeu vidéo |
| `movie` | media | Film |
| `series` | media | Série TV |
| `anime` | anime-manga | Anime |
| `manga` | anime-manga | Manga |
| `tcg_card` | tcg | Carte à collectionner |
| `collectible` | collectibles | Objet de collection |
| `album` | music | Album musical |
| `board_game` | boardgames | Jeu de société |

### Réponse de recherche

```json
{
  "success": true,
  "provider": "tmdb",
  "domain": "media",
  "query": "matrix",
  "total": 42,
  "count": 20,
  "data": [ /* tableau d'items normalisés */ ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalResults": 42,
    "totalPages": 3,
    "hasMore": true
  },
  "meta": {
    "fetchedAt": "2026-03-04T14:30:00.000Z",
    "lang": "fr",
    "cached": false,
    "cacheAge": null
  }
}
```

### Réponse de détail

```json
{
  "success": true,
  "provider": "tmdb",
  "domain": "media",
  "id": "tmdb:603",
  "data": { /* item normalisé complet */ },
  "meta": {
    "fetchedAt": "2026-03-04T14:30:00.000Z",
    "lang": "fr",
    "cached": true,
    "cacheAge": 3600
  }
}
```

---

## 5. Paramètres communs

Ces paramètres sont disponibles sur **la plupart** des endpoints de recherche :

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `q` | string | *(requis)* | Terme de recherche |
| `lang` | string | `fr` | Code langue ISO 639-1 (`fr`, `en`, `de`, `es`, `it`, `pt`) |
| `autoTrad` | boolean | `false` | Activer la traduction automatique (`1`, `true`) |
| `maxResults` / `max` / `limit` | number | `20` | Nombre max de résultats (max : 100) |
| `page` | number | `1` | Numéro de page |
| `refresh` | boolean | `false` | Ignorer le cache et forcer un appel frais |

> **Note** : Le nom du paramètre de limite varie selon les providers (`maxResults`, `max`, `limit`, `pageSize`). Consultez la section de chaque provider pour le nom exact.

---

## 6. Pagination

Toutes les réponses de recherche incluent un bloc `pagination` :

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalResults": 150,
    "totalPages": 8,
    "hasMore": true
  }
}
```

Pour naviguer entre les pages :

```bash
# Page 1
GET /api/media/tmdb/search/movies?q=star+wars&page=1

# Page 2
GET /api/media/tmdb/search/movies?q=star+wars&page=2
```

---

## 7. Gestion des erreurs

### Codes HTTP

| Code | Signification |
|------|---------------|
| `200` | Succès |
| `400` | Paramètres invalides |
| `404` | Ressource non trouvée |
| `429` | Rate limit du provider externe dépassé |
| `502` | Erreur du provider externe (API down) |
| `504` | Timeout du provider externe |
| `500` | Erreur interne du serveur |

### Format d'erreur

```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Query parameter 'q' is required",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "q", "message": "Required" }
  ]
}
```

### Erreur provider externe

```json
{
  "success": false,
  "error": "ProviderError",
  "message": "TMDB API returned 429: Too Many Requests",
  "code": "PROVIDER_ERROR"
}
```

---

## 8. Headers HTTP

### Headers de réponse

| Header | Description |
|--------|-------------|
| `X-Request-ID` | Identifiant unique de la requête (pour le debug) |
| `X-Cache` | `HIT` ou `MISS` (indique si la réponse vient du cache) |
| `X-Cache-Age` | Âge du cache en secondes |
| `Cache-Control` | Directives de cache HTTP |
| `Content-Encoding` | `gzip` (compression activée) |

### Headers de requête recommandés

```
Accept: application/json
Accept-Language: fr
```

---

## 9. Cache & Performance

Tako API utilise un **cache PostgreSQL** pour les endpoints discovery (trending, popular, charts). Les données sont rafraîchies automatiquement.

| Type d'endpoint | TTL | Refresh auto |
|-----------------|-----|--------------|
| trending, popular, top-rated, charts | 24h | 02:00–04:30 AM |
| upcoming, schedule | 6–12h | Toutes les 6h |

**Impact sur les performances :**

| | Sans cache | Avec cache |
|-|-----------|-----------|
| Latence | 150–5000ms | **~11ms** |
| Gain | — | **14x plus rapide** |

Les réponses cachées incluent dans `meta` :
- `cached: true` — la réponse vient du cache
- `cacheAge: 3600` — âge en secondes

---

## 10. Domaines & Endpoints

### Structure des URLs

```
https://tako.snowmanprod.fr/api/{domain}/{provider}/{endpoint}
```

Exemples :
- `/api/media/tmdb/search/movies?q=matrix`
- `/api/tcg/pokemon/card/base1-4`
- `/api/construction-toys/lego/instructions/75192`

---

### 10.1 Comics / BD

#### ComicVine

> Source : [comicvine.gamespot.com](https://comicvine.gamespot.com)

| Endpoint | Description |
|----------|-------------|
| `GET /api/comics/comicvine/search?q=` | Recherche globale |
| `GET /api/comics/comicvine/search/volumes?q=` | Recherche de séries/volumes |
| `GET /api/comics/comicvine/search/issues?q=` | Recherche de numéros |
| `GET /api/comics/comicvine/search/characters?q=` | Recherche de personnages |
| `GET /api/comics/comicvine/search/publishers?q=` | Recherche d'éditeurs |
| `GET /api/comics/comicvine/search/creators?q=` | Recherche de créateurs |
| `GET /api/comics/comicvine/volume/:id` | Détails d'un volume |
| `GET /api/comics/comicvine/volume/:id/issues` | Issues d'un volume |
| `GET /api/comics/comicvine/issue/:id` | Détails d'un issue |
| `GET /api/comics/comicvine/character/:id` | Détails d'un personnage |
| `GET /api/comics/comicvine/creator/:id` | Détails d'un créateur |
| `GET /api/comics/comicvine/creator/:id/works` | Œuvres d'un créateur |

**Paramètres** : `q`, `maxResults` (max: 100), `page`, `lang`, `autoTrad`

#### Bedetheque

> Source : [bedetheque.com](https://www.bedetheque.com) (scraping)

| Endpoint | Description |
|----------|-------------|
| `GET /api/comics/bedetheque/search?q=` | Recherche globale (séries + auteurs) |
| `GET /api/comics/bedetheque/search/series?q=` | Recherche de séries |
| `GET /api/comics/bedetheque/search/authors?q=` | Recherche d'auteurs |
| `GET /api/comics/bedetheque/search/albums?q=` | Recherche d'albums |
| `GET /api/comics/bedetheque/serie/:id` | Détails d'une série |
| `GET /api/comics/bedetheque/serie/:id/albums` | Albums d'une série |
| `GET /api/comics/bedetheque/author/:id/works` | Œuvres d'un auteur |
| `GET /api/comics/bedetheque/album/:id` | Détails d'un album |

**Paramètres** : `q`, `maxResults`, `lang`, `autoTrad`

---

### 10.2 Books / Livres

#### OpenLibrary

> Source : [openlibrary.org](https://openlibrary.org) — Aucune clé requise

| Endpoint | Description |
|----------|-------------|
| `GET /api/books/openlibrary/search?q=` | Recherche de livres |
| `GET /api/books/openlibrary/search/author?author=` | Livres par auteur |
| `GET /api/books/openlibrary/search/authors?q=` | Recherche d'auteurs |
| `GET /api/books/openlibrary/author/:id` | Détails d'un auteur |
| `GET /api/books/openlibrary/author/:id/works` | Œuvres d'un auteur |
| `GET /api/books/openlibrary/:olId` | Détails d'un livre par ID |

**Paramètres** : `q`, `limit` (max: 100), `offset`, `lang`, `autoTrad`

#### Google Books

> Source : [books.google.com](https://books.google.com)

| Endpoint | Description |
|----------|-------------|
| `GET /api/books/googlebooks/search?q=` | Recherche de livres |
| `GET /api/books/googlebooks/search/author?author=` | Livres par auteur |
| `GET /api/books/googlebooks/:volumeId` | Détails d'un livre |

**Paramètres** : `q`, `maxResults` (max: 40), `startIndex`, `lang`, `autoTrad`

---

### 10.3 Construction Toys / Jouets de construction

#### Brickset

> Source : [brickset.com](https://brickset.com)

| Endpoint | Description |
|----------|-------------|
| `GET /api/construction-toys/brickset/search?q=` | Recherche de sets LEGO |
| `GET /api/construction-toys/brickset/themes` | Liste des thèmes |
| `GET /api/construction-toys/brickset/themes/:theme/subthemes` | Sous-thèmes |
| `GET /api/construction-toys/brickset/years` | Années disponibles |
| `GET /api/construction-toys/brickset/recently-updated` | Sets récemment mis à jour |
| `GET /api/construction-toys/brickset/sets/:id` | Détails d'un set |

**Paramètres** : `q`, `theme`, `year`, `pageSize`, `pageNumber`

#### Rebrickable

> Source : [rebrickable.com](https://rebrickable.com)

| Endpoint | Description |
|----------|-------------|
| `GET /api/construction-toys/rebrickable/search?q=` | Recherche de sets |
| `GET /api/construction-toys/rebrickable/themes` | Liste des thèmes |
| `GET /api/construction-toys/rebrickable/colors` | Liste des couleurs |
| `GET /api/construction-toys/rebrickable/parts?q=` | Recherche de pièces |
| `GET /api/construction-toys/rebrickable/minifigs?q=` | Recherche de minifigs |
| `GET /api/construction-toys/rebrickable/sets/:id` | Détails d'un set |
| `GET /api/construction-toys/rebrickable/sets/:id/parts` | Pièces d'un set |
| `GET /api/construction-toys/rebrickable/sets/:id/minifigs` | Minifigs d'un set |

**Paramètres** : `q`, `theme_id`, `min_year`, `max_year`, `page`, `page_size` (max: 1000)

#### LEGO

> Source : [lego.com](https://www.lego.com) (scraping)

| Endpoint | Description |
|----------|-------------|
| `GET /api/construction-toys/lego/search?q=` | Recherche de sets |
| `GET /api/construction-toys/lego/instructions/:productId` | Instructions PDF |
| `GET /api/construction-toys/lego/:id` | Détails d'un set |

#### Playmobil

> Source : [playmobil.fr](https://www.playmobil.fr) (scraping, ~18s/requête)

| Endpoint | Description |
|----------|-------------|
| `GET /api/construction-toys/playmobil/search?q=` | Recherche de sets |
| `GET /api/construction-toys/playmobil/instructions/:productId` | Instructions PDF |
| `GET /api/construction-toys/playmobil/:id` | Détails d'un set |

#### Klickypedia

> Source : [klickypedia.com](https://www.klickypedia.com) (scraping)

| Endpoint | Description |
|----------|-------------|
| `GET /api/construction-toys/klickypedia/search?q=` | Recherche de sets Playmobil |
| `GET /api/construction-toys/klickypedia/instructions/:id` | Instructions PDF |
| `GET /api/construction-toys/klickypedia/:id` | Détails d'un set |

#### MEGA

> Source : [megabrands.com](https://megabrands.com) + base locale (199 produits archivés)

| Endpoint | Description |
|----------|-------------|
| `GET /api/construction-toys/mega/search?q=` | Recherche de sets |
| `GET /api/construction-toys/mega/categories` | Liste des catégories |
| `GET /api/construction-toys/mega/category/:name` | Sets d'une catégorie |
| `GET /api/construction-toys/mega/instructions/:sku` | Instructions PDF par SKU |
| `GET /api/construction-toys/mega/file/:sku/pdf` | Fichier PDF par SKU |
| `GET /api/construction-toys/mega/file/:sku/image` | Image par SKU |
| `GET /api/construction-toys/mega/:id` | Détails d'un set |

**Paramètres** : `q`, `page`, `pageSize` (max: 100), `category`

#### KRE-O

> Source : base locale PostgreSQL (417 produits archivés — Hasbro KRE-O 2011–2017)

| Endpoint | Description |
|----------|-------------|
| `GET /api/construction-toys/kreo/search?q=` | Recherche de sets |
| `GET /api/construction-toys/kreo/franchises` | Liste des franchises |
| `GET /api/construction-toys/kreo/franchise/:name` | Sets d'une franchise |
| `GET /api/construction-toys/kreo/sublines` | Liste des sous-lignes |
| `GET /api/construction-toys/kreo/file/:setNumber/image` | Image par numéro de set |
| `GET /api/construction-toys/kreo/:id` | Détails d'un set |

**Paramètres** : `q`, `page`, `pageSize` (max: 100), `franchise`, `subLine`

```bash
# Recherche KRE-O
GET /api/construction-toys/kreo/search?q=transformers

# Franchises disponibles
GET /api/construction-toys/kreo/franchises

# Sets d'une franchise
GET /api/construction-toys/kreo/franchise/Transformers
```

---

### 10.4 Anime & Manga

#### Jikan (MyAnimeList)

> Source : [jikan.moe](https://jikan.moe) — Rate limit : 3 req/sec

| Endpoint | Description |
|----------|-------------|
| `GET /api/anime-manga/jikan/search?q=` | Recherche globale (anime + manga) |
| `GET /api/anime-manga/jikan/search/anime?q=` | Recherche anime |
| `GET /api/anime-manga/jikan/search/manga?q=` | Recherche manga |
| `GET /api/anime-manga/jikan/search/characters?q=` | Recherche personnages |
| `GET /api/anime-manga/jikan/search/people?q=` | Recherche personnes (seiyuu, staff) |
| `GET /api/anime-manga/jikan/search/producers?q=` | Recherche studios |
| `GET /api/anime-manga/jikan/anime/:id` | Détails d'un anime |
| `GET /api/anime-manga/jikan/anime/:id/episodes` | Épisodes |
| `GET /api/anime-manga/jikan/anime/:id/characters` | Personnages et doubleurs |
| `GET /api/anime-manga/jikan/anime/:id/staff` | Staff de production |
| `GET /api/anime-manga/jikan/anime/:id/recommendations` | Anime similaires |
| `GET /api/anime-manga/jikan/anime/random` | Anime aléatoire |
| `GET /api/anime-manga/jikan/manga/:id` | Détails d'un manga |
| `GET /api/anime-manga/jikan/manga/:id/characters` | Personnages du manga |
| `GET /api/anime-manga/jikan/manga/:id/recommendations` | Manga similaires |
| `GET /api/anime-manga/jikan/manga/random` | Manga aléatoire |
| `GET /api/anime-manga/jikan/seasons` | Saisons disponibles |
| `GET /api/anime-manga/jikan/seasons/now` | Anime de la saison en cours |
| `GET /api/anime-manga/jikan/seasons/:year/:season` | Anime d'une saison |
| `GET /api/anime-manga/jikan/top/anime` | Top anime |
| `GET /api/anime-manga/jikan/top/manga` | Top manga |
| `GET /api/anime-manga/jikan/top` | Top unifié (anime ou manga) |
| `GET /api/anime-manga/jikan/trending` | Anime de la saison en cours |
| `GET /api/anime-manga/jikan/upcoming` | Anime à venir |
| `GET /api/anime-manga/jikan/schedule` | Planning de diffusion |
| `GET /api/anime-manga/jikan/schedules/:day` | Planning d'un jour |
| `GET /api/anime-manga/jikan/genres/anime` | Genres anime |
| `GET /api/anime-manga/jikan/genres/manga` | Genres manga |
| `GET /api/anime-manga/jikan/characters/:id` | Détails d'un personnage |
| `GET /api/anime-manga/jikan/people/:id` | Détails d'une personne (seiyuu, staff) |
| `GET /api/anime-manga/jikan/producers/:id` | Détails d'un studio |
| `GET /api/anime-manga/jikan/trending/tv` | Trending séries animées |
| `GET /api/anime-manga/jikan/trending/movie` | Trending films animés |
| `GET /api/anime-manga/jikan/top/tv` | Top séries animées |
| `GET /api/anime-manga/jikan/top/movie` | Top films animés |
| `GET /api/anime-manga/jikan/upcoming/tv` | À venir séries animées |
| `GET /api/anime-manga/jikan/upcoming/movie` | À venir films animés |

**Paramètres recherche** : `q`, `limit` (max: 25), `page`, `type`, `score`, `status`, `rating`, `genres`, `orderBy`, `sort`, `sfw` (`1` pour Safe For Work), `lang`, `autoTrad`

**Paramètres top/trending** : `type` (`anime`/`manga`), `filter` (`bypopularity`, `favorite`, `airing`, `publishing`), `subtype`, `limit`, `page`

**Paramètres schedule** : `day` (`monday`…`sunday`, `unknown`)

```bash
# Top anime par popularité
GET /api/anime-manga/jikan/top?type=anime&filter=bypopularity&limit=10

# Anime de la saison en cours
GET /api/anime-manga/jikan/trending?limit=20

# Planning du lundi
GET /api/anime-manga/jikan/schedule?day=monday&limit=15
```

#### MangaUpdates

> Source : [mangaupdates.com](https://www.mangaupdates.com)

| Endpoint | Description |
|----------|-------------|
| `GET /api/anime-manga/mangaupdates/search?q=` | Recherche de séries manga |
| `GET /api/anime-manga/mangaupdates/search/authors?q=` | Recherche d'auteurs |
| `GET /api/anime-manga/mangaupdates/search/publishers?q=` | Recherche d'éditeurs |
| `GET /api/anime-manga/mangaupdates/series/:id` | Détails d'une série |
| `GET /api/anime-manga/mangaupdates/series/:id/recommendations` | Recommandations |
| `GET /api/anime-manga/mangaupdates/author/:id` | Détails d'un auteur |
| `GET /api/anime-manga/mangaupdates/author/:id/works` | Œuvres d'un auteur |
| `GET /api/anime-manga/mangaupdates/publisher/:id` | Détails d'un éditeur |
| `GET /api/anime-manga/mangaupdates/genres` | Liste des genres |
| `GET /api/anime-manga/mangaupdates/releases` | Dernières sorties |

**Paramètres** : `q`, `maxResults`, `page`, `type`, `year`, `genre`, `frenchTitle` (`1` pour titre français via Nautiljon), `lang`, `autoTrad`

---

### 10.5 Media / Films & Séries

#### TMDB

> Source : [themoviedb.org](https://www.themoviedb.org)

| Endpoint | Description |
|----------|-------------|
| `GET /api/media/tmdb/search?q=` | Recherche globale (films + séries) |
| `GET /api/media/tmdb/search/movies?q=` | Recherche de films |
| `GET /api/media/tmdb/search/series?q=` | Recherche de séries |
| `GET /api/media/tmdb/movies/:id` | Détails d'un film |
| `GET /api/media/tmdb/series/:id` | Détails d'une série |
| `GET /api/media/tmdb/series/:id/season/:n` | Détails d'une saison |
| `GET /api/media/tmdb/series/:id/season/:n/episode/:e` | Détails d'un épisode |
| `GET /api/media/tmdb/collections/:id` | Saga/collection de films |
| `GET /api/media/tmdb/persons/:id` | Détails d'une personne |
| `GET /api/media/tmdb/directors/:id/movies` | Filmographie |
| `GET /api/media/tmdb/discover/movies` | Découvrir par critères |
| `GET /api/media/tmdb/trending` | Trending (films/séries) |
| `GET /api/media/tmdb/popular` | Populaires |
| `GET /api/media/tmdb/top-rated` | Mieux notés |
| `GET /api/media/tmdb/upcoming` | À venir |
| `GET /api/media/tmdb/on-the-air` | Séries avec nouveaux épisodes |
| `GET /api/media/tmdb/airing-today` | Séries diffusées aujourd'hui |

**Paramètres trending/popular/top-rated** :
- `category` : `movie` ou `tv` (défaut: `movie`)
- `period` : `day` ou `week` (trending uniquement)
- `limit`, `page`, `lang`, `autoTrad`

> **Attention** : `/trending` utilise `mediaType` tandis que `/popular` et `/top-rated` utilisent `category`.

```bash
# Films trending de la semaine
GET /api/media/tmdb/trending?category=movie&period=week

# Séries populaires
GET /api/media/tmdb/popular?category=tv

# Séries diffusées aujourd'hui
GET /api/media/tmdb/airing-today?limit=10
```

#### TVDB

> Source : [thetvdb.com](https://thetvdb.com)

| Endpoint | Description |
|----------|-------------|
| `GET /api/media/tvdb/search?q=` | Recherche globale |
| `GET /api/media/tvdb/search/movies?q=` | Recherche de films |
| `GET /api/media/tvdb/search/series?q=` | Recherche de séries |
| `GET /api/media/tvdb/movies/:id` | Détails d'un film |
| `GET /api/media/tvdb/series/:id` | Détails d'une série |
| `GET /api/media/tvdb/series/:id/seasons` | Saisons d'une série |
| `GET /api/media/tvdb/seasons/:id` | Détails d'une saison |
| `GET /api/media/tvdb/series/:id/episodes` | Épisodes d'une série |
| `GET /api/media/tvdb/episodes/:id` | Détails d'un épisode |
| `GET /api/media/tvdb/lists/:id` | Détails d'une liste |
| `GET /api/media/tvdb/persons/:id` | Détails d'une personne |
| `GET /api/media/tvdb/directors/:id/works` | Filmographie |

**Paramètres** : `q`, `type` (`series`, `movie`, `person`, `company`), `pageSize` (max: 50), `lang`, `autoTrad`

---

### 10.6 Videogames / Jeux vidéo

#### IGDB

> Source : [igdb.com](https://www.igdb.com) — OAuth2 Twitch

| Endpoint | Description |
|----------|-------------|
| `GET /api/videogames/igdb/search?q=` | Recherche de jeux |
| `POST /api/videogames/igdb/search/advanced` | Recherche avancée |
| `GET /api/videogames/igdb/game/:id` | Détails d'un jeu |
| `GET /api/videogames/igdb/game/slug/:slug` | Jeu par slug |
| `GET /api/videogames/igdb/genres` | Genres |
| `GET /api/videogames/igdb/platforms` | Plateformes |
| `GET /api/videogames/igdb/themes` | Thèmes |
| `GET /api/videogames/igdb/game-modes` | Modes de jeu |
| `GET /api/videogames/igdb/player-perspectives` | Perspectives joueur |
| `GET /api/videogames/igdb/companies/search?q=` | Recherche compagnies |
| `GET /api/videogames/igdb/company/:id` | Détails compagnie |
| `GET /api/videogames/igdb/developer/:id/games` | Jeux développés |
| `GET /api/videogames/igdb/publisher/:id/games` | Jeux publiés |
| `GET /api/videogames/igdb/franchises/search?q=` | Recherche franchises |
| `GET /api/videogames/igdb/franchise/:id` | Détails franchise |
| `GET /api/videogames/igdb/collection/:id` | Détails collection |
| `GET /api/videogames/igdb/top-rated` | Mieux notés |
| `GET /api/videogames/igdb/popular` | Populaires |
| `GET /api/videogames/igdb/recent` | Sorties récentes |
| `GET /api/videogames/igdb/upcoming` | À venir |

**Paramètres recherche avancée** (`POST`) : `platforms`, `genres`, `themes`, `gameModes`, `playerPerspectives`, `minRating`, `releaseYear`

```bash
# Recherche avancée : RPG sur PC, note > 80
POST /api/videogames/igdb/search/advanced  (body: {"platforms": [6], "genres": [12], "minRating": 80})

# Jeux populaires
GET /api/videogames/igdb/popular?limit=20
```

#### RAWG

> Source : [rawg.io](https://rawg.io)

| Endpoint | Description |
|----------|-------------|
| `GET /api/videogames/rawg/search?q=` | Recherche de jeux |
| `POST /api/videogames/rawg/search/advanced` | Recherche avancée |
| `GET /api/videogames/rawg/game/:idOrSlug` | Détails d'un jeu |
| `GET /api/videogames/rawg/game/:idOrSlug/screenshots` | Screenshots |
| `GET /api/videogames/rawg/game/:idOrSlug/stores` | Magasins du jeu |
| `GET /api/videogames/rawg/game/:idOrSlug/series` | Jeux de la série |
| `GET /api/videogames/rawg/game/:idOrSlug/additions` | DLCs |
| `GET /api/videogames/rawg/game/:idOrSlug/achievements` | Achievements |
| `GET /api/videogames/rawg/game/:idOrSlug/movies` | Trailers |
| `GET /api/videogames/rawg/genres` | Genres |
| `GET /api/videogames/rawg/genre/:idOrSlug` | Détails d'un genre |
| `GET /api/videogames/rawg/platforms` | Plateformes |
| `GET /api/videogames/rawg/platforms/parents` | Plateformes parentes |
| `GET /api/videogames/rawg/tags` | Tags |
| `GET /api/videogames/rawg/stores` | Magasins |
| `GET /api/videogames/rawg/developers` | Développeurs |
| `GET /api/videogames/rawg/developer/:idOrSlug` | Détails développeur |
| `GET /api/videogames/rawg/developer/:idOrSlug/games` | Jeux d'un dev |
| `GET /api/videogames/rawg/publishers` | Éditeurs |
| `GET /api/videogames/rawg/publisher/:idOrSlug` | Détails éditeur |
| `GET /api/videogames/rawg/publisher/:idOrSlug/games` | Jeux d'un éditeur |
| `GET /api/videogames/rawg/creators` | Créateurs |
| `GET /api/videogames/rawg/creator/:idOrSlug` | Détails créateur |
| `GET /api/videogames/rawg/top-rated` | Mieux notés |
| `GET /api/videogames/rawg/popular` | Populaires |
| `GET /api/videogames/rawg/trending` | Trending |
| `GET /api/videogames/rawg/recent` | Sorties récentes |
| `GET /api/videogames/rawg/upcoming` | À venir |

**Paramètres recherche avancée** (`POST`) : `platforms`, `genres`, `tags`, `developers`, `publishers`, `stores`, `dates`, `metacritic`, `ordering`

#### JVC (JeuxVideo.com)

> Source : [jeuxvideo.com](https://www.jeuxvideo.com) (scraping, contenu français natif)

| Endpoint | Description |
|----------|-------------|
| `GET /api/videogames/jvc/search?q=` | Recherche de jeux |
| `GET /api/videogames/jvc/game/:id` | Détails (notes JVC + users, PEGI) |

#### ConsoleVariations

> Source : [consolevariations.com](https://consolevariations.com) (scraping, éditions de consoles)

| Endpoint | Description |
|----------|-------------|
| `GET /api/videogames/consolevariations/search?q=&type=` | Recherche (`type`: all, consoles, controllers, accessories) |
| `GET /api/videogames/consolevariations/details?url=` | Détails par URL |
| `GET /api/videogames/consolevariations/item/:slug` | Détails par slug |
| `GET /api/videogames/consolevariations/platforms` | Marques |
| `GET /api/videogames/consolevariations/platforms?brand=` | Plateformes d'une marque |
| `GET /api/videogames/consolevariations/browse/:platform` | Browse par plateforme |

---

### 10.7 BoardGames / Jeux de société

#### BoardGameGeek (BGG)

> Source : [boardgamegeek.com](https://boardgamegeek.com) — Format XML avec parser intégré

| Endpoint | Description |
|----------|-------------|
| `GET /api/boardgames/bgg/search?q=` | Recherche de jeux |
| `GET /api/boardgames/bgg/search/category?q=` | Recherche par catégorie |
| `GET /api/boardgames/bgg/game/:id` | Détails (joueurs, durée, complexité) |

**Paramètres** : `q`, `limit`, `autoTrad`, `targetLang` (`fr`, `de`, `es`, `it`)

```bash
# Recherche avec traduction
GET /api/boardgames/bgg/game/13?autoTrad=1&targetLang=fr
```

---

### 10.8 Collectibles / Objets de collection

#### Coleka

> Source : [coleka.com](https://www.coleka.com) (scraping, base collaborative)

| Endpoint | Description |
|----------|-------------|
| `GET /api/collectibles/coleka/search?q=&category=` | Recherche (catégories : lego, funko, figurines…) |
| `GET /api/collectibles/coleka/details?url=` | Détails par URL |
| `GET /api/collectibles/coleka/item/:path` | Détails par path |
| `GET /api/collectibles/coleka/categories` | Liste des catégories |

#### Lulu-Berlu

> Source : [lulu-berlu.com](https://www.lulu-berlu.com) (scraping, figurines vintage)

| Endpoint | Description |
|----------|-------------|
| `GET /api/collectibles/luluberlu/search?q=` | Recherche de figurines |
| `GET /api/collectibles/luluberlu/details?url=` | Détails par URL |
| `GET /api/collectibles/luluberlu/item/:path` | Détails par path |

#### Transformerland

> Source : [transformerland.com](https://www.transformerland.com) (scraping, guide Transformers)

| Endpoint | Description |
|----------|-------------|
| `GET /api/collectibles/transformerland/search?q=` | Recherche de jouets |
| `GET /api/collectibles/transformerland/details?id=` | Détails par toy ID ou URL |
| `GET /api/collectibles/transformerland/item/:id` | Détails par ID |

#### Carddass (Archive locale)

> Sources : [animecollection.fr](http://www.animecollection.fr) + [dbzcollection.fr](http://www.dbzcollection.fr)  
> **122 200 cartes** (31 685 animecollection + 90 515 dbzcollection) — **219 093 images** (9,8 Go)

| Endpoint | Description |
|----------|-------------|
| `GET /api/collectibles/carddass/stats` | Statistiques (par site et licence) |
| `GET /api/collectibles/carddass/search?q=` | Recherche full-text |
| `GET /api/collectibles/carddass/licenses` | Liste des licences |
| `GET /api/collectibles/carddass/licenses/:id` | Détail d'une licence |
| `GET /api/collectibles/carddass/licenses/:id/collections` | Collections d'une licence |
| `GET /api/collectibles/carddass/collections/:id/series` | Séries d'une collection |
| `GET /api/collectibles/carddass/series/:id/cards` | Cartes d'une série |
| `GET /api/collectibles/carddass/cards/:id` | Détail carte (hiérarchie complète) |
| `GET /api/collectibles/carddass/cards/:id/images` | Images d'une carte |

**Paramètres spécifiques** :
- `site` : `animecollection` ou `dbzcollection` — filtre par source
- `rarity`, `license`, `max` (max: 100), `page`

```bash
# Recherche globale
GET /api/collectibles/carddass/search?q=goku&max=10

# Filtrer par site
GET /api/collectibles/carddass/search?q=vegeta&site=dbzcollection

# Statistiques
GET /api/collectibles/carddass/stats
```

---

### 10.9 TCG / Jeux de cartes à collectionner

#### Pokémon TCG

> Source : [pokemontcg.io](https://pokemontcg.io)

| Endpoint | Description |
|----------|-------------|
| `GET /api/tcg/pokemon/search?q=` | Recherche de cartes |
| `GET /api/tcg/pokemon/card/:id` | Détails (attaques, prix, légalité) |
| `GET /api/tcg/pokemon/sets` | Liste des sets |

**Paramètres recherche** : `q`, `set`, `type`, `rarity`, `supertype`, `subtype`, `max`, `page`, `lang`, `autoTrad`

```bash
# Pikachu rares Lightning
GET /api/tcg/pokemon/search?q=pikachu&rarity=Rare&type=Lightning

# Carte par ID
GET /api/tcg/pokemon/card/base1-4
```

#### Magic: The Gathering (MTG)

> Source : [Scryfall API](https://api.scryfall.com) — Syntaxe Scryfall complète supportée

| Endpoint | Description |
|----------|-------------|
| `GET /api/tcg/mtg/search?q=` | Recherche de cartes |
| `GET /api/tcg/mtg/card/:id` | Détails (prix USD/EUR, légalités) |
| `GET /api/tcg/mtg/sets` | Liste des sets (~1028) |

**Paramètres** : `q`, `lang`, `max` (max: 175), `order`, `unique`, `dir`, `autoTrad`

```bash
# Recherche avancée Scryfall
GET /api/tcg/mtg/search?q=mv=1+type:instant+color:r

# Carte par set/numéro
GET /api/tcg/mtg/card/clu/141
```

#### Yu-Gi-Oh!

> Source : [YGOPRODeck](https://db.ygoprodeck.com)

| Endpoint | Description |
|----------|-------------|
| `GET /api/tcg/yugioh/search?q=` | Recherche de cartes |
| `GET /api/tcg/yugioh/card/:id` | Détails (banlist, prix multi-sources) |
| `GET /api/tcg/yugioh/sets` | Liste des sets |
| `GET /api/tcg/yugioh/archetype?name=` | Cartes d'un archétype |

**Paramètres** : `q`, `type`, `race`, `attribute`, `level`, `archetype`, `max`, `sort`, `lang`, `autoTrad`

```bash
# Recherche par archétype
GET /api/tcg/yugioh/archetype?name=Blue-Eyes&max=20
```

#### Dragon Ball Super Card Game (DBS)

> Sources : DeckPlanet API (Masters) + dbs-cardgame.com (Fusion World)  
> **7 902 cartes** stockées localement (6 213 Masters + 1 689 Fusion World)

| Endpoint | Description |
|----------|-------------|
| `GET /api/tcg/dbs/search?q=` | Recherche de cartes |
| `GET /api/tcg/dbs/card/:id` | Détails d'une carte |
| `GET /api/tcg/dbs/sets` | Liste des sets |
| `GET /api/tcg/dbs/sets/:code` | Détail d'un set avec cartes |
| `GET /api/tcg/dbs/stats` | Statistiques |

**Paramètres** : `q`, `game` (`masters`/`fusion_world`), `color`, `type`, `rarity`, `set`, `max`, `page`

```bash
# Goku dans Fusion World
GET /api/tcg/dbs/search?q=Goku&game=fusion_world

# Leaders rouges
GET /api/tcg/dbs/search?q=*&type=LEADER&color=Red
```

#### Autres TCG

Les providers suivants sont également disponibles :

| Provider | Base URL | Source | Endpoints |
|----------|----------|--------|-----------|
| **Lorcana** | `/api/tcg/lorcana/` | lorcanaplayer.com | `search`, `card/:id`, `sets` |
| **Digimon** | `/api/tcg/digimon/` | digimoncard.io | `search`, `card/:id` |
| **One Piece** | `/api/tcg/onepiece/` | en.onepiece-cardgame.com | `search`, `card/:id` |

> **Note** : Digimon et One Piece ne disposent pas d'endpoint `/sets`. Seuls Lorcana, Pokémon, MTG, Yu-Gi-Oh! et DBS proposent la liste des sets.

---

### 10.10 Music / Musique

#### Discogs

> Source : [discogs.com](https://www.discogs.com) — Rate limit : 25-60 req/min

| Endpoint | Description |
|----------|-------------|
| `GET /api/music/discogs/search?q=` | Recherche globale |
| `GET /api/music/discogs/search/albums?q=` | Recherche releases |
| `GET /api/music/discogs/search/masters?q=` | Recherche masters |
| `GET /api/music/discogs/search/artists?q=` | Recherche artistes |
| `GET /api/music/discogs/search/labels?q=` | Recherche labels |
| `GET /api/music/discogs/barcode/:barcode` | Recherche par code-barres |
| `GET /api/music/discogs/releases/:id` | Détails release |
| `GET /api/music/discogs/masters/:id` | Détails master |
| `GET /api/music/discogs/masters/:id/versions` | Versions d'un master |
| `GET /api/music/discogs/artists/:id` | Détails artiste |
| `GET /api/music/discogs/artists/:id/releases` | Discographie |
| `GET /api/music/discogs/labels/:id` | Détails label |
| `GET /api/music/discogs/labels/:id/releases` | Releases d'un label |

#### Deezer

> Source : [deezer.com](https://www.deezer.com) — Aucune clé requise

| Endpoint | Description |
|----------|-------------|
| `GET /api/music/deezer/search?q=` | Recherche globale |
| `GET /api/music/deezer/search/albums?q=` | Recherche albums |
| `GET /api/music/deezer/search/artists?q=` | Recherche artistes |
| `GET /api/music/deezer/search/tracks?q=` | Recherche tracks |
| `GET /api/music/deezer/albums/:id` | Détails album |
| `GET /api/music/deezer/albums/:id/tracks` | Tracks d'un album |
| `GET /api/music/deezer/artists/:id` | Détails artiste |
| `GET /api/music/deezer/artists/:id/top` | Top tracks |
| `GET /api/music/deezer/artists/:id/albums` | Albums |
| `GET /api/music/deezer/artists/:id/related` | Artistes similaires |
| `GET /api/music/deezer/tracks/:id` | Détails track |
| `GET /api/music/deezer/genres` | Genres |
| `GET /api/music/deezer/charts` | Charts (albums/tracks/artists) |
| `GET /api/music/deezer/chart/albums` | Charts albums |
| `GET /api/music/deezer/chart/tracks` | Charts tracks |
| `GET /api/music/deezer/chart/artists` | Charts artistes |

**Paramètres charts** : `category` (`albums`, `tracks`, `artists`), `limit`

> Les routes dédiées `/chart/albums`, `/chart/tracks`, `/chart/artists` permettent d'accéder directement à une catégorie spécifique.

#### MusicBrainz

> Source : [musicbrainz.org](https://musicbrainz.org) — Rate limit : 1 req/sec

| Endpoint | Description |
|----------|-------------|
| `GET /api/music/musicbrainz/search?q=` | Recherche globale |
| `GET /api/music/musicbrainz/search/albums?q=` | Recherche albums |
| `GET /api/music/musicbrainz/search/artists?q=` | Recherche artistes |
| `GET /api/music/musicbrainz/barcode/:barcode` | Recherche par code-barres |
| `GET /api/music/musicbrainz/albums/:id` | Détails album |
| `GET /api/music/musicbrainz/albums/:id/cover` | Pochette (Cover Art Archive) |
| `GET /api/music/musicbrainz/artists/:id` | Détails artiste |
| `GET /api/music/musicbrainz/artists/:id/albums` | Albums d'un artiste |

#### iTunes

> Source : [itunes.apple.com](https://itunes.apple.com)

| Endpoint | Description |
|----------|-------------|
| `GET /api/music/itunes/search?q=` | Recherche globale |
| `GET /api/music/itunes/search/albums?q=` | Recherche albums |
| `GET /api/music/itunes/search/artists?q=` | Recherche artistes |
| `GET /api/music/itunes/search/tracks?q=` | Recherche tracks |
| `GET /api/music/itunes/albums/:id` | Détails album + tracks |
| `GET /api/music/itunes/artists/:id` | Détails artiste |
| `GET /api/music/itunes/artists/:id/albums` | Albums |
| `GET /api/music/itunes/tracks/:id` | Détails track |
| `GET /api/music/itunes/charts` | Charts par pays |

**Paramètres charts** : `category` (`album`, `song`), `country` (`fr`, `us`, `gb`…), `limit`

---

### 10.11 E-commerce

#### Amazon

> Source : 8 marketplaces Amazon (scraping)

| Marketplace | Code | Devise |
|-------------|------|--------|
| France | `fr` | EUR |
| USA | `us` | USD |
| UK | `uk` | GBP |
| Allemagne | `de` | EUR |
| Espagne | `es` | EUR |
| Italie | `it` | EUR |
| Canada | `ca` | CAD |
| Japon | `jp` | JPY |

| Endpoint | Description |
|----------|-------------|
| `GET /api/ecommerce/amazon/marketplaces` | Liste des marketplaces |
| `GET /api/ecommerce/amazon/categories` | Catégories (all, videogames, toys…) |
| `GET /api/ecommerce/amazon/search?q=&country=&category=` | Recherche produits |
| `GET /api/ecommerce/amazon/product/:asin?country=` | Détails par ASIN |
| `GET /api/ecommerce/amazon/compare/:asin?countries=` | Comparaison prix multi-pays |

```bash
# Recherche LEGO sur Amazon France
GET /api/ecommerce/amazon/search?q=lego&country=fr&limit=10

# Comparaison de prix
GET /api/ecommerce/amazon/compare/B01N6CJ1QW?countries=fr,us,uk,de
```

> **Note** : Temps de réponse élevé (3–10s) dû au scraping. Limiter à 1 requête / 3 secondes.

---

### 10.12 Sticker-Albums

#### Paninimania

> Source : [paninimania.com](https://www.paninimania.com) (scraping, albums Panini)

| Endpoint | Description |
|----------|-------------|
| `GET /api/sticker-albums/paninimania/search?q=` | Recherche d'albums |
| `GET /api/sticker-albums/paninimania/details?id=` | Détails avec checklist |
| `GET /api/sticker-albums/paninimania/album/:id` | Détails par ID |

> **Note** : Paninimania est monté sous le domaine `/api/sticker-albums` et non sous `/api/collectibles`.

---

## 11. Endpoints Discovery (Trending/Popular/Charts)
op/tv` | Jikan | Top séries animées |
| `GET /api/anime-manga/jikan/top/movie` | Jikan | Top films animés |
| `GET /api/anime-manga/jikan/trending` | Jikan | Anime de la saison |
| `GET /api/anime-manga/jikan/trending/tv` | Jikan | Trending séries animées |
| `GET /api/anime-manga/jikan/trending/movie` | Jikan | Trending films animés |
| `GET /api/anime-manga/jikan/upcoming` | Jikan | Anime à venir |
| `GET /api/anime-manga/jikan/upcoming/tv` | Jikan | À venir séries animées |
| `GET /api/anime-manga/jikan/upcoming/movie` | Jikan | À venir films animésr automatiquement. Réponse ultra-rapide (~11ms).

| Endpoint | Provider | Description |
|----------|----------|-------------|
| `GET /api/media/tmdb/trending` | Deezer | Charts globaux |
| `GET /api/music/deezer/chart/albums` | Deezer | Charts albums |
| `GET /api/music/deezer/chart/tracks` | Deezer | Charts tracks |
| `GET /api/music/deezer/chart/artists` | Deezer | Charts artistems trending |
| `GET /api/media/tmdb/trending?category=tv&period=day` | TMDB | Séries trending |
| `GET /api/media/tmdb/popular?category=movie` | TMDB | Films populaires |
| `GET /api/media/tmdb/popular?category=tv` | TMDB | Séries populaires |
| `GET /api/media/tmdb/top-rated?category=movie` | TMDB | Films mieux notés |
| `GET /api/media/tmdb/top-rated?category=tv` | TMDB | Séries mieux notées |
| `GET /api/media/tmdb/upcoming` | TMDB | Films à venir |
| `GET /api/media/tmdb/on-the-air` | TMDB | Séries en cours |
| `GET /api/media/tmdb/airing-today` | TMDB | Séries du jour |
| `GET /api/anime-manga/jikan/top?type=anime` | Jikan | Top anime |
| `GET /api/anime-manga/jikan/top?type=manga` | Jikan | Top manga |
| `GET /api/anime-manga/jikan/trending` | Jikan | Anime de la saison |
| `GET /api/anime-manga/jikan/upcoming` | Jikan | Anime à venir |
| `GET /api/videogames/rawg/popular` | RAWG | Jeux populaires |
| `GET /api/videogames/rawg/trending` | RAWG | Jeux trending |
| `GET /api/videogames/igdb/popular` | IGDB | Jeux populaires |
| `GET /api/music/deezer/charts?category=albums` | Deezer | Charts albums |
| `GET /api/music/itunes/charts?category=album&country=fr` | iTunes | Top albums FR |

---

## 12. Cache Admin

| Endpoint | Description |
|----------|-------------|
| `GET /api/cache/stats` | Statistiques globales du cache |
| `POST /api/cache/refresh/:provider` | Force refresh d'un provider |
| `POST /api/cache/refresh?batchSize=10` | Refresh des entrées expirées |
| `DELETE /api/cache/clear` | Vide tout le cache |

```bash
# Statistiques
curl https://tako.snowmanprod.fr/api/cache/stats

# Force refresh TMDB
curl -X POST https://tako.snowmanprod.fr/api/cache/refresh/tmdb
```

---

## 13. Fichiers statiques (images, PDFs)

Les archives locales (MEGA, KRE-O, Carddass, DBS) servent directement les images et PDFs.

**Base URL fichiers** : `https://tako.snowmanprod.fr/files/`

| Archive | Contenu | Exemple |
|---------|---------|---------|
| `mega-archive/` | 199 produits MEGA | `/files/mega-archive/HNH57/main.webp` |
| `kreo-archive/` | 417 produits KRE-O | `/files/kreo-archive/A6951/main.webp` |
| `carddass-archive/` | 219 093 images de cartes | `/files/carddass-archive/animecollection/...` |
| `dbs-archive/` | 8 362 images DBS | `/files/dbs-archive/masters/BT1/BT1-001.webp` |

> Les URLs d'images sont directement incluses dans les réponses API dans les champs `image`, `thumbnail`, `images.primary`, etc.

---

## 14. Traduction automatique

La plupart des endpoints supportent la traduction automatique via deux paramètres :

| Paramètre | Valeurs | Description |
|-----------|---------|-------------|
| `lang` | `fr`, `en`, `de`, `es`, `it`, `pt` | Langue cible |
| `autoTrad` | `1`, `true` | Activer la traduction |

```bash
# Détails d'un jeu IGDB traduit en français
GET /api/videogames/igdb/game/1074?lang=fr&autoTrad=1

# Top anime avec traduction
GET /api/anime-manga/jikan/top?type=anime&autoTrad=1&lang=fr
```

> La traduction est intégrée côté serveur (google-translate-api-x). Certains providers (TMDB, TVDB) supportent nativement le français via `lang=fr` sans besoin d'`autoTrad`.

---

## 15. Limites & Bonnes pratiques

### Performances attendues

| Type de requête | Latence typique |
|-----------------|-----------------|
| Endpoint discovery (cache) | ~11ms |
| Recherche via API externe | 150ms–2s |
| Endpoint scraping (FlareSolverr) | 3–18s |
| Amazon (scraping) | 3–10s |

### Bonnes pratiques

1. **Exploitez les endpoints discovery** pour le contenu trending/popular — ils sont pré-cachés et quasi instantanés
2. **Cachez côté client** : les données products/détails changent rarement, cachez 1h minimum
3. **Utilisez `detailUrl`** : les réponses de recherche incluent un champ `detailUrl` ou `urls.detail` — utilisez-le pour récupérer les détails complets
4. **Limitez les résultats** : ne demandez que ce dont vous avez besoin (`limit=10` plutôt que 100)
5. **Gérez les erreurs 502/504** : les APIs externes peuvent être indisponibles temporairement — implémentez un retry avec backoff
6. **Respectez les providers scraped** : LEGO, Playmobil, Amazon sont plus lents (scraping) — ne les interrogez pas en boucle

### Providers les plus fiables

| Provider | Fiabilité | Vitesse | Notes |
|----------|-----------|---------|-------|
| TMDB | ★★★★★ | Rapide | Excellent pour films/séries |
| Jikan | ★★★★☆ | Rapide | Rate limit 3 req/sec |
| IGDB | ★★★★☆ | Rapide | Max 10 résultats pour popular |
| Pokémon TCG | ★★★★☆ | Moyen | API parfois lente |
| Scryfall (MTG) | ★★★★★ | Rapide | Syntaxe puissante |
| Deezer | ★★★★★ | Rapide | Pas de clé |
| Carddass (local) | ★★★★★ | Instantané | Base locale |
| DBS (local) | ★★★★★ | Instantané | Base locale |

---

## 16. Exemples d'intégration

### Application React — Page d'accueil

```javascript
const BASE = 'https://tako.snowmanprod.fr';

async function loadHomePage() {
  // Charger en parallèle les contenus trending (ultra rapide grâce au cache)
  const [movies, anime, games] = await Promise.all([
    fetch(`${BASE}/api/media/tmdb/trending?category=movie&limit=10`).then(r => r.json()),
    fetch(`${BASE}/api/anime-manga/jikan/trending?limit=10`).then(r => r.json()),
    fetch(`${BASE}/api/videogames/igdb/popular?limit=10`).then(r => r.json()),
  ]);

  return {
    trendingMovies: movies.data,
    trendingAnime: anime.data,
    popularGames: games.data,
  };
}
```

### Application React — Recherche multi-domaine

```javascript
async function searchAll(query) {
  const [movies, games, manga] = await Promise.all([
    fetch(`${BASE}/api/media/tmdb/search?q=${query}&limit=5`).then(r => r.json()),
    fetch(`${BASE}/api/videogames/igdb/search?q=${query}&limit=5`).then(r => r.json()),
    fetch(`${BASE}/api/anime-manga/jikan/search?q=${query}&limit=5`).then(r => r.json()),
  ]);
  
  return { movies: movies.data, games: games.data, manga: manga.data };
}
```

### Application mobile — Scan code-barres

```javascript
async function scanBarcode(barcode) {
  // Chercher d'abord dans Discogs (musique)
  const discogs = await fetch(`${BASE}/api/music/discogs/barcode/${barcode}`).then(r => r.json());
  if (discogs.success && discogs.data.length > 0) return discogs;

  // Puis dans MusicBrainz
  const mb = await fetch(`${BASE}/api/music/musicbrainz/barcode/${barcode}`).then(r => r.json());
  return mb;
}
```

### Script Python — Exporter des cartes Pokémon

```python
import requests

BASE = "https://tako.snowmanprod.fr"

# Récupérer tous les sets
sets = requests.get(f"{BASE}/api/tcg/pokemon/sets").json()["data"]
print(f"Nombre de sets : {len(sets)}")

# Chercher les cartes Charizard
cards = requests.get(f"{BASE}/api/tcg/pokemon/search", params={
    "q": "charizard",
    "max": 50,
    "lang": "fr"
}).json()

for card in cards["data"]:
    meta = card.get("metadata", {})
    price = card.get("prices", {})
    print(f"{card['title']} | {meta.get('rarity')} | {meta.get('set', {}).get('name')} | ${price.get('market', 'N/A')}")
```

---

## 17. FAQ

### L'API est-elle gratuite ?
Oui, Tako API est entièrement gratuite et ne nécessite aucune authentification côté client.

### Quels formats sont supportés ?
Toutes les réponses sont en **JSON**. Le Content-Type est `application/json`.

### Est-ce que l'API est rate-limitée ?
Tako API elle-même n'a pas de rate limit. Cependant, les providers en amont ont leurs propres limites. En cas de dépassement, vous recevrez une erreur `429`.

### Comment savoir si une réponse vient du cache ?
Vérifiez le header `X-Cache` (`HIT`/`MISS`) ou le champ `meta.cached` dans la réponse JSON.

### Les images sont-elles hébergées par Tako API ?
Pour les archives locales (MEGA, KRE-O, Carddass, DBS), oui — les images sont servies directement depuis `https://tako.snowmanprod.fr/files/`. Pour les autres providers, les URLs pointent vers les sources originales (TMDB, pokemontcg.io, etc.).

### Comment obtenir des prix de cartes ?
Les providers TCG incluent les prix dans les détails :
- **Pokémon TCG** : TCGPlayer (USD) + Cardmarket (EUR)
- **MTG** : Scryfall (USD, EUR, MTGO Tix)
- **Yu-Gi-Oh!** : Cardmarket, TCGPlayer, eBay, Amazon, CoolStuffInc
7 providers, 12
### Puis-je utiliser l'API en production ?
Oui. L'API est accessible en production sur `https://tako.snowmanprod.fr` avec un certificat TLS Let's Encrypt valide.

---

## Endpoints de contrôle
7 providers, 12
| Endpoint | Description |
|----------|-------------|
| `GET /health` | Statut de l'API, version, uptime |
| `GET /version` | Nom, version, environment |
| `GET /docs` | Liste des specs OpenAPI disponibles |

---

> **Tako API v2.6.0** — 37 providers, 12 domaines, 130 102 cartes archivées  
> Pour toute question, consultez le repo [Nimai26/Tako_Api](https://github.com/Nimai26/Tako_Api)
