# Notes Techniques Tako API
> Documentation technique pour le développement et la maintenance  
> Dernière mise à jour : 5 février 2026

## 📊 ÉTAT ACTUEL DU DÉPLOIEMENT

### Containers en Production (Machine Labo Debian)
```
tako_api            : UP (healthy) - Port 3000
tako_db             : UP - PostgreSQL 16
tako_flaresolverr   : UP (healthy) - Port 8191
```

**Localisation :**
- Projet : `/Projets/Tako_Api` (filesystem ext2/ext3 - LOCAL, pas CIFS)
- Volume DB : `/var/lib/docker/volumes/tako_api_tako-db-data/_data` (Docker managed volume)
- Image : `nimai24/tako-api:1.0.9`

**État vérifié :** 5 février 2026 12h15
- ✅ API répond : `http://localhost:3000/health`
- ✅ Cache DB : 32 entrées actives
- ✅ FlareSolverr opérationnel
- ✅ Configuration `.env` présente et fonctionnelle

### Montages CIFS sur la Machine
```
/mnt/egon  : //10.10.0.1/Egon (NON utilisé par Tako)
/mnt/media : //10.10.0.2/Media (NON utilisé par Tako)
```

**✅ IMPORTANT :** Le projet N'EST PAS sur CIFS. PostgreSQL utilise un volume Docker natif, donc AUCUN problème de performance ou verrouillage.

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Stack Docker
```yaml
tako-api:
  - Image: nimai24/tako-api:1.0.9
  - Base: node:20-slim + Chromium
  - User: tako (non-root)
  - Port: 3000
  - Healthcheck: GET /health (interval 30s)
  - Dépend de: tako-db, flaresolverr

tako-db:
  - Image: postgres:16-alpine
  - Database: tako_cache
  - User: tako
  - Volume: tako_api_tako-db-data (Docker managed)
  - Pool: 2-10 connexions

flaresolverr:
  - Image: ghcr.io/flaresolverr/flaresolverr:latest
  - Port: 8191
  - Limites: 2G RAM, 2 CPUs
  - MAX_SESSIONS: 3
  - SESSION_TTL: 300000ms (5 min)
```

### Points d'Entrée Code
```
src/server.js   : Démarrage serveur, init DB, graceful shutdown
src/app.js      : Config Express, middlewares, montage routes
src/config/     : Configuration centralisée (env, sources, cache)
```

### Domaines & Providers (11/32)
| Domaine | Providers | FlareSolverr Required |
|---------|-----------|----------------------|
| construction-toys | LEGO, Playmobil, Klickypedia, Mega, Rebrickable, Brickset | LEGO, Playmobil |
| books | Google Books, OpenLibrary | - |
| comics | ComicVine, Bedetheque | Bedetheque |
| anime-manga | Jikan, MangaUpdates | - |
| media | TMDB, TVDB, IMDB | - |
| videogames | IGDB, RAWG, JVC, ConsoleVariations | JVC |
| boardgames | BoardGameGeek | - |
| collectibles | Coleka, LuluBerlu, Transformerland | - |
| sticker-albums | Paninimania | Paninimania |
| tcg | Pokémon, MTG, Yu-Gi-Oh!, Lorcana, Digimon, One Piece | One Piece |
| music | Discogs, Deezer, MusicBrainz, iTunes | - |
| ecommerce | Amazon (8 marketplaces) | Tous |

---

## ⚠️ POINTS CRITIQUES À SURVEILLER

### 1. Sessions FlareSolverr (RISQUE MAJEUR)
**Incident documenté : 29/01/2026**
- 301 processus Chromium actifs
- 32 Go RAM saturée
- CPU à 960%

**Cause :** Sessions non détruites → Chromium zombies

**Mitigation actuelle :**
```yaml
# docker-compose.yaml
MAX_SESSIONS: 3
SESSION_TTL: 300000
limits:
  memory: 2G
  cpus: '2'
```

**Code Pattern OBLIGATOIRE :**
```javascript
// ✅ BON
const fsr = new FlareSolverrClient('provider-name');
try {
  const html = await fsr.get(url);
  // traitement...
} finally {
  await fsr.destroySession(); // CRITIQUE !
}

// ❌ MAUVAIS - Ne JAMAIS faire ça
const html = await fsr.get(url);
// Session orpheline = Chromium zombie !
```

**Fichier critique :** `src/infrastructure/scraping/FlareSolverrClient.js`
- Gère création/destruction automatique
- Cleanup sur SIGTERM/SIGINT
- Health check intégré

**Monitoring :**
```bash
# Vérifier sessions actives
curl http://localhost:8191/v1 -X POST \
  -H "Content-Type: application/json" \
  -d '{"cmd":"sessions.list"}'

# Logs FlareSolverr
docker logs tako_flaresolverr --tail 50
```

