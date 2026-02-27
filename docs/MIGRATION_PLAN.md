# 📋 Plan de Migration des Normalizers - Tako API 1.0.12 → 2.0.0

**Date de création** : 27 février 2026  
**Objectif** : Migrer tous les normalizers BaseNormalizer vers une structure plate  
**Breaking Change** : OUI - Nécessite bump version 2.0.0  
**Zero Data Loss** : OUI - Tous les champs existants doivent être préservés

---

## 🎯 Objectif de la Migration

**AVANT (BaseNormalizer - Structure wrappée)** :
```json
{
  "data": {
    "id": "lego:75192",
    "title": "...",
    "details": {
      "setNumber": "75192",
      "pieceCount": 7541,
      "price": {...}
    }
  }
}
```

**APRÈS (Structure plate)** :
```json
{
  "data": {
    "id": "lego:75192",
    "title": "...",
    "setNumber": "75192",
    "pieceCount": 7541,
    "price": {...}
  }
}
```

---

## 📊 Inventaire Complet des Normalizers

### ✅ Déjà Conformes (Structure Plate) - PAS DE MIGRATION

| Domain | Provider | Normalizer Type | Status |
|--------|----------|-----------------|--------|
| videogames | RAWG | Functional | ✅ OK |
| videogames | IGDB | Functional | ✅ OK |
| videogames | JVC | Functional | ✅ OK |
| videogames | ConsoleVariations | Functional | ✅ OK |
| boardgames | BGG | Functional | ✅ OK |
| collectibles | LuluBerlu | Functional | ✅ OK |
| collectibles | Coleka | Functional | ✅ OK |
| collectibles | Transformerland | Functional | ✅ OK |
| collectibles | Paninimania | Functional | ✅ OK |
| ecommerce | Amazon | Functional | ✅ OK |
| tcg | Pokemon | TCG Specific | ✅ OK |
| tcg | MTG | TCG Specific | ✅ OK |
| tcg | YuGiOh | TCG Specific | ✅ OK |
| tcg | Digimon | TCG Specific | ✅ OK |
| tcg | OnePiece | TCG Specific | ✅ OK |
| tcg | Lorcana | TCG Specific | ✅ OK |
| music | Deezer | Music Specific | ✅ OK |
| music | iTunes | Music Specific | ✅ OK |
| music | Discogs | Music Specific | ✅ OK |
| music | MusicBrainz | Music Specific | ✅ OK |

**Total OK** : 20 providers

---

### ⚠️ À Migrer (BaseNormalizer - Structure Wrappée)

#### 🔴 PRIORITÉ 1 - Construction Toys (6 providers)

##### 1. **LEGO** (lego.normalizer.js - 467 lignes)

**Fichier** : `src/domains/construction-toys/normalizers/lego.normalizer.js`

**Méthode actuelle** : `extractDetails()` ligne 167-250

**Champs dans `details`** :
```javascript
{
  // Marque et classification
  brand: 'LEGO',
  theme: string,
  subtheme: string | null,
  category: string | null,
  
  // Spécifications
  setNumber: string,
  pieceCount: number,
  minifigCount: number,
  
  // Âge
  ageRange: { min: number, max: number | null } | null,
  
  // Dimensions
  dimensions: null,
  
  // Prix
  price: { amount: number, currency: string, formatted: string } | null,
  listPrice: { amount: number, currency: string } | null,
  onSale: boolean,
  salePercentage: number | null,
  
  // Disponibilité
  availability: 'available' | 'out_of_stock' | 'coming_soon' | 'retired' | 'unknown',
  availabilityText: string | null,
  canAddToBag: boolean | null,
  isNew: boolean,
  
  // Dates
  releaseDate: string | null,
  retirementDate: null,
  
  // Instructions
  instructionsUrl: string | null,
  instructions: {
    count: number,
    manuals: Array<{ id, description, pdfUrl, sequence }>,
    url: string
  } | null,
  
  // Identifiants additionnels
  barcodes: null,
  sku: string | null,
  slug: string | null,
  
  // Ratings
  rating: { average: number, count: number } | null,
  
  // Vidéos
  videos: Array<any>
}
```

**Champs du tronc commun** :
- `id`: "lego:75192"
- `type`: "construct_toy"
- `source`: "lego"
- `sourceId`: "75192"
- `title`: "75192 Millennium Falcon"
- `titleOriginal`: null
- `description`: string
- `year`: number | null
- `images`: { primary, thumbnail, gallery }
- `urls`: { source, detail }

