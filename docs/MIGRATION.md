# Migration depuis toys_api vers Tako API

Ce document décrit le processus de migration de l'ancienne API `toys_api` vers la nouvelle architecture `Tako API`.

## 🎯 Objectifs de la refonte

1. **Clarifier l'architecture** - Séparation nette des responsabilités
2. **Uniformiser les contrats** - Mêmes interfaces pour tous les domaines
3. **Améliorer la maintenabilité** - Un domaine = un dossier autonome
4. **Valider les données** - Schémas Zod en entrée/sortie
5. **Faciliter les tests** - Structure miroir dans `tests/`

## 📊 Correspondance des fichiers

### Structure générale

| toys_api | Tako API |
|----------|----------|
| `index.js` (600 lignes) | `src/server.js` + `src/app.js` |
| `lib/config.js` | `src/config/*.js` |
| `lib/utils/*.js` | `src/shared/utils/*.js` + `src/shared/middleware/*.js` |
| `lib/providers/*.js` | `src/domains/*/providers/*.js` |
| `lib/normalizers/*.js` | `src/domains/*/normalizers/*.js` |
| `routes/*.js` | `src/domains/*/routes.js` |
| `lib/database/*.js` | `src/infrastructure/database/*.js` |

### Mapping des routes

| toys_api | Tako API |
|----------|----------|
| `/lego/*` | `/construction-toys/lego/*` |
| `/playmobil/*` | `/construction-toys/playmobil/*` |
| `/mega/*` | `/construction-toys/mega/*` |
| `/rebrickable/*` | `/construction-toys/rebrickable/*` |
| `/googlebooks/*` | `/books/google/*` |
| `/openlibrary/*` | `/books/openlibrary/*` |
| `/rawg/*` | `/games/rawg/*` |
| `/igdb/*` | `/games/igdb/*` |
| `/jeuxvideo/*` | `/games/jeuxvideo/*` |
| `/tmdb/*` | `/media/tmdb/*` |
| `/tvdb/*` | `/media/tvdb/*` |
| `/imdb/*` | `/media/imdb/*` |
| `/jikan/*` | `/anime-manga/jikan/*` |
| `/mangadex/*` | `/anime-manga/mangadex/*` |
| `/comicvine/*` | `/comics/comicvine/*` |
| `/bedetheque/*` | `/comics/bedetheque/*` |
| `/tcg_pokemon/*` | `/tcg/pokemon/*` |
| `/tcg_mtg/*` | `/tcg/mtg/*` |
| `/coleka/*` | `/collectibles/coleka/*` |
| `/amazon/*` | `/ecommerce/amazon/*` |
| `/bgg/*` | `/board-games/bgg/*` |

## 🔄 Plan de migration

### Phase 1 : Fondations ✅
- [x] Créer le squelette du projet
- [x] Configuration centralisée (`src/config/`)
- [x] Middlewares partagés (`src/shared/middleware/`)
- [x] Utilitaires (`src/shared/utils/`)
- [x] Gestion d'erreurs (`src/shared/errors/`)

### Phase 2 : Classes de base ✅
- [x] `BaseProvider` - Classe abstraite provider (`src/core/providers/`)
- [x] `BaseNormalizer` - Classe abstraite normalizer (`src/core/normalizers/`)
- [x] Schémas Zod avec noyau commun (`src/core/schemas/content-types.js`)
- [x] Documentation du format de réponse (`docs/RESPONSE-FORMAT.md`)
- [ ] `BaseRouter` - Factory pour routes

### Phase 3 : Infrastructure
- [x] Module database (`src/infrastructure/database/`) - **EN COURS**
  - [x] Schéma discovery_cache (trending/popular/charts/upcoming)
  - [x] Repository pattern avec cache PostgreSQL
  - [x] Refresh scheduler avec cron jobs échelonnés
  - [ ] Tests unitaires du cache
  - [ ] Migration complète de tous les endpoints discovery
- [ ] Client HTTP avec retry (`src/infrastructure/http/`)
- [ ] Module scraping (`src/infrastructure/scraping/`)
- [ ] Monitoring (`src/infrastructure/monitoring/`)

### Phase 4 : Domaines

#### 4.1 construction-toys (EN COURS)
| Provider | Status | Notes |
|----------|--------|-------|
| Brickset | ✅ Done | API REST, normalizer complet |
| Rebrickable | ✅ Done | API REST avec enrichissement parts/minifigs |
| LEGO (officiel) | ✅ Done | Scraping HTML via FlareSolverr (GraphQL retiré - erreur 400) |
| Playmobil | 🔜 TODO | Scraping |
| Klickypedia | 🔜 TODO | Scraping |
| Mega Construx | 🔜 TODO | SearchSpring API |

