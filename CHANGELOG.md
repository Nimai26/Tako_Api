# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

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
