# Format de Réponse Normalisé Tako API

## Principe Fondamental

**Toutes les réponses suivent le MÊME schéma de base**, quel que soit le provider ou le domaine.  
Les données spécifiques sont encapsulées dans un objet `details` qui varie selon le type de contenu.

---

## Structure d'un Item

```json
{
  // ═══════════════════════════════════════════════════════════════════════════
  // NOYAU COMMUN - IDENTIQUE POUR TOUS LES TYPES
  // ═══════════════════════════════════════════════════════════════════════════
  
  "id": "brickset:31754",           // ID Tako unique (format: source:sourceId)
  "type": "construct_toy",          // Type de contenu
  "source": "brickset",             // Provider d'origine
  "sourceId": "31754",              // ID original chez le provider
  
  "title": "75192 Millennium Falcon",    // Titre principal
  "titleOriginal": null,                  // Titre original (si différent)
  
  "description": "Star Wars • Ultimate Collector Series • 7541 pièces • 8 minifigs",
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

  // ═══════════════════════════════════════════════════════════════════════════
  // DÉTAILS SPÉCIFIQUES AU TYPE - VARIENT SELON LE DOMAINE
  // ═══════════════════════════════════════════════════════════════════════════
  
  "details": {
    "brand": "LEGO",
    "theme": "Star Wars",
    "subtheme": "Ultimate Collector Series",
    "category": "Normal",
    
    "setNumber": "75192",
    "pieceCount": 7541,
    "minifigCount": 8,
    
    "ageRange": { "min": 16, "max": null },
    "dimensions": { "height": 21, "width": 84, "depth": 56 },
    
    "price": { "amount": 849.99, "currency": "EUR" },
    
    "availability": "available",
    "releaseDate": "2017-10-01",
    "retirementDate": null,
    
    "instructionsUrl": "https://www.lego.com/service/buildinginstructions/75192",
    "barcodes": { "upc": "673419267533", "ean": "5702015869935" },
    
    "rating": { "average": 4.8, "count": 1234 }
  }
}
```

---

## Réponse de Recherche

```json
{
  "success": true,
  "provider": "brickset",
  "domain": "construction-toys",
  "query": "millennium falcon",
  "total": 42,
  "count": 20,
  
  "data": [
    { /* Item normalisé */ },
    { /* Item normalisé */ },
    ...
  ],
  
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalResults": 42,
    "totalPages": 3,
    "hasMore": true
  },
  
  "meta": {
    "fetchedAt": "2026-01-28T14:30:00.000Z",
    "lang": "en",
    "cached": false,
    "cacheAge": null
  }
}
```

---

## Réponse de Détail

```json
{
  "success": true,
  "provider": "brickset",
  "domain": "construction-toys",
  "id": "brickset:31754",
  
  "data": {
    /* Item normalisé complet */
  },
  
  "meta": {
    "fetchedAt": "2026-01-28T14:30:00.000Z",
    "lang": "en",
    "cached": true,
    "cacheAge": 3600
  }
}
```

---

## Types de Contenu et leurs Détails

### `construct_toy` (Jouets de construction)

| Champ | Type | Description |
|-------|------|-------------|
| `brand` | string | Marque (LEGO, Playmobil...) |
| `theme` | string? | Thème (Star Wars, City...) |
| `subtheme` | string? | Sous-thème |
| `category` | string? | Catégorie |
| `setNumber` | string? | Numéro de set |
| `pieceCount` | number? | Nombre de pièces |
| `minifigCount` | number? | Nombre de minifigs |
| `ageRange` | object? | `{ min, max }` |
| `dimensions` | object? | `{ height, width, depth }` en cm |
| `price` | object? | `{ amount, currency }` |
| `availability` | enum | available, retired, coming_soon... |
| `releaseDate` | string? | Date ISO |
| `retirementDate` | string? | Date ISO |
| `instructionsUrl` | string? | URL des instructions |
| `barcodes` | object? | `{ upc, ean }` |
| `rating` | object? | `{ average, count }` |

### `book` (Livres)

