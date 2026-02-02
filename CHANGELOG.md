# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [1.0.0] - 2026-02-02

### 🎉 Version majeure - Système complet de cache PostgreSQL

#### ✨ Ajouté

**Phase 1-4 : Endpoints Discovery (19 endpoints)**
- **TMDB** (7 endpoints)
  - `GET /api/media/tmdb/trending` - Films/séries trending (jour/semaine)
  - `GET /api/media/tmdb/popular` - Films/séries populaires
  - `GET /api/media/tmdb/top-rated` - Films/séries les mieux notés
  - `GET /api/media/tmdb/upcoming` - Films/séries à venir
  - `GET /api/media/tmdb/on-the-air` - Séries avec nouveaux épisodes (7j)
  - `GET /api/media/tmdb/airing-today` - Séries diffusées aujourd'hui

- **Jikan** (4 endpoints)
  - `GET /api/anime-manga/jikan/top` - Top anime/manga par score
  - `GET /api/anime-manga/jikan/trending` - Anime de la saison en cours
  - `GET /api/anime-manga/jikan/upcoming` - Anime à venir prochaine saison
  - `GET /api/anime-manga/jikan/schedule` - Planning de diffusion unifié

- **RAWG** (2 endpoints)
  - `GET /api/videogames/rawg/popular` - Jeux populaires (bien notés)
  - `GET /api/videogames/rawg/trending` - Jeux trending récents

- **IGDB** (1 endpoint)
  - `GET /api/videogames/igdb/popular` - Jeux populaires par rating

- **Deezer** (1 endpoint)
  - `GET /api/music/deezer/charts` - Charts albums/tracks/artistes

- **iTunes** (1 endpoint)
  - `GET /api/music/itunes/charts` - Charts albums/songs multi-pays

**Phase 5 : Cache PostgreSQL**
- Infrastructure complète de cache avec PostgreSQL
  - Table `discovery_cache` avec 12 colonnes + 4 indexes
  - Repository CRUD complet (9 fonctions)
  - Cache wrapper intelligent avec TTL configurables
  - Migration SQL automatisée

- Refresh automatique (9 cron jobs)
  - 02:00 → TMDB trending | 02:30 → Jikan trending
  - 03:00 → TMDB/RAWG popular | 03:30 → IGDB popular
  - 04:00 → Deezer charts | 04:30 → iTunes charts
  - */6h → Upcoming refresh | 05:00 → Purge (>90j) | */1h → Monitoring

- API Admin Cache (4 endpoints)
  - `GET /api/cache/stats` - Statistiques globales + par provider
  - `POST /api/cache/refresh/:provider` - Force refresh d'un provider
  - `POST /api/cache/refresh` - Refresh entrées expirées (batch)
  - `DELETE /api/cache/clear` - Vider tout le cache

#### 🚀 Performance

- **Réduction latence : -93%** (159ms → 11ms)
- **Gain de vitesse : 14x plus rapide**
- **TTL intelligents** : 24h (trending/popular/charts), 6h (upcoming/schedule)
- **Metadata cache** : Toutes les réponses incluent `cached` et `cacheKey`

#### 📝 Documentation

- `docs/TRENDING_ROADMAP.md` - Roadmap complète (Phases 1-5)
- `docs/CACHE_SYSTEM.md` - Documentation technique du cache
- `docs/API_ROUTES.md` - Mise à jour avec 19 endpoints + cache admin
- `scripts/test-cache.sh` - Script de tests automatisés

#### 🛠️ Technique

- **Dépendances** : `node-cron@^3.x.x` pour tâches planifiées
- **Nouveaux fichiers** :
  - `src/infrastructure/database/discovery-cache.repository.js`
  - `src/infrastructure/database/cache-refresher.js`
  - `src/infrastructure/database/refresh-scheduler.js`
  - `src/shared/utils/cache-wrapper.js`
  - `src/core/routes/cache.routes.js`
  - `scripts/migrations/001_create_discovery_cache.sql`

#### 🐛 Corrections

- Gestion correcte des fermetures de connexions PostgreSQL
- Traduction automatique sur tous les endpoints discovery
- Normalisation conforme RESPONSE-FORMAT.md

---

## [Unreleased]