**Action** : Remonter TOUS les champs de `details` vers data racine

---

##### 2. **Rebrickable** (rebrickable.normalizer.js - 268 lignes)

**Fichier** : `src/domains/construction-toys/normalizers/rebrickable.normalizer.js`

**Méthode actuelle** : `extractDetails()` ligne 142-220

**Champs dans `details`** :
```javascript
{
  // Marque et classification
  brand: 'LEGO',
  theme: string | null,  // Via THEME_MAP
  subtheme: null,
  category: null,
  
  // Spécifications
  setNumber: string,  // Sans suffixe -1
  pieceCount: number,
  minifigCount: number | null,
  
  // Âge
  ageRange: null,
  
  // Dimensions
  dimensions: null,
  
  // Prix
  price: null,
  
  // Disponibilité
  availability: 'unknown',
  releaseDate: string | null,  // Format YYYY-01-01
  retirementDate: null,
  
  // Instructions
  instructionsUrl: null,
  
  // Barcodes
  barcodes: null,
  
  // Ratings
  rating: null,
  
  // ══════════════════════════════════════════════════════════════════════
  // DONNÉES ENRICHIES REBRICKABLE (optionnelles)
  // ══════════════════════════════════════════════════════════════════════
  
  // Pièces détaillées (si enrichi)
  parts: {
    totalCount: number,
    uniqueCount: number,
    spareCount: number,
    items: Array<{
      partNum, name, category, color, colorRgb,
      quantity, isSpare, imageUrl, elementId
    }>
  } | null,
  
  // Minifigs détaillées (si enrichi)
  minifigs: {
    count: number,
    items: Array<{
      figNum, name, quantity, numParts, imageUrl
    }>
  } | null,
  
  // Métadonnées Rebrickable
  rebrickable: {
    setNum: string,  // Avec suffixe -1
    themeId: number,
    lastModified: string
  }
}
```

**Champs du tronc commun** : Identique à LEGO

**Action** : Remonter TOUS les champs, préserver `parts`, `minifigs`, `rebrickable`

---

##### 3. **Brickset** (brickset.normalizer.js - 211 lignes)

**Fichier** : `src/domains/construction-toys/normalizers/brickset.normalizer.js`

**Méthode actuelle** : `extractDetails()` ligne 106-150

**Champs dans `details`** :
```javascript
{
  // Marque et classification
  brand: 'LEGO',
  theme: string,
  subtheme: string | null,
  category: string | null,
  
  // Spécifications
  setNumber: string,
  pieceCount: number,
  minifigCount: number,
  
  // Âge
  ageRange: { min: number | null, max: number | null } | null,
  
  // Dimensions
  dimensions: {
    height: number | null,
    width: number | null,
    depth: number | null
  } | null,
  
  // Prix
  price: { amount: number, currency: 'EUR' } | null,
  
  // Disponibilité
  availability: string,  // Via mapAvailability()
  releaseDate: string | null,  // ISO date ou YYYY-01-01
  retirementDate: null,
  
  // Instructions
  instructionsUrl: string | null,  // Si instructionsCount > 0
  
  // Barcodes
  barcodes: {
    upc: string | null,
    ean: string | null
  },
  
  // Ratings
  rating: {
    average: number,
    count: number
  } | null
}
```

**Champs du tronc commun** : Identique à LEGO

**Action** : Remonter TOUS les champs, préserver `dimensions`, `barcodes`

---

##### 4. **Mega** (mega.normalizer.js - 520 lignes)

**Fichier** : `src/domains/construction-toys/normalizers/mega.normalizer.js`

**Méthode actuelle** : `extractDetails()` ligne 98-340