### 2. Cache Refresh Scheduler
**Tâches cron actives (9 jobs) :**
```
02:00 → TMDB trending
02:30 → Jikan trending
03:00 → TMDB/RAWG popular
03:30 → IGDB popular
04:00 → Deezer charts
04:30 → iTunes charts
*/6h  → Refresh expired entries
05:00 → Purge > 90 jours
*/1h  → Stats monitoring
```

**Risque :** Surcharge si trop de providers requièrent FlareSolverr simultanément

**Fichier :** `src/infrastructure/database/refresh-scheduler.js`

### 3. Cache PostgreSQL
**Configuration validée :**
```bash
DB_ENABLED=true
DB_HOST=tako-db
DB_PORT=5432
DB_NAME=tako_cache
DB_PASSWORD=<configuré>
```

**Comportement si DB indisponible :**
- API continue en mode dégradé (sans cache persistant)
- Logs : "⚠️ Le serveur continuera sans cache persistant"

**TTL par type :**
```javascript
search: 300000ms   (5 min)
detail: 3600000ms  (1h)
price: 600000ms    (10 min)
static: 86400000ms (24h)
```

### 4. Variables d'Environnement Critiques
**Obligatoires pour fonctionnement complet :**
```bash
# Serveur
PORT=3000
NODE_ENV=production

# Database
DB_ENABLED=true
DB_HOST=tako-db
DB_PASSWORD=<secret>

# FlareSolverr
FSR_URL=http://flaresolverr:8191/v1

# Traduction (intégrée)
AUTO_TRAD_ENABLED=true

# APIs Providers (optionnelles mais recommandées)
REBRICKABLE_API_KEY=
TMDB_API_KEY=
IGDB_CLIENT_ID=
IGDB_CLIENT_SECRET=
COMICVINE_API_KEY=
DISCOGS_TOKEN=
```

**Fichier :** `.env` (présent et fonctionnel)

---

## 🚀 COMMANDES DE DÉVELOPPEMENT

### Gestion Docker Compose
```bash
# Démarrer le stack
docker compose up -d

# Redémarrer un service
docker compose restart tako-api

# Rebuild après modification code
docker compose build tako-api
docker compose up -d tako-api

# Logs en temps réel
docker compose logs -f tako-api

# Stopper tout
docker compose down

# Shell dans container
docker exec -it tako_api sh
```

### Tests API
```bash
# Health check
curl http://localhost:3000/health

# Liste documentation
curl http://localhost:3000/docs

# Test endpoint LEGO
curl "http://localhost:3000/construction-toys/lego/search?query=millennium+falcon"

# Test avec traduction
curl "http://localhost:3000/api/anime-manga/jikan/search/anime?q=naruto&lang=fr&autoTrad=1"
```

### PostgreSQL
```bash
# Stats cache
docker exec tako_db psql -U tako -d tako_cache \
  -c "SELECT provider, COUNT(*) FROM discovery_cache GROUP BY provider;"

# Nombre total d'entrées
docker exec tako_db psql -U tako -d tako_cache \
  -c "SELECT COUNT(*) FROM discovery_cache;"

# Purge manuelle
docker exec tako_db psql -U tako -d tako_cache \
  -c "DELETE FROM discovery_cache WHERE created_at < NOW() - INTERVAL '90 days';"
```

### Développement Local (sans Docker)
```bash
# Installation
npm install

# Dev avec watch mode
npm run dev

# Tests
npm test

# Lint
npm run lint
npm run lint:fix
```

---

## 📁 STRUCTURE PROJET IMPORTANTE

### Fichiers de Configuration
```
src/config/
├── index.js      : Export centralisé
├── env.js        : Variables d'env + validation
├── sources.js    : Config 32 providers
└── cache.js      : Config PostgreSQL cache
```

### Infrastructure Critique
```
src/infrastructure/
├── database/
│   ├── connection.js           : Pool PostgreSQL
│   ├── discovery-cache.repository.js
│   ├── cache-refresher.js
│   └── refresh-scheduler.js    : Tâches cron
└── scraping/
    └── FlareSolverrClient.js   : Client FlareSolverr
```

### Middlewares
```
src/shared/middleware/
├── cache-control.js
├── cors.js
├── error-handler.js
├── logger.js
├── request-id.js
├── security.js
└── validation.js
```

### Ajouter un Provider
1. Config : `src/config/sources.js`
2. Provider : `src/domains/{domaine}/providers/NewProvider.js`
3. Normalizer : `src/domains/{domaine}/normalizers/NewNormalizer.js`
4. Routes : `src/domains/{domaine}/routes/index.js`

---

## 🔍 DEBUGGING & TROUBLESHOOTING

### FlareSolverr ne répond pas
```bash
# Vérifier état
docker logs tako_flaresolverr --tail 100

# Redémarrer
docker compose restart flaresolverr

# Tester manuellement
curl http://localhost:8191/v1 -X POST \
  -H "Content-Type: application/json" \
  -d '{"cmd":"request.get","url":"https://www.lego.com","maxTimeout":60000}'
```

