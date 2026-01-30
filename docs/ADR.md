# Architecture Decision Records (ADR)

Ce document trace les décisions d'architecture importantes pour Tako API.

---

## ADR-001: Architecture par domaines métier

**Date**: 2026-01-28  
**Statut**: Accepté

### Contexte

L'ancienne API `toys_api` avait une structure plate :
- `routes/` avec 28 fichiers
- `lib/providers/` avec 30+ fichiers
- `lib/normalizers/` avec 15 fichiers

Problèmes identifiés :
- Difficile de comprendre les dépendances
- Modification d'un provider risque de casser d'autres parties
- Tests difficiles à organiser

### Décision

Organiser le code par **domaine métier** :

```
src/domains/
├── construction-toys/   # LEGO, Playmobil, Mega, Rebrickable
├── books/               # Google Books, OpenLibrary
├── games/               # RAWG, IGDB, JVC
└── ...
```

Chaque domaine contient :
- `providers/` - Appels aux APIs externes
- `normalizers/` - Transformation des données
- `routes.js` - Endpoints HTTP
- `index.js` - Point d'entrée

### Conséquences

✅ **Avantages** :
- Un domaine = une unité autonome
- Facile à maintenir et tester
- Onboarding simplifié

❌ **Inconvénients** :
- Plus de fichiers à naviguer
- Risque de duplication si mal géré

---

## ADR-002: Classes de base pour providers et normalizers

**Date**: 2026-01-28  
**Statut**: Accepté

### Contexte

Dans `toys_api`, chaque provider avait sa propre implémentation :
- Duplication du code de retry, logging, cache
- Formats de retour inconsistants
- Difficile de garantir les contrats

### Décision

Créer des classes abstraites :

```javascript
// BaseProvider.js
export class BaseProvider {
  async search(query, options) { /* à implémenter */ }
  async getDetails(id, options) { /* à implémenter */ }
  
  // Méthodes communes fournies
  async fetchWithRetry(url, options) { ... }
  log(level, message, meta) { ... }
}
```

### Conséquences

✅ **Avantages** :
- Comportement uniforme (retry, timeout, logging)
- Contrat explicite pour chaque provider
- Facilite les tests (mock de la classe de base)

❌ **Inconvénients** :
- Courbe d'apprentissage pour les contributeurs
- Overhead pour les providers très simples

---

## ADR-003: Validation avec Zod

**Date**: 2026-01-28  
**Statut**: Accepté

### Contexte

`toys_api` n'avait pas de validation systématique :
- Paramètres de requête non validés
- Réponses des providers non typées
- Erreurs difficiles à debugger

### Décision

Utiliser **Zod** pour :
1. Valider les query params (`validateQuery` middleware)
2. Typer les réponses des providers
3. Documenter les schémas de données

```javascript
import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z.string().min(1),
  lang: z.string().length(2).default('fr'),
  max: z.coerce.number().min(1).max(100).default(20)
});
```

### Conséquences

✅ **Avantages** :
- Erreurs explicites en développement
- Documentation intégrée (inférence TypeScript)
- Parsing automatique des types

❌ **Inconvénients** :
- Dépendance supplémentaire
- Peut être verbeux pour des schémas complexes

---

## ADR-004: Séparation app.js / server.js

**Date**: 2026-01-28  
**Statut**: Accepté

### Contexte

`toys_api` avait tout dans `index.js` (600 lignes) :
- Configuration Express
- Import de tous les routers
- Démarrage du serveur
- Graceful shutdown

### Décision

Séparer en deux fichiers :

- **app.js** : Configure Express (middlewares, montage routes)
- **server.js** : Démarre le serveur, gère le lifecycle

### Conséquences

✅ **Avantages** :
- `app` exportable pour les tests (supertest)
- Séparation des responsabilités
- Plus facile à lire

❌ **Inconvénients** :
- Un fichier de plus

---

## ADR-005: Configuration typée et centralisée

**Date**: 2026-01-28  
**Statut**: Accepté

### Contexte

Dans `toys_api` :
- `lib/config.js` contenait 386 lignes
- Variables d'environnement lues partout dans le code
- Pas de validation des variables requises

### Décision

Structurer la configuration en modules :

```
src/config/
├── index.js    # Export centralisé
├── env.js      # Variables d'environnement (validées)
├── sources.js  # Configuration des providers
└── cache.js    # Configuration du cache
```

Accès unique via `config` :

```javascript
import { config } from './config/index.js';
config.env.port
config.sources.lego.baseUrl
config.cache.ttl
```

### Conséquences

✅ **Avantages** :
- Un seul point d'entrée
- Validation au démarrage
- Autocomplétion IDE

❌ **Inconvénients** :
- Import obligatoire depuis `config/`