**Champs dans `details`** :
```javascript
{
  // Marque et classification
  brand: 'Mega Construx' | 'Mega Bloks',
  theme: string | null,
  subtheme: null,
  category: string | null,
  
  // Spécifications
  setNumber: string,
  pieceCount: number | null,
  minifigCount: null,  // Pas de concept minifig chez Mega
  
  // Âge
  ageRange: { min: number | null, max: number | null } | null,
  
  // Dimensions (packaging)
  dimensions: {
    height: number | null,
    width: number | null,
    depth: number | null,
    weight: number | null,
    unit: 'cm' | 'g'
  } | null,
  
  // Prix
  price: { amount: number, currency: string, formatted: string } | null,
  
  // Disponibilité
  availability: string,
  availabilityText: string | null,
  
  // Dates
  releaseDate: string | null,
  retirementDate: null,
  
  // Instructions
  instructionsUrl: string | null,
  
  // Barcodes
  barcodes: {
    upc: string | null,
    ean: string | null,
    asin: string | null
  },
  
  // Identifiants additionnels
  sku: string | null,
  mpn: string | null,  // Manufacturer Part Number
  
  // Ratings (si disponibles)
  rating: {
    average: number,
    count: number,
    source: string
  } | null,
  
  // Métadonnées Mega
  mega: {
    franchise: string | null,
    line: string | null,  // Ligne de produit
    scale: string | null
  }
}
```

**Champs du tronc commun** : Identique à LEGO

**Action** : Remonter TOUS les champs, préserver `dimensions.weight`, `mega`

---

##### 5. **Playmobil** (playmobil.normalizer.js - 223 lignes)

**Fichier** : `src/domains/construction-toys/normalizers/playmobil.normalizer.js`

**Méthode actuelle** : Surcharge `normalizeDetailResponse()` ligne 93

**⚠️ ATTENTION** : N'hérite PAS de BaseNormalizer.normalize(), retourne directement une structure custom

**Champs actuels** (structure custom, PAS dans `details`) :
```javascript
{
  // Identifiants
  sourceId: string,
  provider: 'playmobil',
  brand: 'Playmobil',
  
  // Nom et description
  name: string,
  description: string | null,
  
  // Codes
  productCode: string,
  slug: string,
  
  // URLs
  src_url: string,
  playmobil_url: string,
  
  // Images
  images: Array<{ url, type, size }>,
  
  // Prix
  price: { value: number, currency: string, display: string } | null,
  discountPrice: { value: number, currency: string, display: string } | null,
  currency: string,
  
  // Classification
  category: string,
  
  // Attributs
  attributes: {
    pieceCount: number,
    ageRange: string,
    canAddToBag: boolean
  },
  
  // Instructions
  instructions: any | null,
  
  // Métadonnées
  metadata: {
    source: 'playmobil',
    type: 'official',
    lang: string,
    note: 'Données officielles Playmobil'
  }
}
```

**Action** : 
1. Hériter de BaseNormalizer.normalize()
2. Aplatir `attributes` vers data racine
3. Garder structure compatible avec tronc commun

---

##### 6. **Klickypedia** (klickypedia.normalizer.js - 215 lignes)

**Fichier** : `src/domains/construction-toys/normalizers/klickypedia.normalizer.js`

**Méthode actuelle** : Surcharge `normalizeDetailResponse()` ligne 91

**⚠️ ATTENTION** : N'hérite PAS de BaseNormalizer.normalize(), retourne directement une structure custom

**Champs actuels** (structure custom, PAS dans `details`) :
```javascript
{
  // Identifiants
  sourceId: string,
  provider: 'klickypedia',
  brand: 'Playmobil',
  
  // Nom et description
  name: string,
  localizedName: string,
  translations: { [lang]: string },
  description: string | null,
  
  // Codes
  productCode: string,
  slug: string,
  ean: null,
  
  // URLs
  src_url: string,
  klickypedia_url: string,
  
  // Images
  images: Array<{ url, type, size }>,
  
  // Classification
  theme: string,
  format: string,
  tags: string[],
  
  // Dates
  released: string,
  discontinued: string | null,
  
  // Contenu
  figureCount: number,
  
  // Instructions
  instructions: any | null,
  
  // Métadonnées
  metadata: {
    source: 'klickypedia',
    type: 'encyclopedia',
    note: 'Données encyclopédiques - pas de prix disponible'
  }
}
```

**Action** : 
1. Hériter de BaseNormalizer.normalize()
2. Assurer compatibilité avec tronc commun
3. Préserver `translations`, `localizedName`

---

#### 🟡 PRIORITÉ 2 - Books (2 providers)

##### 7. **GoogleBooks** (googlebooks.normalizer.js - 180 lignes)

**Fichier** : `src/domains/books/normalizers/googlebooks.normalizer.js`

**Méthode actuelle** : Hérite BaseNormalizer mais surcharge `normalizeDetailResponse()`

