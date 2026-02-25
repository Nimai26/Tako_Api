# 🚀 Quick Start - API Tako en Français

**Version requise** : Tako API 1.0.12+ ✅  
**Bug corrigé** : L'erreur 500 avec `autoTrad=true&lang=fr` est résolue

---

## 🎯 Le Problème

Vous recevez les données en anglais au lieu du français.

---

## ✅ La Solution

Ajoutez **2 paramètres** à toutes vos requêtes :

```
?autoTrad=true&lang=fr
```

---

## 📝 Exemples Concrets

### ❌ AVANT (anglais)
```
GET /api/videogames/rawg/game/kingdom-hearts
```

### ✅ APRÈS (français)
```
GET /api/videogames/rawg/game/kingdom-hearts?autoTrad=true&lang=fr
```

---

## 🔢 Tous les Endpoints

### Détails d'un jeu
```
GET /api/videogames/rawg/game/{slug}?autoTrad=true&lang=fr
GET /api/videogames/igdb/game/{id}?autoTrad=true&lang=fr
```

### Recherche
```
GET /api/videogames/rawg/search?q={query}&autoTrad=true&lang=fr
GET /api/videogames/igdb/search?q={query}&autoTrad=true&lang=fr
```

### JVC (déjà en français)
```
GET /api/videogames/jvc/search?q={query}
# Pas besoin de paramètres, déjà en français !
```

---

## 💻 Code JavaScript

```javascript
// Fetch
const response = await fetch(
  '/api/videogames/rawg/game/kingdom-hearts?autoTrad=true&lang=fr'
);

// Axios
const { data } = await axios.get('/api/videogames/rawg/game/kingdom-hearts', {
  params: { autoTrad: true, lang: 'fr' }
});
```

---

## 🧪 Test Rapide

```bash
# Test avec curl
curl "http://localhost:3000/api/videogames/rawg/game/kingdom-hearts?autoTrad=true&lang=fr" \
  | jq '.data.description'
```

**Résultat attendu** :
```
"Kingdom Hearts est l'histoire de Sora, un garçon de 14 ans..."
```

---

## ⚙️ Configuration Globale (Recommandé)

Au lieu d'ajouter les paramètres partout, créez une fonction helper :

```javascript
// config/api.js
const BASE_URL = 'http://localhost:3000';

export function apiUrl(path, params = {}) {
  const url = new URL(path, BASE_URL);
  url.searchParams.set('autoTrad', 'true');
  url.searchParams.set('lang', 'fr');
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  return url.toString();
}

// Usage
const url = apiUrl('/api/videogames/rawg/game/kingdom-hearts');
// → http://localhost:3000/api/videogames/rawg/game/kingdom-hearts?autoTrad=true&lang=fr
```

---

## 📊 Récapitulatif

| Provider | Endpoint | Paramètres Requis |
|----------|----------|-------------------|
| RAWG | `/rawg/game/{slug}` | `?autoTrad=true&lang=fr` |
| IGDB | `/igdb/game/{id}` | `?autoTrad=true&lang=fr` |
| JVC | `/jvc/search?q={query}` | Aucun (déjà en français) |

---

## 🔍 Champs Traduits

- ✅ **description** : Traduit
- ✅ **descriptionHtml** : Traduit
- ✅ **genres (dans recherche)** : Traduits
- ❌ **title** : Conservé en original
- ❌ **developers/publishers** : Noms conservés

---

## ⚠️ Important

**Les 2 paramètres sont obligatoires :**
- `autoTrad=true` → Active la traduction
- `lang=fr` → Définit le français comme langue cible

Sans `autoTrad`, même avec `lang=fr`, **aucune traduction ne sera effectuée**.

---

## 📞 Besoin d'Aide ?

Documentation complète : [TRANSLATION_GUIDE.md](TRANSLATION_GUIDE.md)

**Version Tako API requise** : 1.0.12+

---

## ✅ Changelog

**v1.0.12** (25 février 2026)
- 🐛 **Bug corrigé** : Erreur 500 avec `autoTrad=true&lang=fr`
  - Problème : `genre.toLowerCase is not a function`
  - Cause : RAWG retourne des objets `{name: "Action"}` au lieu de strings
  - Solution : Extraction automatique du nom du genre depuis les objets
- ✅ L'endpoint fonctionne maintenant correctement avec la traduction française
