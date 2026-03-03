# Dragon Ball Cards — Rapport de Recherche

> **Objectif** : Identifier toutes les sources de données pour compléter Tako API avec les cartes Dragon Ball (vintage Carddass + TCG moderne)  
> **Date** : 2025-03-03  
> **Contexte** : Dragon Ball est totalement absent de l'archive animecollection.fr (80 licences, 0 Dragon Ball). Le créateur a un site dédié : dbzcollection.fr

---

## Table des matières

1. [Diagnostic initial](#1-diagnostic-initial)
2. [Sources découvertes — Vintage (Carddass)](#2-sources-découvertes--vintage-carddass)
3. [Sources découvertes — TCG Moderne](#3-sources-découvertes--tcg-moderne)
4. [Sources écartées](#4-sources-écartées)
5. [Synthèse et plan d'action](#5-synthèse-et-plan-daction)
6. [Endpoints AJAX de dbzcollection.fr](#6-endpoints-ajax-de-dbzcollectionfr)
7. [Collections clés dbzcollection.fr](#7-collections-clés-dbzcollectionfr)

---

## 1. Diagnostic initial

### Problème

Rechercher "Dragon Ball" dans l'API Carddass (`/api/v1/collectibles/carddass/search?q=dragon+ball`) ne retourne **aucun résultat**.

### Cause

Requête en base PostgreSQL :
```sql
SELECT DISTINCT l.name FROM carddass_licenses l ORDER BY l.name;
-- 80 licences, aucune ne contient "Dragon Ball"
-- Seul "Dragon Quest" existe parmi les résultats "dragon%"
```

Le site animecollection.fr n'a **jamais** inclus Dragon Ball. Son créateur a fait un **site séparé** dédié : [dbzcollection.fr](http://www.dbzcollection.fr)

### Découverte

Le footer de animecollection.fr contient :
```
http://www.dbzcollection.fr/ — "© 2008 - DBZ Collection"
http://www.onepiececollection.fr/ — "One Piece Collection" (11 617 cartes, bonus)
```

---

## 2. Sources découvertes — Vintage (Carddass)

### 2.1 dbzcollection.fr ⭐ SOURCE PRINCIPALE

| Métrique | Valeur |
|---|---|
| URL | `http://www.dbzcollection.fr/2v2/index.php` |
| Cartes référencées | **~27 000+** |
| Collections | **336** |
| Séries | **1 477** |
| Images supplémentaires | **3 798** |
| Packagings | **1 883** |
| Architecture | PHP + AJAX (Scriptaculous, pas jQuery) |
| Hébergeur | OVHcloud (même que animecollection.fr) |
| Encodage | ISO-8859-1 |
| Statut | ✅ **LIVE** — PHP fonctionne, AJAX répond, images accessibles |

#### Différences avec animecollection.fr

| Aspect | animecollection.fr | dbzcollection.fr |
|---|---|---|
| Hiérarchie | Licence → Collection → Série → Carte | Collection → Série → Carte (pas de "licence") |
| Dossier AJAX | `traitements_ajax/` | `traitements_ajax/` (identique) |
| Préfixe URL | `cartes.php?idl=&idc=&ids=` | `cartes.php?idc=&ids=` (pas de `idl`) |
| Miniatures | `h100_` | `h50_` |
| HD | `h3000_` | `h400_` |
| Collections | 336 (multi-licence) | 336 (tout Dragon Ball) |
| JS Framework | Scriptaculous | Scriptaculous (identique) |

#### Endpoints AJAX vérifiés (GET)

Tous sous `http://www.dbzcollection.fr/2v2/traitements_ajax/` :

| Endpoint | Paramètres | Retour |
|---|---|---|
| `get_liste_series_collection.php` | `?idc={collection_id}` | HTML `<select>` avec séries |
| `get_liste_cartes.php` | `?numero=&idc={id}&idtc=&nom=&nature=&prix_appel=&nc=&pa=&phase=&caracteristiques=&pouvoir=` | IDs cartes format `@@{idc}/{ids}/h50_{card_id}-...` |
| `get_infos_detail_carte.php` | `?id={card_id}` | HTML table avec détails (Collection, Série, Numéro, Rareté, Nom) |
| `get_image_detail_carte.php` | `?img400={card_id}` | `<img src="cartes/{id}_carte.jpg" />` |
| `get_image_detail_carte_img.php` | `?img400={card_id}` | Image supplémentaire |
| `get_contenu_collection.php` | `?mode=liste_cartes&idc={id}&idm=0` | HTML complet avec toutes les cartes + numéros + raretés |
| `get_infos_detail_pack.php` | `?id={pack_id}` | Détails packaging |
| `get_image_detail_pack.php` | `?img400={pack_id}` | Image packaging |
| `get_liste_types_carte.php` | `?idc={id}` | Types de carte pour une collection |
| `get_personnages_by_collection_and_type_carte.php` | `?idc={id}&idtc={type}` | Personnages |
| `get_natures_by_collection_and_type_carte.php` | `?idc={id}&idtc={type}` | Natures |

#### Patterns d'images (vérifiés)

```
# Miniature (h50)
http://www.dbzcollection.fr/2v2/cartes/{idc}/{ids}/h50_{card_id}_carte.jpg
→ Exemple: cartes/18/65/h50_3283_carte.jpg (1.5 KB) ✅ 200 OK

# HD (h400)
http://www.dbzcollection.fr/2v2/cartes/{idc}/{ids}/h400_{card_id}_carte.jpg
→ Exemple: cartes/18/65/h400_3283_carte.jpg (25 KB) ✅ 200 OK

# Images supplémentaires (non testé mais pattern identique animecollection)
cartes/{idc}/{ids}/{card_id}/h50_{img_id}_carte_image.jpg
cartes/{idc}/{ids}/{card_id}/h400_{img_id}_carte_image.jpg

# Packagings
packagings/{idc}/{ids}/h100_{pack_id}_packaging.jpg
```

#### Données de test (carte #3283 — Carddass Part 1 n°1)

```
Collection : Carddass
Série : Part 1
Numéro : n°1
Rareté : Prism
Nom : Goku
```

#### Volume vérifié : Collection Carddass (ID 18)

- 42 séries (Part 1 → Part 38, Part 90, Part 91, Hors série, Loppi, Super Broly, etc.)
- **1 964 cartes** dans cette seule collection

### 2.2 Wayback Machine (backup)

- URL : `https://web.archive.org/web/*/dbzcollection.fr`
- **412 captures** (Nov 2006 → Feb 2026)
- Utilisable comme fallback si le site tombe
- ⚠️ Rate limité (429 si trop de requêtes rapides)

---

## 3. Sources découvertes — TCG Moderne

### 3.1 DeckPlanet API ⭐ MEILLEURE SOURCE (DBS Masters)

| Métrique | Valeur |
|---|---|
| Type | REST JSON API (Directus CMS) |
| URL | `https://api.deckplanet.net/cardsearch/dbs_masters_cards` |
| Auth | ❌ **Aucune authentification requise** |
| Total cartes | **6 219** |
| Pagination | 50 cartes/page, 125 pages |
| Champs/carte | **38** |
| Images | ✅ Webp sur Linode Object Storage |
| Rate limit | ~0.3s recommandé (non forcé) |
| Couverture | DBS Masters (2017 → présent), tous les sets (BT1-BT29, EX, SD, etc.) |

#### Champs disponibles (38)

```json
{
  "card_number": "P-181",
  "card_name": "Broly",
  "card_type": "LEADER",
  "card_color": "Red/Green",
  "card_power": "10000",
  "card_rarity": "Promotion[PR]",
  "card_series": "Promotion Cards",
  "card_energy_cost": null,
  "card_combo_cost": null,
  "card_combo_power": null,
  "card_skill": "<Badge...>...(HTML)",
  "card_skill_unstyled": "[Auto][Once per turn] When you combo...(texte brut)",
  "card_traits": ["Saiyan"],
  "card_character": ["Broly"],
  "card_era": ["Broly Saga"],
  "keywords": ["Auto", "Once per turn", "Awaken: Surge", ...],
  "img_link": "P-181",
  "card_back_name": "Broly, Surge of Brutality",
  "card_back_power": "15000",
  "card_back_skill": "...",
  "card_back_traits": ["Saiyan"],
  "card_back_character": ["Broly"],
  "card_back_era": ["Broly Saga"],
  "variants": [...],
  "erratas": [],
  "is_banned": false,
  "is_limited": false,
  "limited_to": 4,
  "finishes": null,
  "has_errata": false,
  "status": "published",
  "view_count": 42395,
  "z_energy_cost": null,
  "id": 4567
}
```

#### Images DeckPlanet

```
# Recto
https://multi-deckplanet.us-southeast-1.linodeobjects.com/dbs_masters/{CARD_NO}.webp
# Verso (Leaders)
https://multi-deckplanet.us-southeast-1.linodeobjects.com/dbs_masters/{CARD_NO}_b.webp
```

#### Endpoint Fusion World

`https://api.deckplanet.net/cardsearch/dbs_fusion_world_cards` → **Erreur 500** (en développement probable)

### 3.2 DBS-CardGame.com (Bandai officiel) — Scraping possible

| Métrique | Valeur |
|---|---|
| Type | Site officiel Bandai, HTML scraping requis |
| Masters URL | `https://www.dbs-cardgame.com/us-en/cardlist/?search=true&category={ID}` |
| Fusion World URL | `https://www.dbs-cardgame.com/fw/en/cardlist/` |
| API | ❌ Aucune API JSON |
| Masters | ~5 000+ cartes, 132 sets, données dans HTML (680 KB/set) |
| Fusion World | ~500+ cartes, données dans HTML (126 KB/set) |
| Images | ✅ PNG/Webp haute qualité |
| Langues | en, jp, fr, it, asia-en, asia-tc, asia-th |
| Rate limit | Non documenté mais prudence recommandée |

#### Pattern d'images officiel

```
# Fusion World
https://www.dbs-cardgame.com/fw/images/cards/card/en/{CARD_NO}_f.webp

# Masters
https://www.dbs-cardgame.com/images/cardlist/cardimg/{CARD_NO}.png
```

### 3.3 GitHub — GReeN-HaXe/DBSCGAIAgentProject

- **URL** : `https://github.com/GReeN-HaXe/DBSCGAIAgentProject`
- Dump complet DBS Masters : `dbs_masters_full.json` (18.7 MB)
- Base SQLite : `dbs_masters.db` (13.8 MB)
- Source : données scrapées depuis DeckPlanet
- Mise à jour : ~2 semaines (actif mars 2026)

### 3.4 Cardmarket API (prix uniquement)

- URL : `https://api.cardmarket.com/ws/v2.0/`
- Auth : 🔒 OAuth requis (compte vendeur)
- Format : XML REST
- Données : DBS Masters + Fusion World, prix marché européen
- Pas de données de gameplay, uniquement prix/disponibilité

---

## 4. Sources écartées

| Source | Raison |
|---|---|
| **carddass.com** (Bandai officiel) | Portail japonais, aucune base de données vintage, aucune API |
| **DragonBall Wiki (Fandom)** | Article encyclopédique, pas de listing de cartes structuré |
| **RetroDBZccg.com** | Score/Panini DBZ CCG américain, PAS le Carddass japonais Bandai |
| **dbs-decks.com** | Site mort/compromis, redirige vers un domaine suspect |
| **teoisnotdead/api-dbscg-fw** | GitHub 0 stars, pas de données, pas de déploiement |
| **TCGPlayer API** | Auth requise, données de prix uniquement |
| **Wayback Machine (dbzcollection)** | 412 captures mais rate-limited, le site live fonctionne mieux |

---

## 5. Synthèse et plan d'action

### Couverture par source

| Source | Vintage Carddass (1991+) | DBS Masters (2017+) | Fusion World (2024+) | Dragon Ball Heroes | Type | Auth |
|---|---|---|---|---|---|---|
| **dbzcollection.fr** | ✅ ~27 000 cartes | ❌ | ❌ | ✅ (collections Heroes) | Scraping AJAX | ❌ |
| **DeckPlanet API** | ❌ | ✅ 6 219 cartes | ⚠️ En dev | ❌ | REST JSON | ❌ |
| **DBS-CardGame.com** | ❌ | ✅ ~5 000+ | ✅ ~500+ | ❌ | HTML scraping | ❌ |

### Plan d'implémentation recommandé

#### Phase 1 : dbzcollection.fr → Vintage Carddass (~27 000 cartes)

**Priorité : HAUTE** — Source unique, même architecture que animecollection.fr

1. **Scraping du catalogue** (collections + séries via AJAX)
2. **Enrichissement** (détails cartes via AJAX, images supplémentaires, packagings)
3. **Téléchargement images** (h400 pour HD, h50 pour miniatures)
4. **Ingestion PostgreSQL** (adapter le schéma existant `carddass_*` ou créer `dbz_carddass_*`)
5. **Intégration API** (nouveau provider `dbz-carddass.provider.js` ou extension du provider existant)

**Estimations** :
- ~27 000 cartes × 2 images (h50 + h400) = ~54 000 images
- ~3 798 images supplémentaires × 2 tailles = ~7 596 images
- ~1 883 packagings × 2 tailles = ~3 766 images
- **Total estimé : ~65 362 fichiers**
- Durée estimée : 8-12h (avec rate limiting 200-300ms)

#### Phase 2 : DeckPlanet API → DBS Masters TCG (6 219 cartes)

**Priorité : HAUTE** — API REST JSON sans auth, données prêtes à l'emploi

1. **Ingestion directe** (125 requêtes paginées = ~2 minutes)
2. **Download images** (6 219 cartes webp depuis Linode)
3. **Nouveau provider TCG** (`dbs-masters.provider.js` dans `src/domains/tcg/providers/`)
4. **Routes API** (search, cards/:id, sets, etc.)

**Estimations** :
- 125 requêtes API → ~2 minutes
- 6 219 images → ~1 heure
- **Intégration API : 1-2 jours de développement**

#### Phase 3 : DBS-CardGame.com → Fusion World (si DeckPlanet indisponible)

**Priorité : MOYENNE** — Fallback pour Fusion World

1. **Scraping HTML** du site officiel (cartes embarquées dans le HTML)
2. **Parsing** des données structurées (classes CSS cohérentes)
3. **Download images** (webp haute qualité)

#### Phase 4 (bonus) : onepiececollection.fr → One Piece Carddass

**Priorité : BASSE** — 11 617 cartes, même architecture, facile à ajouter

---

## 6. Endpoints AJAX de dbzcollection.fr

Base URL : `http://www.dbzcollection.fr/2v2/traitements_ajax/`

### Endpoints de lecture (GET)

| Endpoint | Paramètres | Rôle |
|---|---|---|
| `get_contenu_collection.php` | `mode`, `idc`, `idm` | Contenu complet d'une collection |
| `get_liste_series_collection.php` | `idc` | Liste des séries d'une collection |
| `get_liste_cartes.php` | `numero`, `idc`, `idtc`, `nom`, `nature`, `prix_appel`, `nc`, `pa`, `phase`, `caracteristiques`, `pouvoir` | Liste d'IDs de cartes |
| `get_liste_types_carte.php` | `idc` | Types de carte d'une collection |
| `get_liste_types_carte2.php` | `idc` | Types de carte (variante) |
| `get_infos_detail_carte.php` | `id` | Détail complet d'une carte |
| `get_infos_apercu.php` | `id` | Aperçu rapide |
| `get_image_detail_carte.php` | `img400` | Image carte (recto) |
| `get_image_detail_carte_img.php` | `img400` | Image supplémentaire |
| `get_infos_detail_pack.php` | `id` | Détail packaging |
| `get_image_detail_pack.php` | `img400` | Image packaging |
| `get_carte_mini.php` | `id` | Miniature carte |
| `get_personnages_by_collection_and_type_carte.php` | `idc`, `idtc` | Personnages filtres |
| `get_natures_by_collection_and_type_carte.php` | `idc`, `idtc` | Natures filtres |
| `get_phases_by_collection_and_type_carte.php` | `idc`, `idtc` | Phases filtres |
| `get_nc_by_collection_and_type_carte.php` | `idc`, `idtc` | NC filtres |
| `get_pa_by_collection_and_type_carte.php` | `idc`, `idtc` | PA filtres |
| `get_prix_appel_by_collection_and_type_carte.php` | `idc`, `idtc` | Prix appel filtres |
| `get_commentaire.php` | `idnews` | Commentaires |
| `get_shootbox.php` | | Shootbox |

### Endpoints membres (non pertinents pour le scraping)

`ajouter_carte.php`, `supprimer_carte.php`, `set_carte_possede.php`, etc.

---

## 7. Collections clés dbzcollection.fr

### Vintage (années 1990)

| ID | Nom | Cartes vérifiées |
|---|---|---|
| 18 | Carddass | 1 964 (42 séries) |
| 34 | Super Battle | À mesurer |
| 56 | Visual Adventure | À mesurer |
| 37 | PP Card | À mesurer |
| 151 | Rami Card | À mesurer |
| 68 | Anthologie | À mesurer |

### Arcade / Heroes

| ID | Nom |
|---|---|
| 142 | Dragon Ball Heroes |
| 199 | Super Dragon Ball Heroes |

### Modernes

| ID | Nom |
|---|---|
| 206 | DBS Card Game FR |
| 190 | DBS Card Game US |
| 330 | DBS Card Game Fusion JP |
| 333 | DBS Card Game Fusion US |

### Données détaillées

| ID | Nom | Catégorie |
|---|---|---|
| 11 | Data Carddass DB Kai | Data Carddass |
| 13 | Data Carddass DBKai 2 | Data Carddass |
| 128 | Miracle Battle Carddass | Battle |
| 172 | IC Carddass Dragon Ball | IC Carddass |
| 119 | Artbox | Trading |
| 129 | Ani-Mayhem | CCG |
| 130 | Score DBZ CCG | CCG |

**Total : 336 collections, ~27 000+ cartes sur l'ensemble du site**

---

## Notes techniques

### VPN obligatoire

Toutes les requêtes vers dbzcollection.fr (OVHcloud) **DOIVENT** passer par Gluetun :
```bash
curl -x http://localhost:8889 "http://www.dbzcollection.fr/..."
```

IP publique VPN : `156.146.63.177` (PIA)  
IP Labo (bannissable) : `82.64.251.170`

### Particularité SQL debug

Les endpoints AJAX de dbzcollection.fr affichent la requête SQL brute dans un `<pre>` en début de réponse :
```html
<pre>SELECT ct.id, ct.numero, s.id as ids, c.id as idc FROM cartes as ct, series as s...</pre>
```
Cela confirme la structure DB interne et aide à comprendre les paramètres.

### Différences d'encodage URL

Les AJAX utilisent des URLs absolues dans le JS :
```javascript
file('http://www.dbzcollection.fr/2v2/index.php/../traitements_ajax/get_liste_series_collection.php?idc='+valeur);
```
Le `index.php/../` est résolu par le serveur en `/2v2/traitements_ajax/`.