**Champs actuels** :
```javascript
{
  sourceId: string,
  provider: 'googlebooks',
  type: 'book',
  
  // Titre
  title: string,
  subtitle: string | null,
  fullTitle: string,
  
  // Auteurs et éditeur
  authors: string[],
  publisher: string | null,
  
  // Dates
  publishedDate: string,
  year: number,
  
  // Classification
  categories: string[],
  language: string,
  
  // Identifiants
  isbn: string,
  isbn10: string,
  isbn13: string,
  identifiers: {},
  
  // Contenu
  pageCount: number,
  description: string | null,
  synopsis: string | null,
  
  // Images
  images: Array<{ url, type, size }>,
  
  // URLs
  src_url: string,
  googlebooks_url: string,
  previewLink: string,
  
  // Évaluations
  rating: { value: number, count: number } | null,
  
  // Métadonnées
  printType: string,
  maturityRating: string,
  metadata: { source, lang }
}
```

**Action** : Migrer vers structure BaseNormalizer.normalize() avec extractDetails()

---

##### 8. **OpenLibrary** (openlibrary.normalizer.js)

**Fichier** : `src/domains/books/normalizers/openlibrary.normalizer.js`

**Status** : À analyser (similaire à GoogleBooks)

**Action** : Même pattern que GoogleBooks

---

#### 🟢 PRIORITÉ 3 - Comics (2 providers)

##### 9. **ComicVine** (comicvine.normalizer.js)

**Fichier** : `src/domains/comics/normalizers/comicvine.normalizer.js`

**Status** : À analyser

**Action** : Migrer vers structure plate

---

##### 10. **Bedetheque** (bedetheque.normalizer.js)

**Fichier** : `src/domains/comics/normalizers/bedetheque.normalizer.js`

**Status** : À analyser

**Action** : Migrer vers structure plate

---

#### 🟢 PRIORITÉ 4 - Media (2 providers)

##### 11. **TMDB** (tmdb.normalizer.js)

**Fichier** : `src/domains/media/normalizers/tmdb.normalizer.js`

**Status** : À analyser

**Action** : Migrer vers structure plate

---

##### 12. **TVDB** (tvdb.normalizer.js)

**Fichier** : `src/domains/media/normalizers/tvdb.normalizer.js`

**Status** : À analyser

**Action** : Migrer vers structure plate

---

#### 🟢 PRIORITÉ 5 - Anime-Manga (1 provider)

##### 13. **MangaUpdates** (mangaupdates.normalizer.js)

**Fichier** : `src/domains/anime-manga/normalizers/mangaupdates.normalizer.js`

**Status** : À analyser

**Action** : Migrer vers structure plate

---

## 🔧 Plan d'Exécution

### Phase 1 : Préparation

- [x] Audit complet des normalizers
- [x] Création du plan de migration
- [ ] Création des tests de régression pour chaque provider
- [ ] Backup de tous les normalizers actuels

### Phase 2 : Migration Construction Toys (PRIORITÉ 1)

- [ ] 1. LEGO (467 lignes) - 2h estimées
- [ ] 2. Rebrickable (268 lignes) - 1h30 estimée
- [ ] 3. Brickset (211 lignes) - 1h estimée
- [ ] 4. Mega (520 lignes) - 2h30 estimées
- [ ] 5. Playmobil (223 lignes) - 1h30 estimée
- [ ] 6. Klickypedia (215 lignes) - 1h30 estimée

**Total Estimé Phase 2** : 10 heures

### Phase 3 : Migration Books (PRIORITÉ 2)

- [ ] 7. GoogleBooks (180 lignes) - 1h estimée
- [ ] 8. OpenLibrary - 1h estimée

**Total Estimé Phase 3** : 2 heures

### Phase 4 : Migration Comics (PRIORITÉ 3)

- [ ] 9. ComicVine - 1h estimée
- [ ] 10. Bedetheque - 1h estimée

**Total Estimé Phase 4** : 2 heures

### Phase 5 : Migration Media & Anime (PRIORITÉ 4-5)

- [ ] 11. TMDB - 1h estimée
- [ ] 12. TVDB - 1h estimée
- [ ] 13. MangaUpdates - 1h estimée

**Total Estimé Phase 5** : 3 heures

### Phase 6 : Tests & Validation

- [ ] Tests unitaires de chaque normalizer
- [ ] Tests d'intégration
- [ ] Tests avec application externe
- [ ] Documentation OpenAPI

**Total Estimé Phase 6** : 4 heures

### Phase 7 : Déploiement

