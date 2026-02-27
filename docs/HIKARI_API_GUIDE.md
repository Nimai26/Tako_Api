# 📘 Guide API Tako pour Hikari

**Version API** : 2.0.1  
**Date** : 27 février 2026  
**URL de base** : `http://localhost:3000` (ou votre URL de déploiement)

---

## 🎯 Vue d'ensemble

Tako API est une API REST unifiée qui agrège **14 providers** (LEGO, TMDB, Jikan, RAWG, etc.) dans **11 domaines** (construction-toys, media, comics, books, etc.).

**Tous les providers** retournent maintenant un format JSON standardisé avec:
- Structure uniforme `{ success, provider, domain, id, data, meta }`
- Paramètres cohérents (`lang`, `autoTrad`, `max`)
- Zéro perte de données (migration v2.0.1 complète)

---

## 📑 Table des matières

1. [Format des Réponses](#-format-des-réponses)
2. [Paramètres Globaux](#-paramètres-globaux)
3. [Authentification & Rate Limits](#-authentification--rate-limits)
4. [Domaines & Providers](#-domaines--providers)
   - [Construction Toys](#1-construction-toys)
   - [Books](#2-books)
   - [Comics](#3-comics)
   - [Media (Films/Séries)](#4-media-filmstv)
   - [Anime-Manga](#5-anime-manga)
   - [Videogames](#6-videogames)
   - [Music](#7-music)
   - [E-commerce](#8-e-commerce)
   - [TCG](#9-tcg-trading-card-games)
   - [Collectibles](#10-collectibles)
   - [BoardGames](#11-boardgames)
5. [Traduction Automatique](#-traduction-automatique)
6. [Gestion des Erreurs](#-gestion-des-erreurs)
7. [Bonnes Pratiques](#-bonnes-pratiques)
8. [Exemples Complets](#-exemples-complets)

---

## 📦 Format des Réponses

### Format de Recherche (v2.0.1)

```json
{
  "success": true,
  "provider": "lego",
  "domain": "construction-toys",
  "query": "millennium falcon",
  "total": 42,
  "count": 20,
  
  "data": [
    {
      "id": "lego:75192",
      "sourceId": "75192",
      "source": "lego",
      "type": "construct_toy",
      "title": "Millennium Falcon",
      "description": "...",
      "images": {
        "primary": "https://...",
        "thumbnail": "https://..."
      },
      "urls": {
        "source": "https://...",
        "detail": "/api/construction-toys/lego/75192"
      },
      "year": 2017,
      "metadata": { /* données spécifiques au provider */ }
    }
  ],
  
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalResults": 42,
    "totalPages": 3,
    "hasMore": true
  },
  
  "meta": {
    "fetchedAt": "2026-02-27T14:30:00.000Z",
    "lang": "fr",
    "cached": false,
    "cacheAge": null
  }
}
```

### Format de Détails (v2.0.1)

```json
{
  "success": true,
  "provider": "lego",
  "domain": "construction-toys",
  "id": "lego:75192",
  
  "data": {
    "id": "lego:75192",
    "sourceId": "75192",
    "source": "lego",
    "provider": "lego",
    "type": "construct_toy",
    "title": "Millennium Falcon",
    "description": "...",
    "year": 2017,
    "images": { /* ... */ },
    "urls": { /* ... */ },
    
    /* Tous les champs spécifiques préservés */
    "brand": "LEGO",
    "theme": "Star Wars",
    "pieceCount": 7541,
    "price": { "amount": 849.99, "currency": "EUR" },
    /* ... autres champs selon le provider */
  },
  
  "meta": {
    "fetchedAt": "2026-02-27T14:30:00.000Z",
    "lang": "fr",
    "cached": true,
    "cacheAge": 3600
  }
}
```

### Champs Communs à Tous les Providers

| Champ | Type | Description | Toujours présent |
|-------|------|-------------|------------------|
| `id` | string | ID global Tako (`source:sourceId`) | ✅ |
| `sourceId` | string | ID chez le provider | ✅ |
| `source` | string | Nom du provider | ✅ |
| `provider` | string | Nom du provider (alias de source) | ✅ |
| `type` | string | Type de contenu | ✅ |
| `title` | string | Titre principal | ✅ |
| `description` | string\|null | Description | ⚠️ |
| `images` | object | URLs des images | ✅ |
| `urls.source` | string | URL chez le provider | ✅ |
| `urls.detail` | string | URL de l'endpoint détail | ✅ |
| `year` | number\|null | Année | ⚠️ |
| `metadata` | object | Données spécifiques | ✅ |

✅ = Toujours présent | ⚠️ = Peut être null

---

## ⚙️ Paramètres Globaux

### Paramètres de Recherche

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `q` | string | - | **REQUIS** - Terme de recherche |
| `max` | number | 20 | Nombre max de résultats (1-100) |
| `page` | number | 1 | Numéro de page pour pagination |
| `lang` | string | `fr` | Code langue (2 lettres: fr, en, de, es, it, pt, ja) |
| `autoTrad` | boolean | false | Activer traduction automatique |
| `refresh` | boolean | false | Forcer le refresh du cache |

**Exemples** :
```bash
# Recherche simple
GET /api/books/googlebooks/search?q=tolkien

# Avec pagination
GET /api/books/googlebooks/search?q=tolkien&max=10&page=2

# Avec traduction française
GET /api/books/googlebooks/search?q=tolkien&lang=fr&autoTrad=true

# Force le refresh cache
GET /api/books/googlebooks/search?q=tolkien&refresh=true
```

### Paramètres de Détails

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `lang` | string | `fr` | Code langue (2 lettres) |
| `autoTrad` | boolean | false | Activer traduction automatique |
| `refresh` | boolean | false | Forcer le refresh du cache |

**Exemples** :
```bash
# Détails simple
GET /api/books/googlebooks/12345

# Avec traduction anglaise
GET /api/books/googlebooks/12345?lang=en&autoTrad=true
```

### Valeurs Acceptées pour `autoTrad`

Toutes ces valeurs activent la traduction :
- `autoTrad=true`
- `autoTrad=1`
- `autoTrad="true"`
- `autoTrad="1"`

### Codes Langue Supportés

| Code | Langue | Disponibilité |
|------|--------|---------------|
| `fr` | Français | Tous providers |
| `en` | Anglais | Tous providers |
| `de` | Allemand | Plupart |
| `es` | Espagnol | Plupart |
| `it` | Italien | Plupart |
| `pt` | Portugais | Plupart |
| `ja` | Japonais | Anime-Manga uniquement |
| `ko` | Coréen | Certains providers |

---

## 🔐 Authentification & Rate Limits

### Providers sans Clé API

Ces providers fonctionnent sans configuration :
- **OpenLibrary** (Books)
- **Bedetheque** (Comics) - via FlareSolverr
- **LEGO** (Construction-toys) - via FlareSolverr
- **Playmobil** (Construction-toys) - via FlareSolverr
- **Klickypedia** (Construction-toys)
- **MEGA** (Construction-toys)
- **MangaUpdates** (Anime-Manga)
- **Jikan** (Anime-Manga)
- **MusicBrainz** (Music)

### Providers avec Clé API Optionnelle

| Provider | Variable ENV | Limite sans clé | Limite avec clé |
|----------|--------------|-----------------|-----------------|
| **GoogleBooks** | `GOOGLE_BOOKS_API_KEY` | 1000/jour | 10000/jour |
| **Deezer** | - | Illimité | - |
| **iTunes** | - | ~20/min | - |
| **Pokémon TCG** | `TCG_POKEMON_TOKEN` | 1000/jour | 5000/jour |

### Providers avec Clé API Requise

| Provider | Variable ENV | Rate Limit |
|----------|--------------|------------|
| **Brickset** | `BRICKSET_API_KEY` | Non spécifié |
| **Rebrickable** | `REBRICKABLE_API_KEY` | 1 req/sec |
| **ComicVine** | `COMICVINE_API_KEY` | 200 req/15min |
| **TMDB** | `TMDB_API_KEY` | ~40 req/10sec |
| **TVDB** | `TVDB_API_KEY` | Non spécifié |
| **IGDB** | `IGDB_CLIENT_ID` + `IGDB_CLIENT_SECRET` | 4 req/sec |
| **RAWG** | `RAWG_API_KEY` | 5 req/sec |
| **BoardGameGeek** | `BGG_API_TOKEN` | 1 req/sec |
| **Discogs** | `DISCOGS_API_KEY` (optionnel) | 25/min sans, 60/min avec |

### FlareSolverr (Scraping)

Certains providers nécessitent **FlareSolverr** pour contourner les protections anti-bot :
- **Bedetheque** (Comics)
- **LEGO** (Construction-toys)
- **Playmobil** (Construction-toys)
- **Amazon** (E-commerce)
- **JVC** (Videogames)
- **ConsoleVariations**, **Coleka**, **Lulu-Berlu**, **Transformerland** (Collectibles)
- **Paninimania** (Sticker-Albums)

**Configuration** :
```env
FLARESOLVERR_URL=http://localhost:8191/v1
```

⚠️ **Temps de réponse** : 3-18 secondes par requête selon le provider.

---

## 🌐 Domaines & Providers

### 1. Construction Toys

#### 1.1 LEGO (Officiel)

**Base** : `/api/construction-toys/lego`  
**Authentification** : ❌ Non requise (FlareSolverr)  
**Rate Limit** : Modéré

**Routes** :
```
GET /health
GET /search?q={query}&max={20}&lang={fr}&autoTrad={false}
GET /{id}?lang={fr}&autoTrad={false}
GET /instructions/{productId}
```

**Exemple** :
```bash
curl "http://localhost:3000/api/construction-toys/lego/search?q=star%20wars&max=10"
curl "http://localhost:3000/api/construction-toys/lego/75192"
```

**Champs spécifiques** :
- `brand`: "LEGO"
- `theme`: Thème (Star Wars, City, Technic...)
- `setNumber`: Numéro de set (ex: "75192")
- `pieceCount`: Nombre de pièces
- `price`: `{ amount, currency }`
- `ageRange`: `{ min, max }`
- `releaseDate`: Date ISO

---

#### 1.2 Brickset

**Base** : `/api/construction-toys/brickset`  
**Authentification** : ✅ Requise (`BRICKSET_API_KEY`)  
**Rate Limit** : Non spécifié

**Routes** :
```
GET /health
GET /search?q={query}&theme={}&year={}&max={20}
GET /sets/{id}
GET /themes
GET /years
```

**Exemple** :
```bash
curl "http://localhost:3000/api/construction-toys/brickset/search?q=millennium&theme=Star%20Wars"
curl "http://localhost:3000/api/construction-toys/brickset/sets/31754"
```

---

#### 1.3 Rebrickable

**Base** : `/api/construction-toys/rebrickable`  
**Authentification** : ✅ Requise (`REBRICKABLE_API_KEY`)  
**Rate Limit** : 1 req/sec

**Routes** :
```
GET /health
GET /search?q={query}&max={20}
GET /sets/{id}
GET /sets/{id}/parts
GET /sets/{id}/minifigs
GET /parts?q={query}
GET /minifigs?q={query}
GET /themes
GET /colors
```

**Exemple** :
```bash
curl "http://localhost:3000/api/construction-toys/rebrickable/search?q=technic"
curl "http://localhost:3000/api/construction-toys/rebrickable/sets/42100-1"
curl "http://localhost:3000/api/construction-toys/rebrickable/sets/42100-1/parts"
```

---

#### 1.4 Playmobil

**Base** : `/api/construction-toys/playmobil`  
**Authentification** : ❌ Non requise (FlareSolverr)  
**Rate Limit** : ~18s/req

**Routes** :
```
GET /health
GET /search?q={query}&max={20}
GET /{id}
GET /instructions/{productId}
```

**Exemple** :
```bash
curl "http://localhost:3000/api/construction-toys/playmobil/search?q=knights"
curl "http://localhost:3000/api/construction-toys/playmobil/71148"
```

**Champs spécifiques** :
- `brand`: "Playmobil"
- `category`: Catégorie produit
- `price`: `{ amount, currency, discountPrice? }`
- `attributes`: Attributs produit
- `instructions`: URL instructions

---

#### 1.5 Klickypedia

**Base** : `/api/construction-toys/klickypedia`  
**Authentification** : ❌ Non requise  
**Rate Limit** : Modéré

**Routes** :
```
GET /health
GET /search?q={query}&max={20}
GET /{id}
GET /instructions/{id}
```

**Exemple** :
```bash
curl "http://localhost:3000/api/construction-toys/klickypedia/search?q=castle"
curl "http://localhost:3000/api/construction-toys/klickypedia/3024"
```

**Champs spécifiques** :
- `translations`: `{ name: {}, description: {} }`
- `theme`: Thème (Castle, Pirates...)
- `format`: Format (Box, Bag...)
- `released`: Date de sortie
- `discontinued`: Date d'arrêt
- `figureCount`: Nombre de figurines

---

#### 1.6 MEGA (Bloks, Construx)

**Base** : `/api/construction-toys/mega`  
**Authentification** : ❌ Non requise  
**Rate Limit** : Modéré

**Routes** :
```
GET /health
GET /search?q={query}&max={20}
GET /{id}
GET /instructions/{sku}
```

**Exemple** :
```bash
curl "http://localhost:3000/api/construction-toys/mega/search?q=halo"
curl "http://localhost:3000/api/construction-toys/mega/GYV16"
```

**Champs spécifiques** :
- `brand`: "MEGA"
- `license`: Licence (Halo, Pokémon...)
- `sku`: SKU produit
- `pieceCount`: Nombre de pièces
- `price`: Prix USD

---

### 2. Books

#### 2.1 Google Books

**Base** : `/api/books/googlebooks`  
**Authentification** : ⚠️ Optionnelle (`GOOGLE_BOOKS_API_KEY`)  
**Rate Limit** : 1000/jour sans clé, 10000/jour avec

**Routes** :
```
GET /health
GET /search?q={query}&max={20}&lang={fr}&autoTrad={false}
GET /search/author?author={name}&max={20}
GET /{volumeId}?lang={fr}&autoTrad={false}
```

**Exemple** :
```bash
curl "http://localhost:3000/api/books/googlebooks/search?q=tolkien&max=10"
curl "http://localhost:3000/api/books/googlebooks/search/author?author=tolkien"
curl "http://localhost:3000/api/books/googlebooks/zvQCAAAAMAAJ"
```

**Champs spécifiques** :
- `isbn`: ISBN-13
- `isbn10`: ISBN-10
- `authors`: Tableau d'auteurs
- `publisher`: Éditeur
- `pageCount`: Nombre de pages
- `categories`: Catégories
- `rating`: `{ average, count }`

---

#### 2.2 OpenLibrary

**Base** : `/api/books/openlibrary`  
**Authentification** : ❌ Non requise  
**Rate Limit** : Usage raisonnable

**Routes** :
```
GET /health
GET /search?q={query}&limit={20}&lang={fr}&autoTrad={false}
GET /search/author?author={name}
GET /search/authors?q={query}
GET /author/{id}
GET /author/{id}/works
GET /{olId}
```

**Exemple** :
```bash
curl "http://localhost:3000/api/books/openlibrary/search?q=dune"
curl "http://localhost:3000/api/books/openlibrary/search/authors?q=herbert"
curl "http://localhost:3000/api/books/openlibrary/author/OL34184A"
curl "http://localhost:3000/api/books/openlibrary/OL123456W"
```

**Champs spécifiques** :
- `identifiers`: `{ isbn_13[], isbn_10[], lccn[], oclc[] }`
- `publishers`: Tableau d'éditeurs
- `places`: Lieux de publication
- `times`: Périodes historiques
- `people`: Personnes liées
- `externalLinks`: Liens externes
- `workId`: ID œuvre parente
- `availableLanguages`: Langues disponibles

---

### 3. Comics

#### 3.1 ComicVine

**Base** : `/api/comics/comicvine`  
**Authentification** : ✅ Requise (`COMICVINE_API_KEY`)  
**Rate Limit** : 200 req/15min

**Routes** :
```
GET /health
GET /search?q={query}&maxResults={20}&lang={fr}&autoTrad={false}
GET /search/volumes?q={query}
GET /search/issues?q={query}
GET /search/characters?q={query}
GET /search/publishers?q={query}
GET /search/creators?q={query}
GET /volume/{id}
GET /volume/{id}/issues
GET /issue/{id}
GET /character/{id}
GET /creator/{id}
GET /creator/{id}/works
```

**Exemple** :
```bash
curl "http://localhost:3000/api/comics/comicvine/search?q=batman&maxResults=10"
curl "http://localhost:3000/api/comics/comicvine/volume/42721"
curl "http://localhost:3000/api/comics/comicvine/issue/234567"
```

**Champs spécifiques (Volume)** :
- `aliases`: Titre(s) alternatif(s)
- `firstIssue`: Premier numéro `{ id, name, issueNumber }`
- `lastIssue`: Dernier numéro
- `issues`: Tableau des numéros
- `publisher`: Éditeur `{ id, name }`
- `characters`: Personnages
- `creators`: Créateurs
- `teams`: Équipes

**Champs spécifiques (Issue)** :
- `volumeId`: ID du volume parent
- `issueNumber`: Numéro
- `coverDate`: Date couverture
- `storeDate`: Date sortie magasin
- `characters`: Personnages
- `creators`: Créateurs avec rôles
- `teams`: Équipes
- `storyArcs`: Arcs narratifs

---

#### 3.2 Bedetheque

**Base** : `/api/comics/bedetheque`  
**Authentification** : ❌ Non requise (FlareSolverr)  
**Rate Limit** : 1 req/sec

**Routes** :
```
GET /health
GET /search?q={query}&maxResults={20}&lang={fr}&autoTrad={false}
GET /search/series?q={query}
GET /search/authors?q={query}
GET /search/albums?q={query}
GET /serie/{id}
GET /serie/{id}/albums
GET /author/{id}/works
GET /album/{id}
```

**Exemple** :
```bash
curl "http://localhost:3000/api/comics/bedetheque/search?q=asterix"
curl "http://localhost:3000/api/comics/bedetheque/serie/59"
curl "http://localhost:3000/api/comics/bedetheque/album/123456"
```

**Champs spécifiques (Album)** :
- `authors`: `[{ name, role }]` (Scénario, Dessin, Couleurs...)
- `publisher`: Éditeur
- `releaseDate`: Date de sortie
- `isbn`: ISBN
- `pages`: Nombre de pages
- `format`: Format (BD, Album, Intégrale...)

**Champs spécifiques (Serie)** :
- `genre`: Genre principal
- `status`: Statut (En cours, Terminée, One-shot...)
- `numberOfAlbums`: Nombre de tomes
- `origin`: Origine (Française, Belge, US...)
- `recommendations`: Séries similaires

---

### 4. Media (Films/TV)

#### 4.1 TMDB (The Movie Database)

**Base** : `/api/media/tmdb`  
**Authentification** : ✅ Requise (`TMDB_API_KEY`)  
**Rate Limit** : ~40 req/10sec

**Routes** :
```
GET /health
GET /search?q={query}&pageSize={20}&lang={fr-FR}&autoTrad={false}
GET /search/movies?q={query}
GET /search/series?q={query}
GET /movies/{id}?lang={fr-FR}&autoTrad={false}
GET /series/{id}?lang={fr-FR}&autoTrad={false}
GET /series/{id}/season/{seasonNumber}
GET /series/{id}/season/{seasonNumber}/episode/{episodeNumber}
GET /collections/{id}
GET /persons/{id}
GET /directors/{id}/movies
GET /discover/movies?genre={}&year={}
GET /trending?category={movie|tv}&period={day|week}&limit={20}
GET /popular?category={movie|tv}&limit={20}
GET /top-rated?category={movie|tv}&limit={20}
GET /upcoming?category={movie|tv}&limit={20}
GET /on-the-air?limit={20}
GET /airing-today?limit={20}
```

**Exemple** :
```bash
# Recherche
curl "http://localhost:3000/api/media/tmdb/search?q=matrix&lang=fr-FR"

# Détails film
curl "http://localhost:3000/api/media/tmdb/movies/603?autoTrad=1"

# Détails série
curl "http://localhost:3000/api/media/tmdb/series/1399"

# Saison
curl "http://localhost:3000/api/media/tmdb/series/1399/season/1"

# Collection
curl "http://localhost:3000/api/media/tmdb/collections/2344"

# Trending
curl "http://localhost:3000/api/media/tmdb/trending?category=movie&period=week&limit=10"

# Films à venir
curl "http://localhost:3000/api/media/tmdb/upcoming?category=movie&limit=20"
```

**Champs spécifiques (Movie)** :
- `genres`: Tableau de genres
- `runtime`: Durée en minutes
- `budget`: Budget USD
- `revenue`: Revenus USD
- `collection`: Collection/Saga
- `productionCompanies`: Sociétés de production
- `cast`: Cast complet avec rôles
- `crew`: Équipe technique
- `directors`: Réalisateurs
- `videos`: Trailers et vidéos
- `keywords`: Mots-clés
- `externalIds`: `{ imdb, facebook, twitter, instagram }`
- `certifications`: Classifications par pays
- `recommendations`: Films similaires
- `similar`: Films similaires

**Champs spécifiques (Series)** :
- `seasons`: Tableau des saisons avec détails
- `numberOfSeasons`: Nombre de seasons
- `numberOfEpisodes`: Number total d'épisodes
- `networks`: Chaînes de diffusion
- `creators`: Créateurs
- `status`: Statut (Returning Series, Ended...)
- `type`: Type (Scripted, Documentary...)
- `lastEpisodeToAir`: Dernier épisode diffusé
- `nextEpisodeToAir`: Prochain épisode
- `contentRatings`: Classifications par pays

---

#### 4.2 TVDB (TheTVDB)

**Base** : `/api/media/tvdb`  
**Authentification** : ✅ Requise (`TVDB_API_KEY`)  
**Rate Limit** : Non spécifié

**Routes** :
```
GET /health
GET /search?q={query}&type={series|movie|person}&pageSize={20}&lang={fr}
GET /search/movies?q={query}
GET /search/series?q={query}
GET /movies/{id}?lang={fr}&autoTrad={false}
GET /series/{id}?lang={fr}&autoTrad={false}
GET /series/{id}/seasons
GET /seasons/{id}
GET /series/{id}/episodes
GET /episodes/{id}
GET /lists/{id}
GET /persons/{id}
GET /directors/{id}/works
```

**Exemple** :
```bash
curl "http://localhost:3000/api/media/tvdb/search?q=breaking+bad&lang=fr"
curl "http://localhost:3000/api/media/tvdb/series/81189?lang=fr"
curl "http://localhost:3000/api/media/tvdb/series/81189/seasons"
curl "http://localhost:3000/api/media/tvdb/episodes/349232"
```

**Champs spécifiques** :
- `originalNetwork`: Chaîne originale
- `latestNetwork`: Chaîne actuelle
- `companies`: Sociétés (production, distribution...)
- `trailers`: Trailers YouTube
- `lists`: Listes/Sagas
- `contentRatings`: Classifications
- `remoteIds`: IDs externes (IMDB, TMDB...)
- `artworks`: Posters, banners, fanarts, clearlogos

---

### 5. Anime-Manga

#### 5.1 MangaUpdates

**Base** : `/api/anime-manga/mangaupdates`  
**Authentification** : ❌ Non requise  
**Rate Limit** : Modéré

**Routes** :
```
GET /health
GET /search?q={query}&maxResults={20}&lang={fr}&autoTrad={false}&frenchTitle={false}
GET /search/authors?q={query}
GET /search/publishers?q={query}
GET /series/{id}?lang={fr}&autoTrad={false}&frenchTitle={false}
GET /series/{id}/recommendations
GET /author/{id}
GET /author/{id}/works
GET /genres
GET /releases?maxResults={20}
```

**Exemple** :
```bash
curl "http://localhost:3000/api/anime-manga/mangaupdates/search?q=one+piece&lang=fr&autoTrad=true"
curl "http://localhost:3000/api/anime-manga/mangaupdates/series/54?frenchTitle=1"
curl "http://localhost:3000/api/anime-manga/mangaupdates/genres"
```

**Champs spécifiques** :
- `titleOriginal`: Titre original (japonais)
- `titleAlternatives`: Titres alternatifs
- `titleFrench`: Titre français (via Nautiljon si `frenchTitle=1`)
- `genres`: Genres
- `categories`: Catégories
- `rating`: `{ average, bayesian, distribution: {} }`
- `publications`: `{ status, years }}`
- `authors`: Auteurs avec rôles
- `publishers`: Éditeurs avec types
- `relatedSeries`: Séries liées
- `recommendations`: Recommandations avec scores
- `anime`: Adaptations anime
- `stats`: `{ comments, lists, reads, wishes }`

---

#### 5.2 Jikan (MyAnimeList)

**Base** : `/api/anime-manga/jikan`  
**Authentification** : ❌ Non requise  
**Rate Limit** : 3 req/sec, 60 req/min  
**⚠️ Note** : Aucun filtrage NSFW (`sfw=false` toujours actif)

**Routes** :
```
GET /health
GET /search?q={query}&limit={25}&lang={fr}&autoTrad={false}
GET /search/anime?q={query}&type={tv|movie|ova}&status={airing|complete}
GET /search/manga?q={query}&type={manga|novel}&status={publishing|complete}
GET /search/characters?q={query}
GET /search/people?q={query}
GET /search/producers?q={query}
GET /anime/{id}?lang={fr}&autoTrad={false}
GET /anime/{id}/episodes
GET /anime/{id}/characters
GET /anime/{id}/staff
GET /anime/{id}/recommendations
GET /anime/random
GET /manga/{id}?lang={fr}&autoTrad={false}
GET /manga/{id}/characters
GET /manga/{id}/recommendations
GET /manga/random
GET /seasons
GET /seasons/now
GET /seasons/{year}/{season}
GET /top/anime?filter={airing|upcoming|bypopularity}
GET /top/manga?filter={publishing|bypopularity}
GET /top?type={anime|manga}&filter={bypopularity|favorite}
GET /trending?type={anime|manga}&limit={25}
GET /upcoming?filter={tv|movie}&limit={25}
GET /schedule?day={monday|tuesday|...}&limit={25}
GET /schedules
GET /schedules/{day}
GET /genres/anime
GET /genres/manga
GET /characters/{id}
GET /people/{id}
GET /producers/{id}
```

**Exemple** :
```bash
# Recherche
curl "http://localhost:3000/api/anime-manga/jikan/search?q=naruto&limit=10"

# Détails anime
curl "http://localhost:3000/api/anime-manga/jikan/anime/1?lang=fr&autoTrad=1"

# Épisodes
curl "http://localhost:3000/api/anime-manga/jikan/anime/1/episodes"

# Top anime
curl "http://localhost:3000/api/anime-manga/jikan/top/anime?filter=bypopularity&limit=20"

# Trending
curl "http://localhost:3000/api/anime-manga/jikan/trending?limit=15"

# Saison actuelle
curl "http://localhost:3000/api/anime-manga/jikan/seasons/now"

# À venir
curl "http://localhost:3000/api/anime-manga/jikan/upcoming?limit=10"

# Planning lundi
curl "http://localhost:3000/api/anime-manga/jikan/schedule?day=monday&limit=15"
```

**Champs spécifiques (Anime)** :
- `titleEnglish`: Titre anglais
- `titleJapanese`: Titre japonais
- `type`: Type (TV, Movie, OVA, Special, ONA, Music)
- `episodes`: Nombre d'épisodes
- `status`: Statut (Airing, Finished, Not yet aired)
- `aired`: `{ from, to }`
- `season`: Saison (winter, spring, summer, fall)
- `broadcast`: Horaire de diffusion
- `producers`: Studios de production
- `licensors`: Licencieurs
- `studios`: Studios d'animation
- `genres`: Genres
- `themes`: Thèmes
- `demographics`: Cible (Shounen, Seinen, Josei, Shoujo)
- `relations`: Prequels, sequels, side stories...
- `openingThemes`: Openings
- `endingThemes`: Endings
- `streaming`: Services de streaming

**Champs spécifiques (Manga)** :
- `type`: Type (Manga, Novel, Light Novel, One-shot, Doujinshi, Manhwa, Manhua)
- `chapters`: Nombre de chapitres
- `volumes`: Nombre de volumes
- `status`: Statut (Publishing, Finished, On Hiatus, Discontinued)
- `published`: `{ from, to }`
- `authors`: Auteurs avec rôles
- `serializations`: Magazines de publication
- `genres`: Genres
- `themes`: Thèmes
- `demographics`: Cible
- `relations`: Œuvres liées
- `externalLinks`: Liens externes

---

### 6. Videogames

#### 6.1 IGDB

**Base** : `/api/videogames/igdb`  
**Authentification** : ✅ Requise (OAuth2 via `IGDB_CLIENT_ID` + `IGDB_CLIENT_SECRET`)  
**Rate Limit** : 4 req/sec

**Routes** :
```
GET /health
GET /search?q={query}&limit={20}&lang={fr}&autoTrad={false}
GET /advanced-search?platforms={}&genres={}&minRating={}
GET /game/{id}?lang={fr}&autoTrad={false}
GET /game/slug/{slug}
GET /genres
GET /platforms
GET /themes
GET /game-modes
GET /player-perspectives
GET /companies/search?q={query}
GET /companies/{id}
GET /companies/{id}/games/developed
GET /companies/{id}/games/published
GET /franchises/search?q={query}
GET /franchises/{id}
GET /collections/{id}
GET /top-rated?limit={20}
GET /popular?limit={20}&platforms={}&genres={}
GET /recent-releases?limit={20}
GET /upcoming?limit={20}&platforms={}
```

**Exemple** :
```bash
# Recherche
curl "http://localhost:3000/api/videogames/igdb/search?q=zelda&limit=10"

# Recherche avancée
curl "http://localhost:3000/api/videogames/igdb/advanced-search?platforms=6,48,49&genres=12&minRating=80"

# Détails jeu
curl "http://localhost:3000/api/videogames/igdb/game/1074?lang=fr&autoTrad=1"

# Par slug
curl "http://localhost:3000/api/videogames/igdb/game/slug/the-witcher-3-wild-hunt"

# Popular
curl "http://localhost:3000/api/videogames/igdb/popular?limit=20"

# À venir
curl "http://localhost:3000/api/videogames/igdb/upcoming?limit=10"
```

**Champs spécifiques** :
- `summary`: Résumé traduit
- `storyline`: Histoire détaillée traduite
- `genres`: Genres traduits
- `platforms`: Plateformes
- `rating`: Note IGDB (0-100)
- `aggregatedRating`: Note agrégée critiques
- `totalRating`: Note globale
- `releaseDate`: Date de sortie
- `cover`: Pochette
- `screenshots`: Captures d'écran
- `artworks`: Artworks
- `videos`: Vidéos YouTube
- `dlcs`: DLCs
- `expansions`: Expansions
- `remakes`: Remakes
- `remasters`: Remasters
- `franchises`: Franchises
- `involved_companies`: Développeurs et éditeurs

**IDs Plateformes courantes** :
- `6`: PC (Windows)
- `48`: PS4
- `49`: Xbox One
- `130`: Nintendo Switch
- `167`: PS5
- `169`: Xbox Series X|S

**IDs Genres courants** :
- `4`: Fighting
- `5`: Shooter
- `12`: Role-playing (RPG)
- `31`: Adventure
- `32`: Indie

---

#### 6.2 RAWG

**Base** : `/api/videogames/rawg`  
**Authentification** : ✅ Requise (`RAWG_API_KEY`)  
**Rate Limit** : 5 req/sec

**Routes** :
```
GET /health
GET /search?q={query}&page_size={20}&lang={fr}&autoTrad={false}
GET /advanced-search?platforms={}&genres={}&tags={}
GET /game/{idOrSlug}?lang={fr}&autoTrad={false}
GET /game/{id}/screenshots
GET /game/{id}/stores
GET /game/{id}/series
GET /game/{id}/additions
GET /game/{id}/achievements
GET /game/{id}/movies
GET /game/{id}/reddit
GET /game/{id}/twitch
GET /genres
GET /platforms
GET /parent-platforms
GET /tags
GET /stores
GET /developers
GET /developers/{id}
GET /developers/{id}/games
GET /publishers
GET /publishers/{id}
GET /publishers/{id}/games
GET /creators
GET /creators/{id}
GET /top-rated?page_size={20}
GET /popular?page_size={20}&platforms={}&genres={}
GET /trending?page_size={20}&platforms={}&genres={}
GET /recent-releases?page_size={20}
GET /upcoming?page_size={20}
```

**Exemple** :
```bash
# Recherche
curl "http://localhost:3000/api/videogames/rawg/search?q=witcher&page_size=10"

# Détails
curl "http://localhost:3000/api/videogames/rawg/game/3328?lang=fr&autoTrad=1"

# Screenshots
curl "http://localhost:3000/api/videogames/rawg/game/3328/screenshots"

# Achievements
curl "http://localhost:3000/api/videogames/rawg/game/3328/achievements"

# Popular
curl "http://localhost:3000/api/videogames/rawg/popular?page_size=10"

# Trending
curl "http://localhost:3000/api/videogames/rawg/trending?page_size=10"

# À venir
curl "http://localhost:3000/api/videogames/rawg/upcoming?page_size=20"
```

**Champs spécifiques** :
- `description`: HTML traduit
- `genres`: Genres traduits
- `platforms`: Plateformes avec requirements
- `rating`: Note RAWG (0-5)
- `metacritic`: Score Metacritic
- `esrb_rating`: Classification ESRB
- `tags`: Tags communautaires
- `achievements_count`: Nombre d'achievements
- `screenshots_count`: Nombre de screenshots
- `stores`: Magasins disponibles (Steam, Epic, GOG...)
- `reddit_url`: Subreddit
- `twitch_count`: Nombre de streams Twitch

---

#### 6.3 JVC (JeuxVideo.com)

**Base** : `/api/videogames/jvc`  
**Authentification** : ❌ Non requise (FlareSolverr)  
**Rate Limit** : Dépend de FlareSolverr

**Routes** :
```
GET /health
GET /search?q={query}&limit={20}
GET /game/{id}?lang={fr}&autoTrad={false}
```

**Exemple** :
```bash
curl "http://localhost:3000/api/videogames/jvc/search?q=zelda"
curl "http://localhost:3000/api/videogames/jvc/game/114792"
```

**Champs spécifiques** :
- `description`: Description française native
- `genres`: Genres en français
- `platforms`: Plateformes
- `testNote`: Note test JVC (0-20)
- `userNote`: Note utilisateurs (0-20)
- `pegi`: Classification PEGI
- `ageMin`: Âge minimum
- `numberOfPlayers`: Nombre de joueurs
- `supports`: Supports (Cartouche, CD, DVD, eShop...)
- `testUrl`: URL du test JVC

---

#### 6.4 ConsoleVariations

**Base** : `/api/videogames/consolevariations`  
**Authentification** : ❌ Non requise (FlareSolverr)  
**Rate Limit** : ~3-5s/req

**Routes** :
```
GET /health
GET /search?q={query}&type={all|consoles|controllers|accessories}&max={20}
GET /details?url={consolevariations://item/{slug}}
GET /item/{slug}
GET /platforms?brand={}
GET /browse/{platform}?max={20}
```

**Exemple** :
```bash
# Recherche toutes variations PS2
curl "http://localhost:3000/api/videogames/consolevariations/search?q=playstation%202&type=all"

# Recherche uniquement consoles Nintendo
curl "http://localhost:3000/api/videogames/consolevariations/search?q=nintendo&type=consoles"

# Détails par slug
curl "http://localhost:3000/api/videogames/consolevariations/item/sega-dreamcast-hello-kitty"

# Plateformes Nintendo
curl "http://localhost:3000/api/videogames/console variations/platforms?brand=nintendo"

# Browse NES
curl "http://localhost:3000/api/videogames/consolevariations/browse/nes?max=50"
```

**Champs spécifiques** :
- `brand`: Marque (Nintendo, Sony, Microsoft...)
- `platform`: Plateforme (NES, PS2, Xbox...)
- `type`: Type (console, controller, accessory)
- `releaseInfo`: `{ country, year, type, region }`
- `production`: `{ quantity, limitedEdition, bundle }`
- `rarity`: `{ score: 0-100, level: 'common'|'rare'|... }`
- `community`: `{ wants, owns }`
- `barcode`: Code-barres si disponible

---

### 7. Music

#### 7.1 Deezer

**Base** : `/api/music/deezer`  
**Authentification** : ❌ Non requise  
**Rate Limit** : Usage raisonnable

**Routes** :
```
GET /health
GET /search?q={query}&limit={25}
GET /search/albums?q={query}
GET /search/artists?q={query}
GET /search/tracks?q={query}
GET /albums/{id}
GET /albums/{id}/tracks
GET /artists/{id}
GET /artists/{id}/top
GET /artists/{id}/albums
GET /artists/{id}/related
GET /tracks/{id}
GET /genres
GET /chart/albums?limit={25}
GET /chart/tracks?limit={25}
GET /chart/artists?limit={25}
GET /charts?category={albums|tracks|artists}&limit={25}
```

**Exemple** :
```bash
curl "http://localhost:3000/api/music/deezer/search?q=daft+punk&limit=10"
curl "http://localhost:3000/api/music/deezer/albums/302127"
curl "http://localhost:3000/api/music/deezer/artists/27/top"
curl "http://localhost:3000/api/music/deezer/charts?category=albums&limit=10"
```

**Champs spécifiques** :
- `preview`: Preview 30s MP3
- `duration`: Durée en secondes
- `bpm`: Beats per minute
- `rank`: Popularité Deezer
- `fans`: Nombre de fans (artistes)
- `releaseDate`: Date de sortie

---

#### 7.2 iTunes

**Base** : `/api/music/itunes`  
**Authentification** : ❌ Non requise  
**Rate Limit** : ~20 req/min

**Routes** :
```
GET /health
GET /search?q={query}&limit={25}&country={FR}
GET /search/albums?q={query}
GET /search/artists?q={query}
GET /search/tracks?q={query}
GET /albums/{id}?country={FR}
GET /artists/{id}
GET /artists/{id}/albums
GET /tracks/{id}
GET /charts?country={fr}&category={album|song}&limit={10}
```

**Exemple** :
```bash
curl "http://localhost:3000/api/music/itunes/search?q=beyonce&limit=10"
curl "http://localhost:3000/api/music/itunes/albums/1440935467"
curl "http://localhost:3000/api/music/itunes/charts?country=fr&category=album&limit=10"
curl "http://localhost:3000/api/music/itunes/charts?country=us&category=song&limit=20"
```

**Champs spécifiques** :
- `previewUrl`: Preview 30s
- `trackPrice`: Prix du morceau
- `collectionPrice`: Prix de l'album
- `currency`: Devise
- `country`: Pays
- `explicit`: Contenu explicite
- `trackCount`: Nombre de morceaux (album)

---

#### 7.3 Discogs

**Base** : `/api/music/discogs`  
**Authentification** : ⚠️ Optionnelle (`DISCOGS_API_KEY`)  
**Rate Limit** : 25 req/min sans clé, 60 req/min avec

**Routes** :
```
GET /health
GET /search?q={query}&type={release|master|artist|label}
GET /search/albums?q={query}
GET /search/masters?q={query}
GET /search/artists?q={query}
GET /search/labels?q={query}
GET /barcode/{barcode}
GET /releases/{id}
GET /masters/{id}
GET /masters/{id}/versions
GET /artists/{id}
GET /artists/{id}/releases
GET /labels/{id}
GET /labels/{id}/releases
```

**Exemple** :
```bash
curl "http://localhost:3000/api/music/discogs/search/albums?q=daft+punk"
curl "http://localhost:3000/api/music/discogs/barcode/0887654764225"
curl "http://localhost:3000/api/music/discogs/releases/4571215"
curl "http://localhost:3000/api/music/discogs/artists/3289/releases"
```

**Champs spécifiques** :
- `format`: Format (Vinyl, CD, Cassette...)
- `labels`: Labels
- `country`: Pays
- `releaseDate`: Date de sortie
- `genres`: Genres
- `styles`: Styles
- `tracklist`: Tracklist complète avec durées
- `credits`: Crédits artistes avec rôles
- `barcode`: Code-barres

---

#### 7.4 MusicBrainz

**Base** : `/api/music/musicbrainz`  
**Authentification** : ❌ Non requise  
**Rate Limit** : 1 req/sec (strict)

**Routes** :
```
GET /health
GET /search?q={query}&limit={25}
GET /search/albums?q={query}&type={album|single|ep}
GET /search/artists?q={query}
GET /barcode/{barcode}
GET /albums/{id}
GET /albums/{id}/cover
GET /artists/{id}
GET /artists/{id}/albums
```

**Exemple** :
```bash
curl "http://localhost:3000/api/music/musicbrainz/search/albums?q=ok+computer"
curl "http://localhost:3000/api/music/musicbrainz/artists/a74b1b7f-71a5-4011-9441-d0b5e4122711"
curl "http://localhost:3000/api/music/musicbrainz/albums/a4864e94-6d75-3622-b477-f9ac58ed24c0/cover"
```

**Champs spécifiques** :
- `mbid`: MusicBrainz ID (UUID)
- `type`: Type (album, single, ep, compilation...)
- `status`: Statut (Official, Promotion, Bootleg...)
- `country`: Pays
- `barcode`: Code-barres
- `tags`: Tags communautaires avec scores
- `rating`: Note communautaire
- `coverArt`: URL Cover Art Archive

---

### 8. E-commerce

#### 8.1 Amazon

**Base** : `/api/ecommerce/amazon`  
**Authentification** : ❌ Non requise (FlareSolverr)  
**Rate Limit** : 1 req/3sec recommandé

**Marketplaces** : FR, US, UK, DE, ES, IT, CA, JP

**Routes** :
```
GET /marketplaces
GET /categories
GET /search?q={query}&country={fr}&category={all}&limit={20}
GET /product/{asin}?country={fr}
GET /compare/{asin}?countries={fr,us,uk,de}
GET /health
```

**Exemple** :
```bash
# Recherche LEGO France
curl "http://localhost:3000/api/ecommerce/amazon/search?q=lego&country=fr&limit=10"

# Recherche jeux vidéo US
curl "http://localhost:3000/api/ecommerce/amazon/search?q=nintendo&country=us&category=videogames"

# Détails produit
curl "http://localhost:3000/api/ecommerce/amazon/product/B01N6CJ1QW?country=fr"

# Comparaison prix multi-pays
curl "http://localhost:3000/api/ecommerce/amazon/compare/B01N6CJ1QW?countries=fr,us,uk,de"
```

**Champs spécifiques** :
- `asin`: Amazon Standard Identification Number
- `marketplace`: Code pays (fr, us, uk...)
- `price`: `{ value, currency, formatted }`
- `isPrime`: Éligibilité Prime
- `rating`: Note (0-5)
- `reviewCount`: Nombre d'avis
- `availability`: Disponibilité

---

### 9. TCG (Trading Card Games)

#### 9.1 Pokémon TCG

**Base** : `/api/tcg/pokemon`  
**Authentification** : ⚠️ Optionnelle (`TCG_POKEMON_TOKEN`)  
**Rate Limit** : 1000/jour sans clé, 5000/jour avec

**Routes** :
```
GET /health
GET /search?q={query}&max={20}&lang={fr}&set={}&type={}&rarity={}
GET /card/{id}?lang={fr}&autoTrad={false}
GET /sets?series={}&year={}
```

**Exemple** :
```bash
# Recherche Pikachu
curl "http://localhost:3000/api/tcg/pokemon/search?q=pikachu&max=10"

# Avec filtres
curl "http://localhost:3000/api/tcg/pokemon/search?q=pikachu&rarity=Rare&type=Lightning"

# Détails carte
curl "http://localhost:3000/api/tcg/pokemon/card/base1-4?lang=fr&autoTrad=true"

# Sets d'une série
curl "http://localhost:3000/api/tcg/pokemon/sets?series=Sword%20%26%20Shield"
```

**Champs spécifiques** :
- `set`: `{ id, name, series, logo }`
- `cardNumber`: Numérotation (25/102)
- `rarity`: Rareté (Common, Rare, Ultra Rare...)
- `types`: Types élémentaires (Fire, Water, Grass...)
- `hp`: Points de vie
- `attacks`: Attaques avec coûts et dégâts
- `abilities`: Capacités spéciales
- `weaknesses`: Faiblesses
- `resistances`: Résistances
- `retreatCost`: Coût de retraite
- `legalities`: Formats légaux (Standard, Expanded...)
- `prices`: `{ usd, eur }` (TCGPlayer, Cardmarket)
- `nationalPokedexNumbers`: Numéro Pokédex

---

#### 9.2 Magic: The Gathering

**Base** : `/api/tcg/mtg`  
**Authentification** : ❌ Non requise  
**Rate Limit** : 10 req/sec

**Routes** :
```
GET /health
GET /search?q={query}&max={20}&lang={en}&order={name|rarity|released}
GET /card/{id}?lang={en}&autoTrad={false}
GET /card/{set}/{collectorNumber}
GET /sets
```

**Exemple** :
```bash
# Recherche
curl "http://localhost:3000/api/tcg/mtg/search?q=lightning+bolt"

# Recherche avancée (syntaxe Scryfall)
curl "http://localhost:3000/api/tcg/mtg/search?q=mv%3D1+type%3Ainstant+color%3Ar"

# Carte par UUID
curl "http://localhost:3000/api/tcg/mtg/card/77c6fa74-5543-42ac-9ead-0e890b188e99"

# Carte par set/numéro
curl "http://localhost:3000/api/tcg/mtg/card/clu/141"

# Sets
curl "http://localhost:3000/api/tcg/mtg/sets"
```

**Champs spécifiques** :
- `manaCost`: Coût de mana ({R}, {W}, {1}{U}...)
- `cmc`: Converted mana cost
- `typeLine`: Type (Instant, Creature - Human Wizard...)
- `oracleText`: Texte Oracle
- `power`: Puissance (créatures)
- `toughness`: Endurance (créatures)
- `loyalty`: Loyauté (planeswalkers)
- `colors`: Couleurs (R, W, U, B, G)
- `colorIdentity`: Identité de couleur
- `rarity`: Rareté (common, uncommon, rare, mythic)
- `legalities`: Formats (Standard, Modern, Commander...)
- `prices`: `{ usd, eur, tix }` (Scryfall)

---

#### 9.3 Yu-Gi-Oh! TCG

**Base** : `/api/tcg/yugioh`  
**Authentification** : ❌ Non requise  
**Rate Limit** : 20 req/sec

**Routes** :
```
GET /health
GET /search?q={query}&type={Monster|Spell|Trap}&race={}&attribute={}&max={20}
GET /card/{id}?lang={en}&autoTrad={false}
GET /archetype?name={archetype}&max={20}
GET /sets
```

**Exemple** :
```bash
# Recherche
curl "http://localhost:3000/api/tcg/yugioh/search?q=Dark+Magician"

# Par type
curl "http://localhost:3000/api/tcg/yugioh/search?q=dragon&type=Monster&race=Dragon"

# Carte
curl "http://localhost:3000/api/tcg/yugioh/card/46986414"

# Archétype
curl "http://localhost:3000/api/tcg/yugioh/archetype?name=Blue-Eyes"

# Sets
curl "http://localhost:3000/api/tcg/yugioh/sets"
```

**Champs spécifiques** :
- `type`: Type (Normal Monster, Effect Monster, Spell Card...)
- `frameType`: Type de frame (normal, effect, fusion, synchro, xyz, link, pendulum)
- `race`: Race (Spellcaster, Dragon, Warrior...)
- `archetype`: Archétype (Dark Magician, Blue-Eyes...)
- `atk`: Attaque
- `def`: Défense
- `level`: Niveau
- `attribute`: Attribut (DARK, LIGHT, WATER, FIRE, EARTH, WIND, DIVINE)
- `cardSets`: Sets avec codes et rarités
- `banlistInfo`: Statut (Unlimited, Limited, Semi-Limited, Banned)
- `prices`: `{ cardmarket, tcgplayer, ebay, amazon, coolstuffinc }`

---

### 10. Collectibles

#### 10.1 Coleka

**Base** : `/api/collectibles/coleka`  
**Authentification** : ❌ Non requise (FlareSolverr)  
**Rate Limit** : ~3-5s/req

**Routes** :
```
GET /health
GET /search?q={query}&category={lego|funko|figurines}&max={20}
GET /details?url={coleka://item/{path}}
GET /item/{path}
GET /categories?lang={fr}
```

**Exemple** :
```bash
# Recherche LEGO
curl "http://localhost:3000/api/collectibles/coleka/search?q=lego%20star%20wars"

# Funko Pop Batman
curl "http://localhost:3000/api/collectibles/coleka/search?q=batman&category=funko"

# Détails
curl "http://localhost:3000/api/collectibles/coleka/item/fr/lego/star-wars/millennium-falcon_i12345"

# Catégories
curl "http://localhost:3000/api/collectibles/coleka/categories"
```

**Champs spécifiques** :
- `brand`: Marque
- `series`: Série
- `category`: Catégorie
- `barcode`: Code-barres
- `referenceNumber`: Numéro de référence
- `releaseYear`: Année
- `attributes`: Attributs (pièces, couleur, édition limitée...)

---

#### 10.2 Lulu-Berlu

**Base** : `/api/collectibles/luluberlu`  
**Authentification** : ❌ Non requise (FlareSolverr)  
**Rate Limit** : ~2-4s/req

**Routes** :
```
GET /health
GET /search?q={query}&max={24}
GET /details?url={full_url}
GET /item/{path}
```

**Exemple** :
```bash
# Recherche Final Fantasy
curl "http://localhost:3000/api/collectibles/luluberlu/search?q=squall&max=6"

# Détails par URL
curl "http://localhost:3000/api/collectibles/luluberlu/details?url=https://www.lulu-berlu.com/final-fantasy-viii-bandai-figurine-15cm-squall-leonhart-a47524.html"

# Détails par path
curl "http://localhost:3000/api/collectibles/luluberlu/item/final-fantasy-viii-bandai-figurine-15cm-squall-leonhart-a47524.html"
```

**Champs spécifiques** :
- `brand`: Marque (Bandai, Square Enix...)
- `price`: `{ amount, currency }` (EUR)
- `availability`: Disponibilité
- `sku`: SKU produit
- `condition`: État (Neuf, Occasion...)
- `material`: Matière
- `size`: Taille

---

#### 10.3 Transformerland

**Base** : `/api/collectibles/transformerland`  
**Authentification** : ❌ Non requise (FlareSolverr)  
**Rate Limit** : ~3-5s/req

**Routes** :
```
GET /health
GET /search?q={query}&max={24}
GET /details?id={toyId|url|path}
GET /item/{toyId}
```

**Exemple** :
```bash
# Recherche Optimus Prime
curl "http://localhost:3000/api/collectibles/transformerland/search?q=optimus+prime&max=5"

# Détails G1 Optimus Prime
curl "http://localhost:3000/api/collectibles/transformerland/details?id=158"

# Via /item
curl "http://localhost:3000/api/collectibles/transformerland/item/158"
```

**Champs spécifiques** :
- `series`: Série (G1, Beast Wars, Armada...)
- `subgroup`: Sous-groupe (Leaders, Deluxe...)
- `faction`: Faction (Autobot, Decepticon)
- `year`: Année
- `manufacturer`: Fabricant (Hasbro, Takara)
- `toyLine`: Gamme (Transformers, Generation 2...)
- `images`: `[thumbnails, reference_images, scans]`

---

---

### 11. Sticker-Albums

#### 11.1 Paninimania

**Base** : `/api/sticker-albums/paninimania`  
**Authentification** : ❌ Non requise (FlareSolverr)  
**Rate Limit** : ~3-5s/req

**Routes** :
```
GET /health
GET /search?q={query}&max={24}
GET /details?id={albumId|url}
GET /album/{albumId}
```

**Exemple** :
```bash
# Recherche albums foot
curl "http://localhost:3000/api/sticker-albums/paninimania/search?q=football&max=10"

# Détails album
curl "http://localhost:3000/api/sticker-albums/paninimania/details?id=7523"

# Via /album
curl "http://localhost:3000/api/sticker-albums/paninimania/album/7523"
```

**Champs spécifiques** :
- `barcode`: Code-barres
- `copyright`: Détenteur des droits
- `releaseDate`: Date de parution
- `editor`: Éditeur (Panini)
- `checklist`: `{ raw, total, items[], totalWithSpecials }`
- `specialStickers`: `[{ name, raw, total, list[] }]` (brillantes, hologrammes, limitées...)
- `additionalImages`: Images supplémentaires avec légendes
- `articles`: Articles divers (packs, prix...)
- `categories`: Catégories

---

### 12. BoardGames

#### 12.1 BoardGameGeek (BGG)

**Base** : `/api/boardgames/bgg`  
**Authentification** : ✅ Requise (`BGG_API_TOKEN`)  
**Rate Limit** : 1 req/sec

**Routes** :
```
GET /health
GET /search?q={query}&limit={20}&autoTrad={false}&targetLang={fr}
GET /search/category?q={query}
GET /game/{id}?autoTrad={false}&targetLang={fr}
```

**Exemple** :
```bash
# Recherche
curl "http://localhost:3000/api/boardgames/bgg/search?q=catan&limit=5"

# Détails avec traduction
curl "http://localhost:3000/api/boardgames/bgg/game/13?autoTrad=1&targetLang=fr"
```

**Champs spécifiques** :
- `localizedName`: Nom localisé (français si disponible)
- `year`: Année de sortie
- `players`: `{ min, max }`
- `playTime`: `{ min, max }`
- `stats`: `{ rating, rank, complexity }`
- `categories`: Catégories traduites
- `mechanics`: Mécaniques de jeu
- `designers`: Auteurs
- `publishers`: Éditeurs

---

## 🌍 Traduction Automatique

### Activation

Pour activer la traduction automatique, ajoutez ces paramètres :

```bash
GET /api/{domain}/{provider}/{endpoint}?autoTrad=true&lang=fr
```

### Champs Traduits

La traduction s'applique généralement à :
- `title` (parfois)
- `description`
- `genres` / `categories`
- `types` / `themes`
- Autres champs textuels longs

### Providers Supportant Auto-Trad

✅ **Supporté** :
- TMDB, TVDB (media)
- Jikan, MangaUpdates (anime-manga)
- IGDB, RAWG (videogames)
- GoogleBooks, OpenLibrary (books)
- ComicVine, Bedetheque (comics)
- LEGO, Playmobil, etc. (construction-toys)
- Deezer, iTunes, MusicBrainz (music)
- Pokémon TCG, MTG, Yu-Gi-Oh (tcg)
- BoardGameGeek (boardgames)

❌ **Non supporté** :
- Providers déjà en français natif (JVC, Bedetheque)

### Traduction Native vs Auto

Certains providers supportent la traduction **native** via paramètre `lang` :
- **TMDB** : 40+ langues natives
- **TVDB** : 20+ langues natives
- **Jikan** : Traductions MyAnimeList

Pour ces providers, `autoTrad` sert de **fallback** si la traduction native n'existe pas.

---

## ❌ Gestion des Erreurs

### Format d'Erreur Standardisé

```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_ERROR",
    "message": "Failed to fetch data from provider",
    "details": "API rate limit exceeded",
    "provider": "tmdb",
    "statusCode": 429
  }
}
```

### Codes d'Erreur Courants

| Code | Description | Action recommandée |
|------|-------------|-------------------|
| `PROVIDER_ERROR` | Erreur chez le provider externe | Réessayer plus tard |
| `RATE_LIMIT_EXCEEDED` | Rate limit dépassé | Attendre puis réessayer |
| `INVALID_PARAMS` | Paramètres invalides | Vérifier les paramètres |
| `NOT_FOUND` | Ressource introuvable | Vérifier l'ID/query |
| `TIMEOUT` | Timeout de requête | Réessayer ou augmenter timeout |
| `CACHE_ERROR` | Erreur de cache | Utiliser `refresh=true` |
| `FLARESOLVERR_ERROR` | FlareSolverr indisponible | Vérifier FlareSolverr |

### Codes HTTP

| Code | Signification |
|------|---------------|
| `200` | Succès |
| `400` | Requête invalide |
| `401` | Non authentifié |
| `403` | Accès interdit |
| `404` | Ressource introuvable |
| `429` | Rate limit dépassé |
| `500` | Erreur serveur |
| `502` | Provider externe indisponible |
| `504` | Timeout |

---

## 💡 Bonnes Pratiques

### 1. Utiliser le Cache

- Par défaut, les résultats sont **mis en cache**
- Durée : variable selon le provider (1-24h)
- Pour forcer le refresh : `?refresh=true`

### 2. Respecter les Rate Limits

- Espacer les requêtes selon le provider
- Utiliser le cache autant que possible
- Implémenter un système de retry avec backoff exponentiel

### 3. Gestion de la Pagination

```bash
# Page 1
GET /api/books/googlebooks/search?q=tolkien&max=20&page=1

# Page 2
GET /api/books/googlebooks/search?q=tolkien&max=20&page=2
```

Vérifier `pagination.hasMore` pour savoir s'il reste des résultats.

### 4. Traduction Efficace

- Activer `autoTrad` uniquement si nécessaire
- Pour les providers avec traduction native (TMDB, TVDB), utiliser `lang` uniquement
- Mettre en cache les résultats traduits côté client

### 5. Gestion des Images

Les URLs d'images sont des liens **directs** vers les providers :
- Pas de proxy Tako API
- Mettre en cache côté client si possible
- Certains providers ont des restrictions CORS

### 6. Utiliser `urls.detail`

Chaque item retourné contient `urls.detail` pointant vers l'endpoint de détails :

```json
{
  "urls": {
    "source": "https://provider.com/item/123",
    "detail": "/api/construction-toys/lego/123"
  }
}
```

Utiliser `urls.detail` pour récupérer les détails complets.

### 7. Monitoring FlareSolverr

Si vous utilisez des providers nécessitant FlareSolverr :
- Vérifier `/health` régulièrement
- Temps de réponse élevé (3-18s) : prévoir des timeouts généreux
- En cas d'erreur, vérifier que FlareSolverr est bien lancé

---

## 🚀 Exemples Complets

### Exemple 1 : Recherche Multi-Providers

```javascript
// Rechercher "Star Wars" dans plusieurs domaines
const queries = [
  '/api/construction-toys/lego/search?q=star wars&max=5',
  '/api/media/tmdb/search/movies?q=star wars&lang=fr&autoTrad=true&pageSize=5',
  '/api/books/googlebooks/search?q=star wars&max=5',
  '/api/videogames/rawg/search?q=star wars&page_size=5'
];

const results = await Promise.all(
  queries.map(url => fetch(`http://localhost:3000${url}`).then(r => r.json()))
);

// results[0] = LEGO sets
// results[1] = Films TMDB
// results[2] = Livres Google Books
// results[3] = Jeux vidéo RAWG
```

### Exemple 2 : Détails Complets avec Traduction

```javascript
// Récupérer un film TMDB avec toutes les traductions
async function getMovieDetails(movieId) {
  const response = await fetch(
    `http://localhost:3000/api/media/tmdb/movies/${movieId}?lang=fr&autoTrad=true`
  );
  
  const { success, data, meta } = await response.json();
  
  if (!success) {
    throw new Error('Failed to fetch movie');
  }
  
  return {
    id: data.id,
    title: data.title,
    description: data.description, // Traduit en français
    genres: data.genres, // Traduits
    cast: data.cast,
    directors: data.directors,
    rating: data.rating,
    images: data.images,
    cached: meta.cached,
    cacheAge: meta.cacheAge
  };
}

const movie = await getMovieDetails(603); // The Matrix
console.log(movie.title); // "Matrix"
console.log(movie.description); // Description en français
```

### Exemple 3 : Pagination Complète

```javascript
// Récupérer tous les résultats (toutes les pages)
async function getAllResults(query) {
  const allResults = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(
      `http://localhost:3000/api/books/googlebooks/search?q=${query}&max=20&page=${page}`
    );
    
    const { data, pagination } = await response.json();
    
    allResults.push(...data);
    hasMore = pagination.hasMore;
    page++;
    
    // Respecter le rate limit
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return allResults;
}

const allBooks = await getAllResults('tolkien');
console.log(`Total: ${allBooks.length} livres`);
```

### Exemple 4 : Comparaison Prix Amazon Multi-Pays

```javascript
// Comparer les prix d'un produit sur plusieurs marketplaces
async function comparePrices(asin) {
  const response = await fetch(
    `http://localhost:3000/api/ecommerce/amazon/compare/${asin}?countries=fr,us,uk,de,es,it`
  );
  
  const { data } = await response.json();
  
  // Trier par prix croissant
  const sorted = Object.entries(data)
    .map(([country, item]) => ({
      country,
      price: item.price.value,
      currency: item.price.currency,
      url: item.url
    }))
    .sort((a, b) => a.price - b.price);
  
  return sorted;
}

const prices = await comparePrices('B01N6CJ1QW');
console.log('Meilleur prix:', prices[0]);
// { country: 'us', price: 149.99, currency: 'USD', url: '...' }
```

### Exemple 5 : Cache Intelligent

```javascript
// Système de cache intelligent avec TTL
class TakoAPIClient {
  constructor(baseURL, cacheTTL = 3600000) { // 1h par défaut
    this.baseURL = baseURL;
    this.cacheTTL = cacheTTL;
    this.cache = new Map();
  }
  
  async fetch(endpoint, params = {}) {
    const url = new URL(endpoint, this.baseURL);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    const cacheKey = url.toString();
    
    // Vérifier le cache
    if (this.cache.has(cacheKey)) {
      const { data, timestamp } = this.cache.get(cacheKey);
      const age = Date.now() - timestamp;
      
      if (age < this.cacheTTL) {
        console.log(`Cache HIT (${Math.round(age / 1000)}s old)`);
        return data;
      }
    }
    
    // Fetch depuis l'API
    console.log('Cache MISS - Fetching from API');
    const response = await fetch(url);
    const data = await response.json();
    
    // Mettre en cache
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
}

// Utilisation
const client = new TakoAPIClient('http://localhost:3000');

// Premier appel : cache MISS
const results1 = await client.fetch('/api/books/googlebooks/search', {
  q: 'tolkien',
  max: 10
});

// Deuxième appel (< 1h) : cache HIT
const results2 = await client.fetch('/api/books/googlebooks/search', {
  q: 'tolkien',
  max: 10
});
```

### Exemple 6 : Retry avec Backoff Exponentiel

```javascript
// Retry automatique avec backoff exponentiel
async function fetchWithRetry(url, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      
      // Si rate limit, attendre et réessayer
      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Si autre erreur serveur, réessayer
      if (response.status >= 500) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Server error. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return await response.json();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Error: ${error.message}. Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Utilisation
try {
  const data = await fetchWithRetry(
    'http://localhost:3000/api/media/tmdb/movies/603'
  );
  console.log(data);
} catch (error) {
  console.error('Failed to fetch:', error);
}
```

---

## 📞 Support & Contact

Pour toute question ou problème :
- **Documentation complète** : `/docs` folder
- **Health check global** : `GET /health`
- **Logs** : Consulter les logs serveur pour plus de détails

---

**Dernière mise à jour** : 27 février 2026  
**Version** : 2.0.1  
**Auteur** : Tako API Team