| Champ | Type | Description |
|-------|------|-------------|
| `authors` | string[] | Auteurs |
| `illustrators` | string[] | Illustrateurs |
| `publisher` | string? | Éditeur |
| `isbn10` | string? | ISBN-10 |
| `isbn13` | string? | ISBN-13 |
| `format` | enum | hardcover, paperback, ebook... |
| `pageCount` | number? | Nombre de pages |
| `language` | string? | Code ISO (fr, en...) |
| `genres` | string[] | Genres |
| `series` | object? | `{ name, volume, totalVolumes }` |
| `publicationDate` | string? | Date ISO |
| `rating` | object? | `{ average, count }` |

### `videogame` (Jeux vidéo)

| Champ | Type | Description |
|-------|------|-------------|
| `developers` | string[] | Studios de développement |
| `publishers` | string[] | Éditeurs |
| `platforms` | string[] | Plateformes (PC, PS5...) |
| `genres` | string[] | Genres |
| `releaseDate` | string? | Date ISO |
| `esrb` | string? | Classification ESRB |
| `pegi` | number? | Classification PEGI |
| `rating` | object? | `{ metacritic, userScore, count }` |
| `multiplayer` | object? | `{ local, online, maxPlayers }` |

### `movie` (Films)

| Champ | Type | Description |
|-------|------|-------------|
| `directors` | string[] | Réalisateurs |
| `cast` | object[] | `[{ name, character, order }]` |
| `studios` | string[] | Studios de production |
| `genres` | string[] | Genres |
| `runtime` | number? | Durée en minutes |
| `releaseDate` | string? | Date ISO |
| `certification` | string? | PG-13, R... |
| `rating` | object? | `{ imdb, tmdb, rottenTomatoes, voteCount }` |
| `collection` | object? | `{ name, part }` pour les franchises |

### `series` (Séries TV)

| Champ | Type | Description |
|-------|------|-------------|
| `creators` | string[] | Créateurs |
| `networks` | string[] | Diffuseurs (HBO, Netflix...) |
| `genres` | string[] | Genres |
| `seasonCount` | number? | Nombre de saisons |
| `episodeCount` | number? | Nombre total d'épisodes |
| `status` | enum | returning, ended, canceled... |
| `firstAirDate` | string? | Date ISO |
| `rating` | object? | `{ imdb, tmdb, voteCount }` |

### `anime` (Anime)

| Champ | Type | Description |
|-------|------|-------------|
| `mediaType` | enum | tv, movie, ova, ona... |
| `studios` | string[] | Studios d'animation |
| `genres` | string[] | Genres |
| `themes` | string[] | Thèmes (Isekai, Mecha...) |
| `demographics` | string[] | Cibles (Shounen, Seinen...) |
| `episodeCount` | number? | Nombre d'épisodes |
| `status` | enum | airing, finished, upcoming |
| `season` | string? | "Winter 2024" |
| `source` | enum | manga, light_novel, original... |
| `rating` | object? | `{ mal, anilist, count }` |

### `tcg_card` (Cartes à collectionner)

| Champ | Type | Description |
|-------|------|-------------|
| `game` | string | pokemon, magic, yugioh... |
| `set` | object | `{ name, code, series, releaseDate }` |
| `number` | string? | Position dans le set |
| `rarity` | string? | Common, Rare... |
| `finish` | string[] | Holofoil, Reverse Holo... |
| `artist` | string? | Illustrateur |
| `prices` | object? | `{ market, low, mid, high, currency }` |
| `legality` | object? | Statut par format |

### `board_game` (Jeux de société)

| Champ | Type | Description |
|-------|------|-------------|
| `designers` | string[] | Créateurs |
| `publishers` | string[] | Éditeurs |
| `players` | object? | `{ min, max, recommended }` |
| `playingTime` | object? | `{ min, max }` en minutes |
| `minAge` | number? | Âge minimum |
| `complexity` | number? | 1-5 (BGG weight) |
| `categories` | string[] | Strategy, Family... |
| `mechanics` | string[] | Deck Building... |
| `rating` | object? | `{ bgg, count, rank }` |

---

## Avantages de cette Architecture

1. **Prédictibilité** : Le client sait toujours où trouver `id`, `title`, `images`, etc.
2. **Compatibilité** : Facile de comparer des items de différents providers
3. **Extensibilité** : Ajouter des champs dans `details` ne casse pas le schéma
4. **Validation** : Zod valide automatiquement la structure
5. **Documentation** : Un seul format à documenter et maintenir
