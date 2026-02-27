# 🔍 Rapport d'Audit - Incohérences des Normalizers

**Date** : 27 février 2026  
**Version Tako API** : 1.0.12  
**Statut** : ⚠️ **INCOHÉRENCES CRITIQUES DÉTECTÉES**

---

## 📊 Résumé Exécutif

**PROBLÈME PRINCIPAL** : Les normalizers de l'API Tako utilisent **deux architectures différentes** qui produisent des structures JSON incompatibles entre les domaines.

**IMPACT** : 
- ❌ L'application tierce ne peut pas importer correctement les données
- ❌ Les champs comme `price`, `setNumber`, `pieceCount` sont dans `data.details.xxx` au lieu de `data.xxx`
- ❌ Impossible de mapper uniformément les champs entre domaines

---

## 🏗️ Architecture Actuelle

### ✅ Architecture A : BaseNormalizer (Ancien - **WRAPPING**)

**Domaines concernés** :
- `construction-toys` : Lego, Rebrickable, Brickset, Mega, Playmobil, Klickypedia
- `books` : GoogleBooks, OpenLibrary
- `comics` : ComicVine, Bedetheque
- `media` : Tmdb, Tvdb
- `anime-manga` : MangaUpdates

**Structure de sortie** :
```json
{
  "success": true,
  "provider": "lego",
  "data": {
    "id": "lego:75192",
    "type": "construct_toy",
    "source": "lego",
    "sourceId": "75192",
    "title": "75192 Millennium Falcon",
    "description": "...",
    "year": 2017,
    "images": { "primary": "...", "thumbnail": "...", "gallery": [] },
    "urls": { "source": "...", "detail": "/api/construction-toys/lego/75192" },
    "details": {                    // ⚠️ WRAPPING ICI
      "brand": "LEGO",
      "theme": "Star Wars",
      "setNumber": "75192",         // ❌ Devrait être à plat
      "pieceCount": 7541,           // ❌ Devrait être à plat
      "minifigCount": 8,
      "price": {                    // ❌ Devrait être à plat
        "amount": 849.99,
        "currency": "EUR"
      },
      "availability": "available",
      "ageRange": { "min": 18, "max": null }
    }
  }
}
```

**Champs du tronc commun** : `id`, `type`, `source`, `sourceId`, `title`, `description`, `year`, `images`, `urls`  
**Champs spécifiques** : **TOUS wrappés dans `details`**

---

### ✅ Architecture B : Functional Normalizers (Récent - **PLAT**)

**Domaines concernés** :
- `videogames` : RAWG, IGDB, JVC, ConsoleVariations
- `boardgames` : BGG
- `collectibles` : LuluBerlu, Coleka, Transformerland
- `ecommerce` : Amazon

**Structure de sortie** :
```json
{
  "id": "rawg-3498",
  "sourceId": 3498,
  "source": "rawg",
  "title": "Grand Theft Auto V",
  "slug": "grand-theft-auto-v",
  "description": "...",
  "descriptionHtml": "...",
  "releaseDate": "2013-09-17",
  "rating": 8.6,
  "cover": "https://...",
  "coverThumb": "https://...",
  "platforms": ["PlayStation 3", "Xbox 360", "PC"],      // ✅ Champs à plat
  "genres": ["Action", "Adventure"],                      // ✅ Champs à plat
  "developers": ["Rockstar North"],                       // ✅ Champs à plat
  "publishers": ["Rockstar Games"],                       // ✅ Champs à plat
  "esrbRating": "M",
  "metacritic": 96,
  "playtime": 100
}
```

**Champs du tronc commun** : `id`, `source`, `sourceId`, `title`, `description`  
**Champs spécifiques** : **Directement dans l'objet racine**

---

## ❌ Incohérences Critiques Identifiées

### 1️⃣ **Structure `details` vs Champs à plat**

| Domain | Provider | Structure | Exemple de champs |
|--------|----------|-----------|-------------------|
| construction-toys | Lego | `data.details.xxx` | `details.setNumber`, `details.pieceCount`, `details.price` |
| construction-toys | Rebrickable | `data.details.xxx` | `details.setNumber`, `details.pieceCount`, `details.theme` |
| videogames | RAWG | `data.xxx` | `developers`, `publishers`, `platforms`, `genres` |
| videogames | IGDB | `data.xxx` | `developers`, `publishers`, `platforms`, `genres` |
| books | GoogleBooks | `data.details.xxx` | `details.isbn`, `details.pageCount`, `details.authors` |
| boardgames | BGG | `data.xxx` | `players`, `ages`, `playTime`, `complexity` |

**Problème** : L'application externe s'attend à trouver les champs au même niveau, mais ils sont à des profondeurs différentes selon le domaine.

---

### 2️⃣ **Nomenclature des champs incohérente**

#### Exemple : Images

| Provider | Champs images |
|----------|---------------|
| Lego (BaseNormalizer) | `images: { primary, thumbnail, gallery }` |
| RAWG (Functional) | `cover`, `coverThumb`, `backgroundAdditional` |
| IGDB (Functional) | `cover`, `screenshots`, `artworks` |