### PostgreSQL ne se connecte pas
```bash
# Vérifier logs
docker logs tako_db --tail 50

# Tester connexion
docker exec tako_db pg_isready -U tako

# Vérifier variables env
docker exec tako_api env | grep DB_
```

### API retourne 502
```bash
# Vérifier healthcheck
curl http://localhost:3000/health

# Logs détaillés
docker logs tako_api --tail 100

# Vérifier processus Node
docker exec tako_api ps aux
```

### Cache ne fonctionne pas
```bash
# Vérifier DB_ENABLED
docker exec tako_api node -e "console.log(process.env.DB_ENABLED)"

# Stats pool connexions
# Via endpoint (si exposé) ou logs app
docker logs tako_api | grep "Database cache"
```

---

## 🎯 BONNES PRATIQUES

### FlareSolverr
- ✅ TOUJOURS utiliser try/finally
- ✅ Une session par requête (créer/détruire)
- ✅ Monitorer sessions actives
- ❌ NE JAMAIS réutiliser une session corrompue
- ❌ NE PAS créer de sessions en parallèle sans limite

### Cache
- ✅ Différencier TTL selon type de données (search/detail/price)
- ✅ Prévoir fallback si DB indisponible
- ✅ Purger régulièrement (cron 05:00)
- ❌ NE PAS stocker de secrets dans le cache

### Docker
- ✅ Utiliser volumes Docker (pas bind mounts CIFS)
- ✅ Limiter ressources FlareSolverr
- ✅ Healthchecks actifs
- ✅ Graceful shutdown (SIGTERM)
- ❌ NE PAS run en root

### API
- ✅ Valider params avec Zod
- ✅ Format réponse unifié
- ✅ Gestion erreurs centralisée
- ✅ Request ID pour traçabilité
- ❌ NE PAS exposer stack traces en prod

---

## 📝 CHANGELOG IMPORTANT

### 30 janvier 2026 - Migration toys_api terminée
- ✅ 11 domaines
- ✅ 32 providers
- ✅ FlareSolverr sessions sécurisées
- ✅ Format réponse normalisé
- ✅ Traduction intégrée

### 29 janvier 2026 - Incident FlareSolverr
- ❌ 301 Chromium zombies
- 🔧 Fix : Ajout MAX_SESSIONS + SESSION_TTL
- 🔧 Fix : destroySession() obligatoire

### 5 février 2026 - Validation déploiement
- ✅ Containers healthy
- ✅ PostgreSQL sur volume Docker (pas CIFS)
- ✅ 32 entrées cache actives
- ✅ Configuration validée

---

## 🔐 SÉCURITÉ

### Secrets à protéger
- `DB_PASSWORD` : PostgreSQL
- API Keys : TMDB, IGDB, Rebrickable, ComicVine, Discogs
- `.env` : NE JAMAIS commit

### Recommandations
- Utiliser Docker secrets en prod
- Rotate API keys régulièrement
- Limiter accès réseau containers
- Surveiller logs pour anomalies

---

## 📊 MÉTRIQUES À SURVEILLER

### Performance
- Temps réponse API (target < 1s)
- Cache hit rate (target > 70%)
- Latency FlareSolverr (target < 30s)

### Ressources
- RAM FlareSolverr (limit 2G)
- Sessions FlareSolverr actives (max 3)
- Pool PostgreSQL (2-10 connexions)

### Erreurs
- 5xx errors (target < 1%)
- FlareSolverr timeouts
- DB connection failures

---

## 🚀 PROCHAINES ÉTAPES RECOMMANDÉES

### Court terme
- [ ] Backup volume PostgreSQL (tako_api_tako-db-data)
- [ ] Monitoring Prometheus + Grafana
- [ ] Alertes FlareSolverr sessions
- [ ] Tests d'intégration avec mock FlareSolverr

### Moyen terme
- [ ] Pipeline CI/CD (lint → test → build → push)
- [ ] Rate limiting global
- [ ] Retry logic avec backoff exponentiel
- [ ] Documentation OpenAPI complète

### Long terme
- [ ] Feature flags par provider
- [ ] Cache stratégies avancées (Redis ?)
- [ ] Multi-région FlareSolverr
- [ ] Observabilité distribuée

---

## 📞 CONTACTS & RESSOURCES

**Documentation :**
- README : `/Projets/Tako_Api/README.md`
- API Routes : `docs/API_ROUTES.md`
- Cache System : `docs/CACHE_SYSTEM.md`
- Trending Roadmap : `docs/TRENDING_ROADMAP.md`

**Endpoints locaux :**
- API : http://localhost:3000
- FlareSolverr : http://localhost:8191
- Health : http://localhost:3000/health
- Docs : http://localhost:3000/docs

**Image Docker :**
- Registry : `nimai24/tako-api:1.0.9`
- Dockerfile : `/Projets/Tako_Api/Dockerfile`

---

**Dernière vérification :** 5 février 2026 12h15 UTC  
**Machine :** labo (Debian)  
**État :** ✅ Production ready