### Added - Classes de base
- `BaseNormalizer` : Classe abstraite avec noyau commun obligatoire (`src/core/normalizers/`)
- `BaseProvider` : Classe abstraite avec HTTP, retry, timeout (`src/core/providers/`)
- Schémas Zod : 12 types de contenu avec noyau commun + détails spécifiques

### Added - Domain construction-toys

#### Providers
| Provider | Status | Méthodes |
|----------|--------|----------|
| **Brickset** | ✅ | `search`, `getById`, `getThemes`, `getSubthemes`, `getYears`, `getRecentlyUpdated` |
| **Rebrickable** | ✅ | `search`, `getById`, `getSetParts`, `getSetMinifigs`, `getThemes`, `searchParts`, `searchMinifigs`, `getColors` |
| **LEGO** | ✅ Complet | `search`, `getById` (scraping HTML via FlareSolverr) |
| Playmobil | 🔜 | Scraping |
| Klickypedia | 🔜 | Scraping |
| Mega Construx | 🔜 | SearchSpring API |

#### Normalizers
- `BricksetNormalizer` : Mapping complet vers schéma `construct_toy`
- `RebrickableNormalizer` : Mapping avec support themes + parts/minifigs enrichis
- `LegoNormalizer` : Mapping HTML vers schéma `construct_toy` avec filtrage produits valides

#### LEGO Provider - Détails d'implémentation (29 janvier 2026)
- **Méthode** : Scraping HTML uniquement (GraphQL LEGO supprimé - erreur 400 systématique)
- **Bypass Cloudflare** : FlareSolverr requis
- **Extraction de données** :
  - `__NEXT_DATA__` JSON embedded (méthode primaire)
  - HTML parsing (fallback)
  - `data-test` attributes
- **Données extraites** :
  - Titre, description, set number
  - Prix (EUR), disponibilité (textes FR/EN supportés)
  - Nombre de pièces, tranche d'âge
  - Thème (Star Wars™, etc.)
  - **Images** : 17-19 images dédupliquées (filtrage miniatures/vidéos)
  - **Vidéos** : 2 vidéos promotionnelles (filtrage Feature clips, variantes taille)
- **Exclusions** : Mosaic Maker (40179), Gift Cards, VIP Rewards, Minifigure Factory

#### Scripts de test
- `scripts/test-lego.sh` : Test du provider LEGO avec FlareSolverr
- `scripts/test-lego.js` : Script Node.js de test détaillé