#### Exemple : Identifiants

| Provider | Champs ID |
|----------|-----------|
| Lego | `id: "lego:75192"`, `sourceId: "75192"` |
| RAWG | `id: "rawg-3498"`, `sourceId: 3498` |
| Rebrickable | `id: "rebrickable:75192-1"`, `sourceId: "75192-1"` |

#### Exemple : Prix

| Provider | Champ prix |
|----------|------------|
| Lego | `details.price: { amount, currency, formatted }` |
| Amazon | `price: { value, currency, display }` |
| Rebrickable | `details.price: null` (non disponible) |

---

### 3️⃣ **Wrapper `data` inconsistant**

**BaseNormalizer** (via `normalizeDetailResponse`) :
```json
{
  "success": true,
  "provider": "lego",
  "data": { ... }  // ✅ Wrapper data
}
```

**Functional Normalizers** (RAWG, IGDB) :
```json
{
  "success": true,
  "source": "rawg",
  "data": { ... }  // ✅ Wrapper data aussi
}
```

✅ **Cohérent** sur ce point.

---

### 4️⃣ **Métadonnées incohérentes**

**BaseNormalizer** :
```json
{
  "meta": {
    "fetchedAt": "2026-02-27T...",
    "lang": "en",
    "cached": false,
    "cacheAge": null
  }
}
```

**Functional Normalizers** :
```json
// ❌ Pas de métadonnées standardisées
```

---

## 📏 Cahier des Charges Original

D'après l'analyse du code, le cahier des charges prévoyait :

### Tronc Commun (TOUS les items)
```typescript
{
  id: string;               // Format "source:sourceId"
  type: string;             // Type de contenu
  source: string;           // Provider d'origine
  sourceId: string;         // ID chez le provider
  title: string;            // Titre principal
  titleOriginal?: string;   // Titre original (optionnel)
  description?: string;     // Description
  year?: number;            // Année
  images: {                 // Images normalisées
    primary: string | null;
    thumbnail: string | null;
    gallery: string[];
  };
  urls: {                   // URLs normalisées
    source: string | null;    // URL chez le provider
    detail: string;           // URL Tako API
  };
}
```

### Détails Spécifiques au Domaine

**Construction Toys** (`construct_toy`) :
```typescript
{
  brand?: string;
  theme?: string;
  setNumber?: string;
  pieceCount?: number;
  minifigCount?: number;
  price?: { amount: number, currency: string };
  availability?: string;
  ageRange?: { min: number, max?: number };
}
```

**Video Games** (`videogame`) :
```typescript
{
  releaseDate?: string;
  platforms?: string[];
  genres?: string[];
  developers?: string[];
  publishers?: string[];
  rating?: number;
  metacritic?: number;
  esrbRating?: string;
}
```

**Books** (`book`) :
```typescript
{
  authors?: string[];
  publisher?: string;
  isbn?: string;
  isbn10?: string;
  isbn13?: string;
  pageCount?: number;
  language?: string;
}
```

---

## ✅ Solution Proposée

### Option 1 : **Migrer TOUS les normalizers vers Functional (RECOMMANDÉ)**

