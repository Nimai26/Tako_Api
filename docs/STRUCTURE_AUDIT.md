# 🔍 Audit Structure JSON - TOUS les Providers

**Date** : 27 février 2026  
**Objectif** : Vérifier que TOUS les providers retournent un format JSON cohérent

---

## 🎯 Format Cible Attendu

Tous les endpoints doivent retourner :

### Recherche
```json
{
  "query": "millennium falcon",
  "total": 150,
  "pagination": { "page": 1, "pageSize": 24, "totalResults": 150, "hasMore": true },
  "data": [
    {
      "id": "source:123",
      "title": "...",
      "...": "champs spécifiques à plat"
    }
  ],
  "source": "lego"
}
```

### Détails
```json
{
  "success": true,
  "provider": "lego",
  "domain": "construction-toys",
  "id": "lego:75192",
  "data": {
    "id": "lego:75192",
    "title": "Millennium Falcon",
    "setNumber": "75192",          // ← Champs à PLAT dans data
    "pieceCount": 7541,
    "price": { "amount": 849.99 }
  },
  "meta": {
    "fetchedAt": "2026-02-27T...",
    "lang": "fr",
    "cached": false
  }
}
```

---

## 📊 Analyse par Provider

### Construction Toys

#### 1. LEGO

**normalizeDetailResponse** : Utilise `BaseNormalizer.normalizeDetailResponse()`

**Structure retournée** :
```json
{
  "success": true,
  "provider": "lego", 
  "domain": "construction-toys",
  "id": "lego:75192",
  "data": {
    "setNumber": "75192",  // ✅ À plat après migration v2.0.0
    "pieceCount": 7541
  },
  "meta": { "fetchedAt": "...", "lang": "fr", "cached": false }
}
```

**Status** : ✅ **CONFORME** après migration v2.0.0

---

#### 2. Rebrickable

**Status** : ✅ **CONFORME** après migration v2.0.0

---

#### 3. Brickset

**Status** : ✅ **CONFORME** après migration v2.0.0

---

#### 4. Mega

**Status** : ✅ **CONFORME** après migration v2.0.0

---

#### 5. Playmobil

**Status** : ✅ **CONFORME** après migration v2.0.1 (wrapper ajouté)

---

#### 6. Klickypedia

**Status** : ✅ **CONFORME** après migration v2.0.1 (wrapper ajouté)

---

### Books

#### 7. GoogleBooks

**Status** : ✅ **CONFORME** après migration v2.0.1 (wrapper ajouté)

---

#### 8. OpenLibrary

**Status** : ✅ **CONFORME** après migration v2.0.1 (wrapper ajouté)

---

### Comics

#### 9. ComicVine

**Status** : ✅ **CONFORME** après migration v2.0.1 (wrapper ajouté)

---

#### 10. Bedetheque

**normalizeDetailResponse** : Utilise méthodes custom (`normalizeAlbumDetail`, `normalizeSerieDetail`)

**Status** : ⚠️ **À VÉRIFIER**

---

### Media

#### 11. TMDB

**normalizeDetailResponse** : Utilise méthodes custom (`normalizeMovieDetail`, `normalizeSeriesDetail`)

**Status** : ⚠️ **À VÉRIFIER**

---

#### 12. TVDB

**normalizeDetailResponse** : Utilise méthodes custom (`normalizeMovieDetail`, `normalizeSeriesDetail`)

**Status** : ⚠️ **À VÉRIFIER**

---

### Anime-Manga

#### 13. MangaUpdates

**normalizeDetailResponse** : Utilise méthode custom (`normalizeSeriesDetails`)

**Status** : ⚠️ **À VÉRIFIER**

---

#### 14. Jikan

**normalizeDetailResponse** : Pas de méthode de détails unifiée

**Status** : ⚠️ **À VÉRIFIER**

---

## ❌ Problème Identifié

**INCOHÉRENCE MAJEURE** : Les providers retournent 2 formats différents :

### Format A (BaseNormalizer) - 4 providers
```json
{
  "success": true,
  "provider": "...",
  "data": { ... },    // ← Données dans data
  "meta": { ... }
}
```
Utilisé par : LEGO, Rebrickable, Brickset, Mega

### Format B (Custom) - 10+ providers
```json
{
  "sourceId": "...",
  "provider": "...",
  ...                 // ← Données à la racine
}
```
Utilisé par : Playmobil, Klickypedia, GoogleBooks, OpenLibrary, ComicVine, Bedetheque, TMDB, TVDB, MangaUpdates, Jikan

---

## ✅ Solution Requise

Pour avoir un format 100% cohérent, il faut choisir :

### Option 1 : Tous utilisent le wrapper BaseNormalizer
- Modifier Playmobil, Klickypedia, etc. pour qu'ils retournent `{ success, data, meta }`
- **Avantage** : Métadonnées unifiées (fetchedAt, lang, cached)
- **Inconvénient** : Plus verbeux

### Option 2 : Tous retournent un format plat
- Modifier LEGO, Rebrickable, Brickset, Mega pour surcharger `normalizeDetailResponse()` complètement
- **Avantage** : Plus simple et direct
- **Inconvénient** : Perd les métadonnées standardisées

### Option 3 : Wrapper au niveau des routes
- Les routes wrappent tous les résultats uniformément
- **Avantage** : Normalisation centralisée
- **Inconvénient** : Logique de wrapping dupliquée

---

## 🎯 Recommandation

**Option 1** est recommandée car :
1. Les métadonnées `meta` sont précieuses (cache, langue, timestamp)
2. Le wrapper `{ success, data, meta }` est déjà utilisé par 4 providers
3. Facile à implémenter : juste wrapper le résultat dans les normalizers custom

---

## 📋 Actions Requises

### Phase 1 : Construction Toys
- [x] LEGO - Conforme (utilise BaseNormalizer)
- [x] Rebrickable - Conforme (utilise BaseNormalizer)
- [x] Brickset - Conforme (utilise BaseNormalizer)
- [x] Mega - Conforme (utilise BaseNormalizer)
- [ ] **Playmobil** - Ajouter wrapper `{ success, data, meta }`
- [ ] **Klickypedia** - Ajouter wrapper `{ success, data, meta }`

### Phase 2 : Books
- [ ] **GoogleBooks** - Ajouter wrapper
- [ ] **OpenLibrary** - Ajouter wrapper

### Phase 3 : Comics
- [ ] **ComicVine** - Vérifier et ajouter wrapper
- [ ] **Bedetheque** - Vérifier et ajouter wrapper

### Phase 4 : Media
- [ ] **TMDB** - Vérifier et ajouter wrapper
- [ ] **TVDB** - Vérifier et ajouter wrapper

### Phase 5 : Anime-Manga
- [ ] **MangaUpdates** - Vérifier et ajouter wrapper
- [ ] **Jikan** - Vérifier et ajouter wrapper

---

## 🧪 Tests de Validation

Pour chaque provider, vérifier :
```bash
curl http://localhost:3000/api/{domain}/{provider}/{id}
```

Doit retourner :
```json
{
  "success": true,
  "provider": "...",
  "domain": "...",
  "id": "...",
  "data": {
    // Tous les champs à plat, sans nested details
  },
  "meta": {
    "fetchedAt": "...",
    "lang": "...",
    "cached": false
  }
}
```
