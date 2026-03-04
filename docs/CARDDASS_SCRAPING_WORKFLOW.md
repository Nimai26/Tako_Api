# Carddass Archival Workflow

> **Sources** : [animecollection.fr](http://www.animecollection.fr) + [dbzcollection.fr](http://www.dbzcollection.fr)  
> **Objectif** : Archiver l'intégralité des catalogues Carddass dans PostgreSQL + stockage fichiers local  
> **Version** : 2.0.0 (multi-sites)  
> **Date** : 2026-03-04

## Données archivées (totaux)

| Source | Cartes | Images | Taille |
|--------|--------|--------|--------|
| animecollection.fr | 31 685 | ~40 605 fichiers | 6,5 Go |
| dbzcollection.fr | 90 515 | ~219 093 fichiers | 9,8 Go |
| **Total** | **122 200** | **~227 455** | **~10,4 Go** |

> **Note** : Les deux sites partagent la même architecture PHP/AJAX. La colonne `source_site` permet de les distinguer en base. Le script `scrape-dbzcollection.cjs` est un dérivé de l'original pour animecollection.

---

## Table des matières

1. [Vue d'ensemble du site](#1-vue-densemble-du-site)
2. [Structure des données](#2-structure-des-données)
3. [Schéma PostgreSQL](#3-schéma-postgresql)
4. [Stratégie de scraping](#4-stratégie-de-scraping)
5. [Patterns d'URLs et images](#5-patterns-durls-et-images)
6. [Endpoints AJAX](#6-endpoints-ajax)
7. [Système de raretés](#7-système-de-raretés)
8. [Workflow d'exécution](#8-workflow-dexécution)
9. [Gestion des fichiers](#9-gestion-des-fichiers)
10. [Rate limiting et sécurité](#10-rate-limiting-et-sécurité)
11. [Monitoring et reprise](#11-monitoring-et-reprise)
12. [Estimations](#12-estimations)

---

## 1. Vue d'ensemble du site

### Statistiques (source : page d'accueil)

| Métrique | Quantité |
|----------|----------|
| Cartes | 31 685 |
| Licences | 80 |
| Collections | 336 |
| Séries | 733 |
| Images supplémentaires | 6 386 |
| Packagings | 1 734 |

### Caractéristiques techniques

- **Encodage** : ISO-8859-1 (Latin-1)
- **HTML** : 4.01 Transitional, PHP classique, pas de framework JavaScript
- **Hébergeur** : OVHcloud (protection anti-scraping agressive)
- **Structure** : Navigation par paramètres GET (`idl`, `idc`, `ids`)

### Hiérarchie des données

```
License (80)
  └── Collection (336)
        └── Série (733)
              ├── Cards (~31 685)
              │     └── Images supplémentaires (6 386)
              └── Packagings (1 734)
```

---

## 2. Structure des données

### 2.1 Licence (Level 1)

**Page** : `cartes.php?idl={idl}`

Données extraites depuis la page des licences (`cartes.php` sans paramètre) :

| Champ | Source HTML | Exemple |
|-------|------------|---------|
| `id` (idl) | `href="cartes.php?idl={id}"` | `5` |
| `name` | `<div class="bloc_texte_licence">{name}</div>` | `Yū Yū Hakusho` |
| `image_url` | `<img src="images_licence/{id}.jpg">` | `images_licence/5.jpg` |
| `banner_url` | `uploaded_images/h625_{id}.jpg` | `uploaded_images/h625_5.jpg` |
| `description` | `<div class="bloc_texte">` après `titre_violet_licence` | Texte libre |

### 2.2 Collection (Level 2)

**Page** : `cartes.php?idl={idl}&idc={idc}`

Données extraites depuis la page licence :

| Champ | Source HTML | Exemple |
|-------|------------|---------|
| `id` (idc) | `href="cartes.php?idl={idl}&idc={id}"` | `13` |
| `name` | `<a class="lien_collection">{name}</a>` | `Carddass` |
| `license_id` | Paramètre `idl` de l'URL parente | `5` |

> **⚠️ Attention** : Les `&` dans les liens de collection sont encodés en `&amp;` dans certains cas mais en `&` brut dans d'autres (séries). Gérer les deux.

### 2.3 Série (Level 3)

**Page** : `cartes.php?idl={idl}&idc={idc}&ids={ids}`

Données extraites depuis la page collection :

| Champ | Source HTML | Exemple |
|-------|------------|---------|
| `id` (ids) | `href="cartes.php?idl={idl}&idc={idc}&ids={id}"` | `22` |
| `name` | `<img id="{name}" src="images/capsules/{name}.gif">` | `Part 1` |
| `capsule_url` | `images/capsules/{name}.gif` | `images/capsules/Part 1.gif` |
| `collection_id` | Paramètre `idc` de l'URL parente | `13` |

Données supplémentaires sur la page série :

| Champ | Source HTML | Exemple |
|-------|------------|---------|
| `description` | `<div class="bloc_texte">` après description | `Première série... 42 cartes dont 6 prismes et 36 regulars` |

### 2.4 Carte (Level 4)

**Page** : Sur la page série (`cartes.php?idl={idl}&idc={idc}&ids={ids}`)

Données extraites depuis la page série + AJAX :

| Champ | Source | Pattern d'extraction |
|-------|--------|---------------------|
| `card_id` | `onclick` | `afficher_detail('{card_id}','{path}')` |
| `number` | `bc_texte_numero` | `<div class="bc_texte_numero">{num}</div>` |
| `rarity` | `title` attr | `<div class="bc_cadre_numero" title="{rarity}"` |
| `rarity_color` | `style` attr | `url(images/titres_cartes/{color}.jpg)` |
| `image_url` | `src` attr | `cartes/{idc}/{ids}/h100_{card_id}_carte.jpg` |
| `hd_image_url` | AJAX | `cartes/{idc}/{ids}/h3000_{card_id}_carte.jpg` |

> **La `title` de `bc_cadre_numero` donne le nom exact de la rareté**, pas besoin de mapper manuellement.

### 2.5 Image Supplémentaire

**Source** : Bloc `IMAGE SUP` dans la réponse AJAX `get_infos_detail_carte.php`

| Champ | Source | Pattern |
|-------|--------|---------|
| `img_id` | `onclick` | `afficher_detail_img('{img_id}','{path}','{card_id}')` |
| `label` | `bc_texte_numero` | `Verso`, `01`, etc. |
| `image_url` | `src` | `cartes/{idc}/{ids}/{card_id}/h100_{img_id}_carte_image.jpg` |
| `hd_url` | AJAX | `cartes/{idc}/{ids}/{card_id}/h3000_{img_id}_carte_image.jpg` |

### 2.6 Packaging

**Source** : Section packaging sur la page série

| Champ | Source | Pattern |
|-------|--------|---------|
| `pack_id` | `onclick` | `afficher_l_pack('{pack_id}','{path}')` |
| `label` | `bc_texte_numero` | `Display`, `Dos des cartes`, etc. |
| `image_url` | `src` | `packagings/{idc}/{ids}/h100_{pack_id}_packaging.jpg` |

---

## 3. Schéma PostgreSQL

### 3.1 Table `carddass_licenses`

```sql
CREATE TABLE IF NOT EXISTS carddass_licenses (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL UNIQUE,        -- idl du site
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,                            -- images_licence/{id}.jpg
  image_path VARCHAR(500),                   -- chemin local après download
  banner_url TEXT,                           -- uploaded_images/h625_{id}.jpg
  banner_path VARCHAR(500),
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carddass_licenses_source ON carddass_licenses(source_id);
```

### 3.2 Table `carddass_collections`

```sql
CREATE TABLE IF NOT EXISTS carddass_collections (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL,               -- idc du site
  license_id INTEGER NOT NULL REFERENCES carddass_licenses(id),
  name VARCHAR(255) NOT NULL,
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id, license_id)
);

CREATE INDEX IF NOT EXISTS idx_carddass_collections_license ON carddass_collections(license_id);
CREATE INDEX IF NOT EXISTS idx_carddass_collections_source ON carddass_collections(source_id);
```

### 3.3 Table `carddass_series`

```sql
CREATE TABLE IF NOT EXISTS carddass_series (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL,               -- ids du site
  collection_id INTEGER NOT NULL REFERENCES carddass_collections(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  capsule_url TEXT,                          -- images/capsules/{name}.gif
  capsule_path VARCHAR(500),
  card_count INTEGER,                        -- extrait de la description
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_carddass_series_collection ON carddass_series(collection_id);
CREATE INDEX IF NOT EXISTS idx_carddass_series_source ON carddass_series(source_id);
```

### 3.4 Table `carddass_cards`

```sql
CREATE TABLE IF NOT EXISTS carddass_cards (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL UNIQUE,        -- card_id du site (unique global)
  series_id INTEGER NOT NULL REFERENCES carddass_series(id),
  card_number VARCHAR(20) NOT NULL,         -- numéro affiché (peut être "01", "A1", etc.)
  rarity VARCHAR(100),                       -- "Regular", "Prism", "Hidden Prism", etc.
  rarity_color VARCHAR(50),                  -- "orange", "rouge", "violet", etc.
  
  -- URLs source (relatives à http://www.animecollection.fr/)
  image_url_thumb TEXT,                      -- h100_{id}_carte.jpg
  image_url_hd TEXT,                         -- h3000_{id}_carte.jpg
  
  -- Chemins locaux après download
  image_path_thumb VARCHAR(500),
  image_path_hd VARCHAR(500),
  
  -- Métadonnées AJAX
  license_name VARCHAR(255),                 -- redondant mais utile pour vérification
  collection_name VARCHAR(255),
  series_name VARCHAR(255),
  
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carddass_cards_series ON carddass_cards(series_id);
CREATE INDEX IF NOT EXISTS idx_carddass_cards_rarity ON carddass_cards(rarity);
CREATE INDEX IF NOT EXISTS idx_carddass_cards_source ON carddass_cards(source_id);
```

### 3.5 Table `carddass_extra_images`

```sql
CREATE TABLE IF NOT EXISTS carddass_extra_images (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL UNIQUE,        -- img_id du site
  card_id INTEGER NOT NULL REFERENCES carddass_cards(id),
  label VARCHAR(100),                        -- "Verso", "01", etc.
  image_url_thumb TEXT,                      -- h100_{img_id}_carte_image.jpg
  image_url_hd TEXT,                         -- h3000_{img_id}_carte_image.jpg
  image_path_thumb VARCHAR(500),
  image_path_hd VARCHAR(500),
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carddass_extra_card ON carddass_extra_images(card_id);
```

### 3.6 Table `carddass_packagings`

```sql
CREATE TABLE IF NOT EXISTS carddass_packagings (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL UNIQUE,        -- pack_id du site
  series_id INTEGER NOT NULL REFERENCES carddass_series(id),
  label VARCHAR(100),                        -- "Display", "Dos des cartes", etc.
  image_url TEXT,                            -- packagings/{idc}/{ids}/h100_{id}_packaging.jpg
  image_path VARCHAR(500),
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carddass_pack_series ON carddass_packagings(series_id);
```

### 3.7 Table de tracking

```sql
-- Réutilisation de _seed_migrations existant pour les seeds SQL
-- + Table de suivi du scraping
CREATE TABLE IF NOT EXISTS carddass_scraping_progress (
  id SERIAL PRIMARY KEY,
  phase VARCHAR(50) NOT NULL,               -- 'licenses', 'collections', 'series', 'cards', 'images'
  entity_type VARCHAR(50) NOT NULL,          -- 'license', 'collection', 'series', 'card', 'extra_image', 'packaging'
  entity_source_id INTEGER,                  -- ID source (idl, idc, ids, card_id...)
  status VARCHAR(20) DEFAULT 'pending',      -- 'pending', 'scraped', 'downloaded', 'error'
  error_message TEXT,
  last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  UNIQUE(entity_type, entity_source_id)
);

CREATE INDEX IF NOT EXISTS idx_scraping_status ON carddass_scraping_progress(status);
CREATE INDEX IF NOT EXISTS idx_scraping_phase ON carddass_scraping_progress(phase);
```

---

## 4. Stratégie de scraping

### 4.1 Vue d'ensemble des phases

```
Phase 1 : Catalogue (HTML parsing) ──→ Phase 2 : Enrichissement (AJAX) ──→ Phase 3 : Download (images)
   ~1 150 requêtes                        ~31 685 requêtes                    ~71 540 fichiers
   ~19 min @ 1 req/s                      ~8h48 @ 1 req/s                    ~198h @ 1 req/s (ou parallèle)
```

### Phase 1 — Catalogue (scraping HTML)

**Objectif** : Construire la hiérarchie complète License → Collection → Série → Carte (métadonnées de base)

| Étape | Action | Requêtes estimées |
|-------|--------|-------------------|
| 1.1 | Scraper la page licences (`cartes.php` root) | 1 |
| 1.2 | Scraper chaque page licence (`cartes.php?idl=X`) | 80 |
| 1.3 | Scraper chaque page collection (`cartes.php?idl=X&idc=Y`) | 336 |
| 1.4 | Scraper chaque page série (`cartes.php?idl=X&idc=Y&ids=Z`) | 733 |
| **Total** | | **~1 150** |

Données récupérées par carte (depuis la page série, sans AJAX) :
- `source_id` (card_id)
- `card_number`
- `rarity` (title attribute)
- `rarity_color` (background image)
- `image_url_thumb` (h100)

### Phase 2 — Enrichissement (AJAX)

**Objectif** : Récupérer les données détaillées via les endpoints AJAX

| Étape | Action | Requêtes estimées |
|-------|--------|-------------------|
| 2.1 | Appeler `get_infos_detail_carte.php?id=X` pour chaque carte | 31 685 |
| **Total** | | **~31 685** |

Données récupérées :
- `license_name`, `collection_name`, `series_name` (vérification)
- `card_number` (confirmation)
- `rarity` (confirmation)
- `image_url_hd` (h3000)
- **Images supplémentaires** (bloc `IMAGE SUP`) : IDs, labels, URLs

> **Optimisation** : La phase 2 donne TOUT d'un seul appel : HD URL + images supplémentaires + vérification de la carte.

### Phase 3 — Download des fichiers

**Objectif** : Télécharger toutes les images en résolution maximale

| Type de fichier | Quantité | Taille estimée | Pattern d'URL |
|----------------|----------|----------------|---------------|
| Cartes HD (h3000) | 31 685 | ~150-500 KB/img → ~8-16 GB | `cartes/{idc}/{ids}/h3000_{id}_carte.jpg` |
| Images sup HD (h3000) | 6 386 | ~150-500 KB/img → ~2-3 GB | `cartes/{idc}/{ids}/{cid}/h3000_{id}_carte_image.jpg` |
| Packagings (h400) | 1 734 | ~50-200 KB/img → ~100-350 MB | `packagings/{idc}/{ids}/h400_{id}_packaging.jpg` |
| Capsules | ~733 | ~5-20 KB/img → ~5-15 MB | `images/capsules/{name}.gif` |
| Images licence | ~80 | ~50-200 KB/img → ~5-16 MB | `images_licence/{id}.jpg` |
| Banners licence | ~80 | ~100-400 KB/img → ~8-32 MB | `uploaded_images/h625_{id}.jpg` |
| **Total** | **~40 698** | **~10-20 GB** | |

---

## 5. Patterns d'URLs et images

### Base URL : `http://www.animecollection.fr/`

### Pages de navigation

```
# Toutes les licences
cartes.php

# Page licence (collections listées)
cartes.php?idl={idl}

# Page collection (séries listées)
cartes.php?idl={idl}&idc={idc}

# Page série (cartes + packagings)
cartes.php?idl={idl}&idc={idc}&ids={ids}
```

### Images

#### Cartes (image principale)

```
# Format : cartes/{idc}/{ids}/h{size}_{card_id}_carte.jpg
# Tailles : h50, h100, h200, h400, h3000

# Exemples :
cartes/195/425/h50_17673_carte.jpg     # Tiny thumb
cartes/195/425/h100_17673_carte.jpg    # Standard thumb (dans HTML)
cartes/195/425/h400_17673_carte.jpg    # Large (popup onclick)
cartes/195/425/h3000_17673_carte.jpg   # HD download (via AJAX)
```

#### Images supplémentaires (verso, variantes, etc.)

```
# Format : cartes/{idc}/{ids}/{card_id}/h{size}_{img_id}_carte_image.jpg
# Sous-dossier nommé par le card_id

# Exemple :
cartes/58/124/4740/h100_115_carte_image.jpg    # Standard thumb
cartes/58/124/4740/h3000_115_carte_image.jpg   # HD download (via AJAX)
```

#### Packagings

```
# Format : packagings/{idc}/{ids}/h{size}_{pack_id}_packaging.jpg
# Tailles : h100, h400

# Exemple :
packagings/195/425/h100_859_packaging.jpg    # Thumb
packagings/195/425/h400_859_packaging.jpg    # Large (popup)
```

#### Licences et capsules

```
# Image licence
images_licence/{idl}.jpg

# Banner licence
uploaded_images/h625_{idl}.jpg

# Capsule (icône de série)
images/capsules/{series_name}.gif
```

---

## 6. Endpoints AJAX

### 6.1 Détail d'une carte

```
GET traitements_ajax/get_infos_detail_carte.php?id={card_id}
```

**Réponse** (HTML) :

```html
<table class="apercu_table">
  <tr><td>Licence :</td><td>{license_name}</td></tr>
  <tr><td>Collection :</td><td>{collection_name}</td></tr>
  <tr><td>Série :</td><td>{series_name}</td></tr>
  <tr><td>Numéro :</td><td>{card_number}</td></tr>
  <tr><td>Rareté :</td><td>{rarity}</td></tr>
  <tr><td>Version HD :</td><td><a href="{h3000_url}">...</a></td></tr>
</table>
<!-- BLOC IMAGE SUP -->
<div>
  <!-- Contient les images supplémentaires si elles existent -->
  <td class="bloc_carte">
    <img src="cartes/{idc}/{ids}/{card_id}/h100_{img_id}_carte_image.jpg" />
    <!-- bc_texte_numero = label (ex: "Verso") -->
  </td>
</div>
<!-- FIN BLOC IMAGE SUP -->
```

**Données à extraire** :
- `license_name` → `apercu_td_valeur` après "Licence"
- `collection_name` → après "Collection"
- `series_name` → après "Série"
- `card_number` → après "Numéro"
- `rarity` → après "Rareté"
- `hd_url` → `href` dans la ligne "Version HD"
- Images sup → Tous les `carte_image.jpg` dans le bloc IMAGE SUP avec leurs IDs et labels

### 6.2 Détail d'une image supplémentaire

```
GET traitements_ajax/get_infos_detail_carte.php?idci={img_id}&id={card_id}
```

Même format que 6.1 mais avec la Version HD pointant vers `h3000_{img_id}_carte_image.jpg`.

### 6.3 Image popup (carte)

```
GET traitements_ajax/get_image_detail_carte.php?img400={idc}/{ids}/h400_{card_id}
```

**Réponse** : `<img src="cartes/{idc}/{ids}/h400_{card_id}_carte.jpg" />`

> **Non nécessaire pour le scraping** — on récupère directement le h3000 via 6.1.

### 6.4 Image popup (image supplémentaire)

```
GET traitements_ajax/get_image_detail_carte_img.php?img400={idc}/{ids}/{card_id}/h400_{img_id}
```

> **Non nécessaire pour le scraping**.

---

## 7. Système de raretés

### Mapping couleur → noms de raretés

Le site utilise des images de fond (`images/titres_cartes/*.jpg`) pour colorer les numéros de cartes. L'attribut `title` donne le nom exact de la rareté.

| Couleur (fichier) | Noms de raretés associés |
|-------------------|--------------------------|
| `orange.jpg` | Regular, Common, Normal, N, Carte de base |
| `rouge.jpg` | Prism, Holographics, Miracle Rare, SSP, Visual Play |
| `violet.jpg` | Hidden Prism, Ultra Rare, Moving, Reverse prism, Starter, SSSP, Super Omega Rare, USR, Gintama Rare, Kami Omega Rare, KiseKi Rare |
| `rouge_violet.jpg` | Double Prism, Prism hard |
| `bleu_vert.jpg` | Rare, R, Prism Losange, EX Card, Foil Printing Clear Card, MAGI Rare, Normal Card (Hologram-Engrave Spec) |
| `bleu_violet.jpg` | Super Rare, RR, Prism Ecaille |
| `cyan.jpg` | SR, 3D, Dragon Rare, Metal Parallel, Parallel Rare, Prism Pixel |
| `jaune.jpg` | Gold, Carte Or, Cosmo, UR, SP, Grand Super Rare, Super Super Rare, Gold Stamp |
| `argent.jpg` | Silver, Metal, Metallic, Carte Argent, SB, Silver Stamp, Tarot, Placard |
| `bleu.jpg` | Boost |
| `bleu_gris.jpg` | Uncommon, Checklist, Plastic Card, Prism Eclat, Regular autocollante |
| `ecarlate.jpg` | Special, Special Card, Carte Edition Limitée, Giga Rare, TR, USSR |
| `vert_bleu.jpg` | Limited, SG |
| `vert_jaune.jpg` | Promo, Hors-série, Secret, SO |
| `regular.jpg` | *(Utilisé pour les packagings, pas les cartes)* |

### Extraction (2 méthodes)

**Méthode 1 — HTML de la page série** (rapide, Phase 1) :

```python
# Regex pour chaque carte
title="{rarity}" style="background:transparent url(images/titres_cartes/{color}.jpg)
```

**Méthode 2 — AJAX** (confirmation, Phase 2) :

```
<td>Rareté :</td><td>{rarity}</td>
```

### Légende de la page série

Chaque page série contient une section légende (bloc `titre_bleu_legende`) qui liste les raretés présentes dans cette série. Utile pour validation.

---

## 8. Workflow d'exécution

### 8.1 Pré-requis

```bash
# VPN obligatoire (IP Labo bannie par OVHcloud)
docker start tako_gluetun
# Vérifier : curl --proxy http://localhost:8889 http://ifconfig.me

# PostgreSQL
docker start tako_db

# Optionnel : FlareSolverr (si Cloudflare apparaît)
docker start tako_flaresolverr
```

### 8.2 Phase 1 — Scraping du catalogue

```
1.1  GET cartes.php (sans param)
     → Parser les 80 licences (idl, name)
     → INSERT INTO carddass_licenses

1.2  Pour chaque licence :
     GET cartes.php?idl={idl}
     → Parser les collections (idc, name)
     → Parser description + image licence
     → INSERT INTO carddass_collections

1.3  Pour chaque collection :
     GET cartes.php?idl={idl}&idc={idc}
     → Parser les séries (ids, name, capsule)
     → INSERT INTO carddass_series

1.4  Pour chaque série :
     GET cartes.php?idl={idl}&idc={idc}&ids={ids}
     → Parser les cartes :
         • card_id (onclick="afficher_detail('{id}',...")
         • card_number (bc_texte_numero)
         • rarity (title attribute)
         • rarity_color (url background)
         • image_url_thumb (h100 src)
     → Parser les packagings :
         • pack_id (afficher_l_pack('{id}',...)
         • label (bc_texte_numero)
         • image_url
     → INSERT INTO carddass_cards
     → INSERT INTO carddass_packagings
     → UPDATE carddass_scraping_progress
```

### 8.3 Phase 2 — Enrichissement AJAX

```
2.1  Pour chaque carte WHERE image_url_hd IS NULL :
     GET traitements_ajax/get_infos_detail_carte.php?id={source_id}
     → Parser la réponse :
         • Confirmer rarity
         • Extraire hd_image_url (h3000)
         • Extraire images supplémentaires du bloc IMAGE SUP
     → UPDATE carddass_cards SET image_url_hd = ...
     → INSERT INTO carddass_extra_images
     → UPDATE carddass_scraping_progress
```

### 8.4 Phase 3 — Download des images

```
3.1  Cartes HD :
     Pour chaque carte WHERE image_path_hd IS NULL :
     wget/curl cartes/{idc}/{ids}/h3000_{card_id}_carte.jpg
     → Sauvegarder dans {storage}/carddass-archive/cards/{idc}/{ids}/
     → UPDATE carddass_cards SET image_path_hd = ...

3.2  Images supplémentaires HD :
     Pour chaque extra_image WHERE image_path_hd IS NULL :
     wget/curl cartes/{idc}/{ids}/{card_id}/h3000_{img_id}_carte_image.jpg
     → Sauvegarder dans {storage}/carddass-archive/cards/{idc}/{ids}/{card_id}/
     → UPDATE carddass_extra_images SET image_path_hd = ...

3.3  Packagings :
     Pour chaque packaging WHERE image_path IS NULL :
     wget/curl packagings/{idc}/{ids}/h400_{pack_id}_packaging.jpg
     → Sauvegarder dans {storage}/carddass-archive/packagings/{idc}/{ids}/
     → UPDATE carddass_packagings SET image_path = ...

3.4  Capsules et images licence :
     wget images/capsules/{name}.gif → {storage}/carddass-archive/capsules/
     wget images_licence/{idl}.jpg → {storage}/carddass-archive/licenses/
     wget uploaded_images/h625_{idl}.jpg → {storage}/carddass-archive/licenses/banners/
```

---

## 9. Gestion des fichiers

### 9.1 Structure de stockage

```
/mnt/egon/websites/tako-storage/carddass-archive/
├── cards/                                    # ~31 685 + ~6 386 fichiers
│   └── {idc}/                               # Par collection
│       └── {ids}/                           # Par série
│           ├── h3000_{card_id}_carte.jpg    # Image principale HD
│           └── {card_id}/                   # Sous-dossier images sup
│               └── h3000_{img_id}_carte_image.jpg
├── packagings/                               # ~1 734 fichiers
│   └── {idc}/
│       └── {ids}/
│           └── h400_{pack_id}_packaging.jpg
├── capsules/                                 # ~733 fichiers
│   └── {name}.gif
├── licenses/                                 # ~80 fichiers
│   ├── {idl}.jpg                            # Logo licence
│   └── banners/
│       └── h625_{idl}.jpg                   # Banner
└── thumbs/                                   # Optionnel : thumbnails
    └── cards/
        └── {idc}/{ids}/h100_{card_id}_carte.jpg
```

### 9.2 Convention de nommage

- **Conserver la structure du site** : Les chemins reproduisent les paths du serveur source
- **Pas de renommage** : Les noms de fichiers originaux sont conservés
- **Pas de dé-duplication** : Les IDs source sont uniques globalement

### 9.3 Taille estimée

| Type | Fichiers | Taille estimée |
|------|----------|----------------|
| Cartes HD (h3000) | 31 685 | 8-16 GB |
| Extra images HD | 6 386 | 2-3 GB |
| Packagings (h400) | 1 734 | 100-350 MB |
| Capsules + licences | ~900 | ~30 MB |
| **Total** | **~40 700** | **~10-20 GB** |

---

## 10. Rate limiting et sécurité

### 10.1 Contraintes OVHcloud

⚠️ **L'IP du Labo (82.64.251.170) est bannie** par OVHcloud suite à des requêtes directes.

**TOUTES les requêtes doivent passer par le proxy VPN** :

```bash
# Via curl
curl --proxy http://localhost:8889 "http://www.animecollection.fr/..."

# Via Node.js (HttpsProxyAgent)
import { HttpProxyAgent } from 'http-proxy-agent';
const agent = new HttpProxyAgent('http://localhost:8889');
fetch(url, { agent });
```

### 10.2 Rate limiting recommandé

| Phase | Délai entre requêtes | Justification |
|-------|---------------------|---------------|
| Phase 1 (HTML) | 1-2 sec | Pages lourdes (50-100 KB), peu de requêtes |
| Phase 2 (AJAX) | 500ms-1 sec | Réponses légères (~1-2 KB), beaucoup de requêtes |
| Phase 3 (images) | 200-500ms | Download pur, peut paralléliser (2-3 threads) |

### 10.3 Headers HTTP

```javascript
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate',
  'Referer': 'http://www.animecollection.fr/cartes.php',
  'Connection': 'keep-alive'
};
```

### 10.4 Gestion des erreurs HTTP

```javascript
// Stratégie de retry avec backoff exponentiel
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 5000,      // 5 sec
  maxDelay: 60000,          // 1 min
  backoffFactor: 2,
  retryOnStatus: [429, 500, 502, 503, 504]
};
```

### 10.5 Détection de ban

Si une requête retourne un HTML OVHcloud avec `403 Forbidden` :
1. Arrêter immédiatement toutes les requêtes
2. Logger l'erreur avec le contexte (URL, headers, IP)
3. Augmenter le délai entre requêtes
4. Vérifier si le VPN est toujours connecté (`curl --proxy http://localhost:8889 http://ifconfig.me`)

---

## 11. Monitoring et reprise

### 11.1 Table de progression

La table `carddass_scraping_progress` permet de :
- **Reprendre** après un crash ou une interruption
- **Suivre** l'avancement en temps réel
- **Identifier** les erreurs récurrentes

```sql
-- Avancement global
SELECT phase, status, COUNT(*) 
FROM carddass_scraping_progress 
GROUP BY phase, status;

-- Erreurs
SELECT entity_type, entity_source_id, error_message, attempts
FROM carddass_scraping_progress 
WHERE status = 'error'
ORDER BY attempts DESC;
```

### 11.2 Métriques de suivi

```sql
-- Cartes scrapées vs total
SELECT 
  (SELECT COUNT(*) FROM carddass_cards) as cards_scraped,
  31685 as cards_total,
  (SELECT COUNT(*) FROM carddass_cards WHERE image_url_hd IS NOT NULL) as cards_enriched,
  (SELECT COUNT(*) FROM carddass_cards WHERE image_path_hd IS NOT NULL) as cards_downloaded;

-- Images supplémentaires
SELECT 
  (SELECT COUNT(*) FROM carddass_extra_images) as extra_scraped,
  6386 as extra_total;

-- Packagings
SELECT 
  (SELECT COUNT(*) FROM carddass_packagings) as pack_scraped,
  1734 as pack_total;
```

### 11.3 Stratégie de reprise

Chaque phase utilise des requêtes de type "WHERE NOT YET DONE" :

```sql
-- Phase 1 : Séries non encore scrapées
SELECT s.source_id, s.collection_id
FROM carddass_series s
LEFT JOIN carddass_scraping_progress p 
  ON p.entity_type = 'series' AND p.entity_source_id = s.source_id AND p.status = 'scraped'
WHERE p.id IS NULL;

-- Phase 2 : Cartes non encore enrichies
SELECT source_id FROM carddass_cards WHERE image_url_hd IS NULL;

-- Phase 3 : Cartes non encore downloadées
SELECT source_id, image_url_hd FROM carddass_cards WHERE image_path_hd IS NULL AND image_url_hd IS NOT NULL;
```

---

## 12. Estimations

### Temps d'exécution

| Phase | Requêtes | Délai/req | Temps estimé |
|-------|----------|-----------|-------------|
| Phase 1 — Catalogue | 1 150 | 1.5 sec | ~29 min |
| Phase 2 — AJAX | 31 685 | 750ms | ~6h36 |
| Phase 3 — Download | 40 700 | 300ms (x3 threads) | ~3h45 |
| **Total** | | | **~10h50** |

### Espace disque

- **PostgreSQL** : ~50-100 MB (métadonnées)
- **Fichiers images** : ~10-20 GB
- **Total** : ~10-20 GB sur `/mnt/egon/websites/tako-storage/`

### Bande passante

- ~40 700 fichiers × ~300 KB moyen = ~12 GB de téléchargement
- Via VPN PIA → débit légèrement réduit (~50-80 Mbps au lieu de ~100 Mbps)

---

## Annexes

### A. Regex d'extraction validés

```python
# Licences (depuis cartes.php)
re.findall(r'idl=(\d+).*?bloc_texte_licence">\s*([^<]+)', html, re.DOTALL)

# Collections (depuis page licence)
re.findall(r'href="cartes\.php\?idl=\d+&idc=(\d+)"', html)
re.findall(r'lien_collection[^>]*>([^<]+)', html)

# Séries (depuis page collection) — ⚠️ & brut, pas &amp;
re.findall(r'href="cartes\.php\?idl=\d+&idc=\d+&ids=(\d+)"', html)
re.findall(r'<img\s+id="([^"]+)"[^>]*src="images/capsules/', html)

# Cartes + raretés (depuis page série)
re.findall(
    r'<div class="bc_cadre_numero"\s+title="([^"]*)"\s+'
    r'style="background:transparent url\(images/titres_cartes/([^)]+)\)[^"]*">'
    r'<div class="bc_texte_numero">([^<]+)</div>',
    html
)

# Card IDs + h400 paths (depuis page série)
re.findall(r"afficher_detail\('(\d+)','([^']+)'\)", html)

# Card thumbnail URLs (depuis page série)
re.findall(r'src="(cartes/\d+/\d+/h100_(\d+)_carte\.jpg)"', html)

# Packagings (depuis page série)
re.findall(r"afficher_l_pack\('(\d+)','([^']+)'\)", html)
re.findall(r'src="(packagings/\d+/\d+/h100_(\d+)_packaging\.jpg)"', html)

# AJAX detail — HD URL
re.search(r'href="(cartes/[^"]+h3000[^"]+)"', ajax_html)

# AJAX detail — Métadonnées
re.findall(r'apercu_td_intitule[^>]*>([^<]+).*?apercu_td_valeur[^>]*>([^<]+)', ajax_html, re.DOTALL)

# AJAX detail — Images supplémentaires
re.findall(r"afficher_detail_img\('(\d+)','([^']+)','(\d+)'\)", ajax_html)
re.findall(r'src="(cartes/\d+/\d+/\d+/h100_(\d+)_carte_image\.jpg)"', ajax_html)
```

### B. Commandes de test VPN

```bash
# Vérifier IP VPN
curl --proxy http://localhost:8889 http://ifconfig.me

# Tester accès au site
curl -s --proxy http://localhost:8889 "http://www.animecollection.fr/cartes.php" | head -5

# Tester endpoint AJAX
curl -s --proxy http://localhost:8889 \
  "http://www.animecollection.fr/traitements_ajax/get_infos_detail_carte.php?id=17673" | \
  iconv -f latin1 -t utf-8

# Tester téléchargement image HD
curl -s --proxy http://localhost:8889 \
  "http://www.animecollection.fr/cartes/195/425/h3000_17673_carte.jpg" \
  -o /tmp/test_hd.jpg && file /tmp/test_hd.jpg && ls -la /tmp/test_hd.jpg
```

### C. Dépendances requises

```javascript
// package.json additions
{
  "http-proxy-agent": "^7.0.0",    // Proxy VPN pour fetch/http
  "iconv-lite": "^0.6.3",          // Conversion ISO-8859-1 → UTF-8
  "cheerio": "^1.0.0"              // Parsing HTML (optionnel, regex suffit)
}
```

### D. Intégration Tako API

Après le scraping, les données Carddass seront exposées via le domaine `collectibles` de l'API Tako :

```
GET /api/v1/collectibles/carddass/licenses
GET /api/v1/collectibles/carddass/licenses/:idl/collections
GET /api/v1/collectibles/carddass/collections/:idc/series
GET /api/v1/collectibles/carddass/series/:ids/cards
GET /api/v1/collectibles/carddass/cards/:id
GET /api/v1/collectibles/carddass/cards/:id/images
```

Provider : `CarddassProvider` basé sur PostgreSQL (même pattern que `MegaProvider` et `KreoProvider`).