**Avantages** :
- ✅ Structure plus simple et intuitive
- ✅ Moins de niveaux d'imbrication
- ✅ Plus facile à mapper pour les applications externes
- ✅ Performance légèrement meilleure (moins d'objets)

**Inconvénients** :
- ⚠️ Nécessite de modifier TOUS les normalizers BaseNormalizer
- ⚠️ Breaking change pour les consommateurs de l'API
- ⚠️ Temps de développement significatif

**Structure cible** :
```json
{
  "success": true,
  "provider": "lego",
  "data": {
    "id": "lego:75192",
    "source": "lego",
    "sourceId": "75192",
    "type": "construct_toy",
    "title": "75192 Millennium Falcon",
    "description": "...",
    "year": 2017,
    "images": { "primary": "...", "thumbnail": "...", "gallery": [] },
    
    // ✅ Champs spécifiques DIRECTEMENT ici
    "brand": "LEGO",
    "theme": "Star Wars",
    "setNumber": "75192",
    "pieceCount": 7541,
    "minifigCount": 8,
    "price": { "amount": 849.99, "currency": "EUR" },
    "availability": "available",
    "ageRange": { "min": 18, "max": null }
  },
  "meta": {
    "fetchedAt": "2026-02-27T...",
    "lang": "fr",
    "cached": false
  }
}
```

---

### Option 2 : **Migrer les Functional vers BaseNormalizer**

**Avantages** :
- ✅ Utilise l'architecture existante
- ✅ Séparation claire tronc commun / détails

**Inconvénients** :
- ❌ Structure plus complexe et imbriquée
- ❌ Plus difficile à mapper pour les applications externes
- ❌ Moins intuitif pour les développeurs

**Structure cible** :
```json
{
  "data": {
    "id": "rawg-3498",
    "title": "Grand Theft Auto V",
    "description": "...",
    
    "details": {              // ⚠️ Wrapper supplémentaire
      "platforms": [...],
      "genres": [...],
      "developers": [...],
      "publishers": [...]
    }
  }
}
```

---

### Option 3 : **Créer un système de migration progressif**

1. **Phase 1** : Déprécier BaseNormalizer
2. **Phase 2** : Créer des versions v2 des endpoints avec structure plate
3. **Phase 3** : Supprimer les anciens endpoints après période de transition

---

## 🎯 Recommandation

### ✅ **RECOMMANDATION : Option 1 (Structure Plate)**

**Raisons** :
1. **Simplicité** : Structure plus intuitive pour les développeurs
2. **Performance** : Moins de niveaux d'imbrication
3. **Cohérence** : Aligne tous les domaines sur la même architecture
4. **Mapping** : Plus facile pour les applications externes

**Plan d'action suggéré** :

1. **Créer un nouveau BaseNormalizer v2** qui retourne une structure plate
2. **Migrer progressivement chaque domaine** :
   - Construction-toys (6 providers)
   - Books (2 providers)
   - Comics (2 providers)
   - Media (2 providers)
   - Anime-manga (1 provider)
3. **Maintenir la compatibilité** avec un paramètre `?legacy=true` pendant 3 mois
4. **Documenter la migration** pour les consommateurs de l'API

---

## 📋 Liste des Normalizers à Migrer

### ⚠️ Priorité Haute (Construction Toys - problème reporté)
- [ ] `lego.normalizer.js` (467 lignes)
- [ ] `rebrickable.normalizer.js` (268 lignes)
- [ ] `brickset.normalizer.js`
- [ ] `playmobil.normalizer.js`
- [ ] `mega.normalizer.js`
- [ ] `klickypedia.normalizer.js`

### 🟡 Priorité Moyenne (Books & Comics)
- [ ] `googlebooks.normalizer.js` (180 lignes)
- [ ] `openlibrary.normalizer.js`
- [ ] `comicvine.normalizer.js`
- [ ] `bedetheque.normalizer.js`

### 🟢 Priorité Basse (Media & Anime)
- [ ] `tmdb.normalizer.js`
- [ ] `tvdb.normalizer.js`
- [ ] `mangaupdates.normalizer.js`

**Total** : 13 normalizers à migrer

---

## 🧪 Tests Requis Après Migration

Pour chaque normalizer migré :

1. ✅ Vérifier que la structure correspond au schéma cible
2. ✅ Tester la recherche (search)
3. ✅ Tester les détails (getById)
4. ✅ Vérifier la compatibilité avec l'application externe
5. ✅ Mettre à jour la documentation OpenAPI
6. ✅ Tester les cas edge (missing data, null values)

---

## 📊 Impact sur l'Application Externe

**Avant migration** :
```javascript
// ❌ Mapping incohérent
if (data.details?.setNumber) {
  // construction-toys
  item.set_num = data.details.setNumber;
  item.pieces = data.details.pieceCount;
  item.price = data.details.price?.amount;
} else if (data.developers) {
  // videogames
  item.developers = data.developers;
  item.platforms = data.platforms;
}
```

**Après migration** :
```javascript
// ✅ Mapping uniforme
item.title = data.title;
item.description = data.description;
item.year = data.year;
item.images = data.images;

// Champs spécifiques selon type
if (data.type === 'construct_toy') {
  item.set_num = data.setNumber;
  item.pieces = data.pieceCount;
  item.price = data.price?.amount;
} else if (data.type === 'videogame') {
  item.developers = data.developers;
  item.platforms = data.platforms;
}
```

---

## 🔗 Fichiers à Modifier

### Core
- `src/core/normalizers/BaseNormalizer.js` - Créer v2 ou adapter

### Construction Toys
- `src/domains/construction-toys/normalizers/*.normalizer.js` (6 fichiers)
- `src/domains/construction-toys/providers/*.provider.js` (adapter les appels)

### Books
- `src/domains/books/normalizers/*.normalizer.js` (2 fichiers)

### Comics, Media, Anime
- `src/domains/{comics,media,anime-manga}/normalizers/*.js` (5 fichiers)

### Documentation
- `docs/API_ROUTES.md` - Mettre à jour les exemples de réponses
- `docs/api/*.openapi.yaml` - Mettre à jour les schémas

---

## 📞 Questions Ouvertes

1. **Breaking change acceptable ?** Migration nécessite un changement de version majeure (2.0.0) ?
2. **Période de transition ?** Combien de temps maintenir la compatibilité legacy ?
3. **Priorisation ?** Migrer tous les domaines d'un coup ou progressivement ?
4. **Tests automatisés ?** Créer des snapshots tests pour valider les migrations ?

---

**Conclusion** : L'incohérence est confirmée et critique. La migration vers une structure plate (Option 1) est fortement recommandée pour résoudre les problèmes d'import de l'application externe.