**LEGO Provider - Implémenté le 29/01/2026 :**
- Méthodes : `search()`, `getById()`
- Extraction : `__NEXT_DATA__`, HTML parsing, `data-test` attributes
- Données : titre, prix, pièces, âge, thème, disponibilité, images (19), vidéos (2)
- Exclusions : Mosaic Maker, Gift Cards, VIP Rewards
- Test : `./scripts/test-lego.sh`

#### 4.2-4.11 Autres domaines (À FAIRE)
2. [ ] `books`
3. [ ] `games`
4. [ ] `media`
5. [ ] `anime-manga`
6. [ ] `comics`
7. [ ] `tcg`
8. [ ] `collectibles`
9. [ ] `music`
10. [ ] `ecommerce`
11. [ ] `board-games`

### Phase 5 : Finalisation
- [ ] Tests unitaires pour chaque domaine
- [ ] Tests d'intégration
- [ ] Documentation OpenAPI
- [ ] Dockerfile optimisé
- [ ] CI/CD

## 📝 Procédure de migration d'un domaine

Pour chaque domaine, suivre ces étapes :

### 1. Créer la structure

```bash
src/domains/{domain}/
├── index.js           # Export principal
├── routes.js          # Router Express
├── providers/
│   └── {provider}.js  # Un fichier par provider
└── normalizers/
    └── {provider}.js  # Un fichier par normalizer
```

### 2. Migrer le provider

```javascript
// Avant (toys_api)
export async function searchLego(query, locale) {
  // Logique mélangée
}

// Après (Tako API)
import { BaseProvider } from '../../../core/BaseProvider.js';

export class LegoProvider extends BaseProvider {
  constructor() {
    super('lego', config.sources.constructionToys.lego);
  }
  
  async search(query, options) {
    // Logique pure d'appel API
  }
}
```

### 3. Migrer le normalizer

```javascript
// Avant (toys_api)
export function normalizeLegoSearch(data) {
  return data.map(item => ({ ... }));
}

// Après (Tako API)
import { BaseNormalizer } from '../../../core/BaseNormalizer.js';

export class LegoNormalizer extends BaseNormalizer {
  constructor() {
    super('lego', 'construct_toy');
  }
  
  normalizeSearchItem(item) {
    return { ... };
  }
}
```

### 4. Créer les routes

```javascript
// src/domains/construction-toys/routes.js
import { Router } from 'express';
import { createProviderRouter } from '../../core/BaseRouter.js';

const router = Router();

// Sous-routes par provider
router.use('/lego', createProviderRouter(legoProvider, legoNormalizer));
router.use('/playmobil', createProviderRouter(playmobilProvider, playmobilNormalizer));

export { router };
```

### 5. Monter dans app.js

```javascript
// src/app.js
import { router as constructionToysRouter } from './domains/construction-toys/index.js';
app.use('/construction-toys', constructionToysRouter);
```

## ⚠️ Points d'attention

### Rétrocompatibilité

Les anciennes routes peuvent être maintenues temporairement via des redirects :

```javascript
// Compatibilité toys_api
app.use('/lego', (req, res) => {
  res.redirect(301, `/construction-toys/lego${req.url}`);
});
```

### Gestion des clés API

Les clés API des providers externes sont stockées en clair dans `.env` et référencées via `src/config/sources.js` (propriété `apiKeyEnv`).  
Pas de middleware d'authentification : l'API est conçue pour un usage personnel.

### Cache

Le système de cache PostgreSQL est **en cours d'implémentation** pour les endpoints discovery (trending/popular/charts/upcoming).

**Architecture** :
- Table dédiée `discovery_cache` avec cache_key unique
- Refresh automatique échelonné (cron jobs toutes les 24h)
- TTL adaptés : 24h (trending/popular/charts), 6h (upcoming)
- Horaires échelonnés pour éviter le flooding des APIs

**Bénéfices** :
- Latence réduite : < 100ms vs 2-5s (gain 95%)
- Rate limits respectés : 95% moins d'appels API externes
- Scalabilité : PostgreSQL gère 100k+ requêtes/s

Voir [CACHE_SYSTEM.md](./CACHE_SYSTEM.md) pour l'architecture complète.

## 🧪 Tests

Pour chaque domaine migré :

1. Copier les tests existants dans `tests/domains/{domain}/`
2. Adapter les imports
3. Ajouter des tests pour les nouvelles fonctionnalités
4. Vérifier la couverture avec `npm run test:coverage`

## 📚 Ressources

- [Architecture Decision Records](./ADR.md)
- [API Design Guidelines](./API-GUIDELINES.md)
- [Contributing Guide](./CONTRIBUTING.md)