### Added - Schémas
- `constructToyDetailsSchema` : Ajout du champ `videos` (array d'URLs)
- `constructToyDetailsSchema` : Ajout du champ `instructions` (manuels PDF)

### Added - Infrastructure Scraping (⚠️ CRITIQUE)
- `FlareSolverrClient` : Client partagé pour FlareSolverr (`src/infrastructure/scraping/`)
- **Gestion automatique des sessions** : création, réutilisation, destruction
- **Nettoyage sur erreur** : session détruite si requête échoue
- **Hooks de fermeture** : `beforeExit`, `SIGINT`, `SIGTERM`

#### ⚠️ RÈGLES OBLIGATOIRES pour les providers utilisant FlareSolverr
```
1. TOUJOURS appeler destroySession() après utilisation (try/finally)
2. Ne PAS créer plusieurs instances du client pour le même provider
3. Réutiliser la session tant qu'elle est valide (5 min)
4. En cas d'erreur, détruire la session pour recommencer proprement
```

#### Configuration Docker FlareSolverr (docker-compose.yaml)
```yaml
flaresolverr:
  environment:
    - MAX_SESSIONS=3       # LIMITE CRITIQUE - évite explosion mémoire
    - SESSION_TTL=300000   # 5 min - auto-destruction des sessions orphelines
    - HEADLESS=true
  deploy:
    resources:
      limits:
        memory: 2G         # LIMITE CRITIQUE - 1 Chromium = 200-500 Mo
        cpus: '2'          # LIMITE CRITIQUE - évite 960% CPU
```

#### Incident du 29/01/2026 - 301 processus Chromium
- **Cause** : Sessions FlareSolverr jamais détruites
- **Symptômes** : RAM 32 Go saturée, CPU 960%, système inutilisable
- **Solution** : Ajout `destroySession()`, limites Docker, TTL sessions

### Added - LEGO Instructions
- `getLegoInstructions(id)` : Récupère les manuels PDF d'un set LEGO
- Enrichissement automatique dans `getById()` avec les manuels
- Route `/construction-toys/lego/instructions/:id` (à venir)

### Added - Documentation
- `docs/RESPONSE-FORMAT.md` : Format de réponse normalisé avec exemples
- Mise à jour `docs/MIGRATION.md` avec avancement réel
- `.env.example` : Toutes les clés API documentées par domaine

### Changed
- `src/config/env.js` : Ajout de toutes les clés API providers
- `src/core/schemas/content-types.js` : Refonte complète avec `coreItemSchema` + `createItemSchema()`
- Suppression middleware authentification (usage personnel)
- **LEGO Provider simplifié** : Suppression de GraphQL (échouait systématiquement), scraping HTML seul

### Fixed
- Logger : Export direct des méthodes `debug`, `info`, `warn`, `error`
- LEGO images : Déduplication correcte (108 → 19 images)
- LEGO vidéos : Filtrage Feature clips et variantes de taille (13 → 2 vidéos)
- LEGO thème : Extraction correcte ("Star Wars™" au lieu de "dark")
- LEGO disponibilité : Support textes français ("Disponible", "Rupture de stock")

---

## [0.1.0] - 2026-01-28

### Added
- Structure initiale du projet Tako API (52 fichiers)
- Configuration centralisée (`src/config/`)
- Middlewares partagés (`src/shared/middleware/`)
- Système de logging coloré
- Gestion d'erreurs standardisée
- Schémas Zod pour validation
- Documentation initiale (README, MIGRATION, ADR, API Guidelines)
- Squelette des 11 domaines métier
- Docker + docker-compose

### Architecture
- Séparation app.js / server.js
- Organisation par domaines métier
- Classes d'erreur HTTP spécialisées
- ES Modules exclusivement

---

## Roadmap

### Court terme
- [x] Provider LEGO (scraping HTML + FlareSolverr) ✅
- [ ] Provider Playmobil (scraping)
- [ ] Routes du domaine construction-toys
- [ ] Tests Brickset/Rebrickable

### Moyen terme
- [ ] Infrastructure database (cache PostgreSQL)
- [ ] Domaine `books`
- [ ] Domaine `media`
- [ ] Domaine `games`

### Long terme
- [ ] Tous les domaines migrés
- [ ] Tests complets
- [ ] Documentation OpenAPI
- [ ] CI/CD

## [2.3.0] - 2025-01-29

### Added - Domaine Media (TMDB & TVDB)

#### TMDB Provider
- **Recherche**: Films, séries, tous types avec pagination
- **Films**: Détails complets (genres, cast, crew, collection, images)
- **Séries**: Détails (saisons, nombre d'épisodes, status, networks)
- **Saisons**: Détails avec liste des épisodes
- **Épisodes**: Détails avec crew
- **Collections/Sagas**: Films ordonnés avec poster/backdrop
- **Personnes**: Biographie, filmographie
- **Réalisateurs**: Filmographie triée par date
- **Discover**: Films par genre/année avec tri

#### TVDB Provider  
- **Recherche**: Films, séries, personnes, listes
- **Films**: Détails avec artworks, traductions
- **Séries**: Détails avec saisons (Aired Order)
- **Saisons**: Détails par ID avec épisodes
- **Épisodes**: Détails avec directors/writers/guestStars
- **Listes**: Sagas et collections officielles
- **Personnes**: Biographie, characters
- **Réalisateurs**: Filmographie (films + séries)

#### Traduction automatique
- Support lang=fr pour traductions natives TVDB
- Fallback autoTrad=1 sur service de traduction intégré
- Traduction genres et descriptions

### Routes ajoutées

```
/api/media/tmdb/
├── health
├── search?q=&type=&lang=&pageSize=
├── search/movies?q=
├── search/series?q=
├── movies/:id
├── series/:id
├── series/:id/season/:n
├── series/:id/season/:n/episode/:e
├── collections/:id
├── persons/:id
├── directors/:id/movies
└── discover/movies?genre=&year=&sort=

/api/media/tvdb/
├── health
├── search?q=&type=&pageSize=
├── search/movies?q=
├── search/series?q=
├── movies/:id
├── series/:id
├── series/:id/seasons
├── seasons/:id
├── series/:id/episodes
├── episodes/:id
├── lists/:id
├── persons/:id
└── directors/:id/works
```