- [ ] Bump version 2.0.0
- [ ] CHANGELOG.md
- [ ] Documentation migration
- [ ] Push GitHub
- [ ] Push DockerHub

**Total Estimé Phase 7** : 1 heure

---

## 📝 Template de Migration

Pour chaque normalizer BaseNormalizer :

### Étape 1 : Analyser extractDetails()

```javascript
// AVANT dans extractDetails()
extractDetails(raw) {
  return {
    brand: 'LEGO',
    setNumber: raw.id,
    pieceCount: raw.pieces
  };
}
```

### Étape 2 : Modifier normalize() pour aplatir

```javascript
// APRÈS - Surcharger normalize()
normalize(raw) {
  // Appeler le parent pour les champs communs
  const base = {
    id: `${this.source}:${this.extractSourceId(raw)}`,
    type: this.type,
    source: this.source,
    sourceId: String(this.extractSourceId(raw)),
    title: this.cleanString(this.extractTitle(raw)),
    titleOriginal: this.cleanString(this.extractTitleOriginal(raw)),
    description: this.cleanString(this.extractDescription(raw)),
    year: this.parseYear(this.extractYear(raw)),
    images: this.normalizeImages(this.extractImages(raw)),
    urls: {
      source: this.parseUrl(this.extractSourceUrl(raw)),
      detail: this.buildDetailUrl(this.extractSourceId(raw))
    }
  };

  // Ajouter les champs spécifiques directement
  const details = this.extractDetails(raw);
  return {
    ...base,
    ...details  // ⚠️ Aplatir ici
  };
}
```

### Étape 3 : Adapter normalizeDetailResponse()

```javascript
normalizeDetailResponse(rawItem, meta = {}) {
  const normalized = this.normalize(rawItem);
  
  return {
    success: true,
    provider: this.source,
    domain: this.domain,
    id: normalized.id,
    data: normalized,  // ✅ Déjà plat
    meta: {
      fetchedAt: new Date().toISOString(),
      lang: meta.lang || 'en',
      cached: meta.cached || false,
      cacheAge: meta.cacheAge || null
    }
  };
}
```

---

## ⚠️ Points d'Attention

### 1. Zero Data Loss

**TOUS** les champs suivants doivent être préservés :
- Champs du tronc commun (id, type, source, sourceId, title, description, year, images, urls)
- Champs spécifiques au provider (setNumber, pieceCount, price, etc.)
- Structures complexes (parts, minifigs, barcodes, dimensions, etc.)
- Métadonnées (rebrickable, mega, translations, etc.)

### 2. Compatibilité Backward

Pour transition douce :
- Ajouter paramètre `?legacy=true` qui retourne ancienne structure
- Maintenir ce mode pendant 3 mois
- Logger les usages legacy

### 3. Tests

Pour chaque provider migré :
- Test recherche (search)
- Test détails (getById)
- Test champs obligatoires
- Test champs optionnels
- Test cas edge (null, undefined, missing data)

### 4. Documentation

Mettre à jour :
- `docs/API_ROUTES.md`
- `docs/api/*.openapi.yaml`
- `README.md`
- `CHANGELOG.md`

---

## 📊 Checklist de Migration par Provider

Pour chaque provider :

- [ ] Backup fichier original
- [ ] Analyser extractDetails() et tous les champs
- [ ] Lister tous les champs à préserver
- [ ] Modifier normalize() pour aplatir
- [ ] Tester recherche
- [ ] Tester détails
- [ ] Vérifier zero data loss
- [ ] Mettre à jour tests
- [ ] Commit avec message explicite

---

## 🚀 Commandes Git

```bash
# Créer branche de migration
git checkout -b feature/flatten-normalizers

# Commit par provider
git add src/domains/construction-toys/normalizers/lego.normalizer.js
git commit -m "refactor(lego): migrate to flat structure - preserve all fields"

# Après tous les providers
git add .
git commit -m "feat: migrate all normalizers to flat structure (v2.0.0)"

# Bump version
npm version major  # 1.0.12 -> 2.0.0

# Push
git push origin feature/flatten-normalizers
```

---

## 📞 Contact & Support

**Questions** : Documenter dans ce fichier  
**Issues** : Créer des issues GitHub pour chaque problème  
**Rollback** : Garder branche backup `backup/v1-normalizers`

---

**IMPORTANT** : Ce plan doit être suivi strictement pour garantir zero data loss et cohérence.
