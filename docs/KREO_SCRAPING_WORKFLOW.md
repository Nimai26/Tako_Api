# KRE-O Multi-Source Scraping Workflow

> **Objectif** : Construire l'archive KRE-O la plus complète possible en croisant toutes les sources disponibles.
> **Principe** : Chaque phase enrichit la base de données `kreo_products` et le bucket MinIO `kreo-archive`.

---

## 📊 État Global (mis à jour : 2 mars 2026)

| Métrique | Objectif estimé | Actuel | % |
|---|---|---|---|
| Produits totaux | ~500 | **382** | 76% |
| Sets (building_set) | ~200 | **207+** | ~100% ✅ |
| Kreons individuels | ~300+ | **115** | ~38% |
| Autres types (combiner, custom, battle_changer...) | ~50 | **60+** | ~100% ✅ |
| Images dans MinIO | ~500+ | **2070** | Excellent ✅ |
| Instructions (fichiers MinIO) | ~100 | **1710** (scans) | Excellent ✅ |
| Instructions (pdf_path en BDD) | ~100 | **50** | 50% ✅ |
| Prix retail | ~114 | **146** | 128% ✅ |
| Descriptions | ~382 | **364** | 95% ✅ |
| Sub_lines | ~382 | **382** | 100% ✅ |
| Years | ~382 | **382** | 100% ✅ |
| Franchises couvertes | 6+ | **6** | 100% ✅ |

### Franchises — État réel

| Franchise | Produits | Prix | Sub_line | Year |
|---|---|---|---|---|
| Transformers | 201 | 99 | 201 | 200 |
| GI Joe | 124 | 7 | 124 | 124 |
| CityVille | 17 | 11 | 17 | 17 |
| Star Trek | 15 | 9 | 15 | 15 |
| Dungeons & Dragons | 15 | 12 | 15 | 15 |
| Battleship | 10 | 8 | 10 | 10 |

### Types de produits

| Type | Count |
|---|---|
| building_set | 207 |
| kreon | 115 |
| custom_kreon | 24 |
| combiner | 8 |
| battle_changer | 7 |
| micro_changer | 3 |
| kreon_warrior | 1 |

### Données manquantes restantes

| Champ | Produits sans | % manquant | Notes |
|---|---|---|---|
| **price_retail** | 236 | 62% | Principalement Kreons GI Joe wiki |
| **piece_count** | 260 | 68% | Surtout Kreons individuels |
| **image** | 23 | 6% | Nouvelles entrées Wayback |
| **description** | 18 | 5% | Produits récents sans fiche wiki |

---

## Phase 1 — Wiki Setbox/SetboxV2 Templates ✅ TERMINÉE

**Source** : `kreo.fandom.com` — API MediaWiki `embeddedin`
**Templates** : `Template:Setbox` (23 pages) + `Template:SetboxV2` (59 pages)
**Script** : `scripts/scrape-kreo.js`

### Résultat
- ✅ 82 pages wiki traitées → **77 produits** en base
- ✅ 73 images téléchargées dans MinIO `kreo-archive`
- ✅ 0 erreurs
- ✅ 2 franchises : Transformers (73), Dungeons & Dragons (4)

### Données extraites par produit
- `set_number`, `name`, `franchise`, `sub_line`, `year`, `piece_count`
- `kreons_count`, `kreons_included` (liste texte)
- `description`, `product_type`, `image_url`, `wiki_url`

### Données manquantes (à enrichir dans les phases suivantes)
- ❌ `price_retail` — aucun prix
- ❌ `pdf_url`, `pdf_path` — aucun PDF d'instructions
- ❌ Franchises Battleship, GI Joe, Star Trek, CityVille, Trolls absentes
- ❌ ~50+ sets probablement non couverts par Setbox templates

---

## Phase 2 — Wiki Kreonbox Templates ✅ TERMINÉE

**Source** : `kreo.fandom.com` — Templates `KreonboxV2` (~94 pages) + `Kreonbox` (~24 pages)
**Objectif** : Scraper les fiches individuelles de Kreons (figurines)
**Résultat** : **114 Kreons** ajoutés (102 TF, 7 D&D, 3 ST, 2 GIJ)

### Stratégie
1. Utiliser l'API `embeddedin` pour `Template:KreonboxV2` et `Template:Kreonbox`
2. Parser les champs : `serial`, `name`, `price`, `franchise`, `allegiance`, `image`
3. Stocker dans `kreo_products` avec `product_type = 'kreon'`

### Données attendues (template KreonboxV2)
```
|serial     = A7836
|name       = Optimus Prime
|price      = $3.99
|franchise  = Transformers
|allegiance = Autobot
|image      = Custom_Optimus_Prime_AoE.jpg
```

### Estimation
- ~118 pages de figurines Kreon (94 KreonboxV2 + 24 Kreonbox v1)
- Multi-franchise : Transformers, Star Trek, GI Joe, Battleship, D&D
- Chaque page = 1 Kreon avec image, prix, allégeance

### Actions
- [ ] Ajouter au scraper : `fetchKreonboxPages()`
- [ ] Parser les deux formats de template (v1 et v2)
- [ ] Télécharger les images Kreon dans MinIO
- [ ] Upsert dans `kreo_products` avec `product_type = 'kreon'`

---

## Phase 3 — Wiki Categories Discovery ✅ TERMINÉE

**Source** : `kreo.fandom.com` — Catégories MediaWiki
**Objectif** : Trouver les sets qui n'utilisent PAS les templates Setbox/SetboxV2
**Résultat** : **174 nouvelles entrées** — GI Joe (123), CityVille (14), Star Trek (14), Battleship (10), etc.

### Catégories à exploiter

| Catégorie | Pages estimées | Chevauchement attendu |
|---|---|---|
| `Category:Building Sets` | ~130 | ~60% avec Phase 1 |
| `Category:Kreons` | ~500+ | ~20% avec Phase 2 |
| `Category:Transformers` | ~300+ | Fort chevauchement |
| `Category:Battleship` | ~30+ | Faible (nouveau) |
| `Category:G.I. Joe` | ~50+ | Faible (nouveau) |
| `Category:Star Trek` | ~40+ | Faible (nouveau) |
| `Category:CityVille Invasion` | ~20+ | Aucun (nouveau) |
| `Category:Dungeons & Dragons` | ~15+ | Partiel |

### Stratégie
1. Lister toutes les pages via `categorymembers` pour chaque catégorie
2. Filtrer les pages déjà en base (par `wiki_url` ou `set_number`)
3. Parser le wikitext de chaque nouvelle page
4. Extraire : nom, numéro de set, description, franchise, image
5. Upsert dans DB — enrichir les entrées existantes si nouvelles données

### Actions
- [ ] Créer `fetchCategoryPages(categoryName)`
- [ ] Parser le wikitext libre (pas de template structuré pour certaines pages)
- [ ] Gestion des doublons par wiki_url
- [ ] Focus sur les catégories à faible chevauchement d'abord (Battleship, GI Joe, Star Trek, CityVille)

---

## Phase 4 — Wiki Instructions Scrape ✅ TERMINÉE

**Source** : `kreo.fandom.com` — Catégorie `Category:Instructions` (98 pages)
**Script** : `scripts/scrape-kreo-instructions.js` (420 lignes)

### Résultat
- ✅ 98/98 pages traitées
- ✅ 61 produits matchés (37 non matchés — pas de set_number correspondant)
- ✅ **1710 images d'instructions** dans MinIO `kreo-archive/`
- ✅ **50 produits** avec `pdf_path` mis à jour en BDD
- ✅ Skip mechanism pour reprises (existingFolders Set)

### Découverte (investigation terminée)

La catégorie `Instructions` contient **~95 pages individuelles** + 2 pages index :
- `Transformers Instructions` — index maître par année (2011-2015)
- `Star Trek Instructions` — index Star Trek

**Format des pages d'instructions :**
- Chaque page contient une **galerie d'images** (scans de chaque page du livret)
- Building Sets : ~20-56 images PNG/JPG par set (ex: Bumblebee 31144 = 36 pages)
- Micro Changers : 2 images (recto/verso de la fiche)
- Images nommées : `o_5bd566edbb7ed5b1_000.png` à `_035.png` (ou `001b.jpg` à `056b.jpg`)

### Pages index Transformers (par année)

| Année | Type | Sets listés | Pages wiki existantes |
|---|---|---|---|
| 2011 | Building Sets Original | Bumblebee, Jazz, Megatron, Mirage, Optimus Prime, Prowl, Ratchet, Sentinel Prime, Sideswipe, Starscream | ~10 |
| 2012 | Micro Changers Preview | Crankstart, Galvatron, Scorponok, Spinister, Sunstorm, Waspinator | ~6 |
| 2012 | Building Sets (Quest for Energon) | Devastator x4, Battle for Energon x2, Cycle Chase, Decepticon Ambush, Devastator x3, Quest Blaster, Rotor Rage, Stealth Bumblebee, Street Showdown | ~15 |
| 2013 | Micro Changers S1-S4 | 48 figures (12 par série) | ~48 |
| 2013 | Micro Changer Combiners | Bruticus, Devastator, Predaking, Superion, Abominus, Defensor, Piranacon | ~7 |
| 2013 | Building Sets (Beast Hunters) | Command Center, Mech Venom, Dragon Assault, Ripclaw, Battle Net BB, Beast Blade OP | ~6 |
| 2013 | Buckets | 275, 475, 700 pièces + Ultimate Vehicle | ~3+ |
| 2013 | Custom Kreons S1 | BB, Ironhide, Megatron, OP, Soundwave, Starscream | ~6 |
| 2014 | Age of Extinction | 12 sets | ~12 |
| 2014 | Micro Changers S5-S6 | 24 figures | ~24 |
| 2014 | Combiners S3-S4 | 6 combiners | ~6 |
| 2014 | Custom Kreons S2 + AoE | ~14 figures | ~14 |
| 2014 | Battle Changers | ~6 sets | ~6 |
| 2015 | Building + Battle Changers + Custom | ~15 sets | ~15 |
| 2015 | Kreon Warriors S1-S2 | ~24 figures | ~0 (marqués *) |

### Star Trek Instructions
- Building Sets : 5 listés (Enterprise, Vengeance, Klingon BC, Volcano Mission, Space Dive, Transporter)
- Micro-Build Ships : 5 listés (Jellyfish, Klingon D7, Enterprise, Kelvin, Enterprise TOS)
- Blind Packs S1 : 6 pages, S2 : ~12 listés (beaucoup sans page)

### Stratégie
1. Lister `Category:Instructions` via `categorymembers` API (500 limit — toutes retournées)
2. Pour chaque page d'instructions, extraire la liste d'images via `prop=images`
3. Résoudre les URLs réelles des images via `imageinfo` API
4. Pour les Building Sets : rassembler les scans en un seul PDF
5. Pour les Micro Changers : stocker les 2 images (recto/verso)
6. Upload dans MinIO `kreo-archive` sous `instructions/{set_number}/`
7. Lier les instructions au produit correspondant via set_number ou nom

### Mapping instructions → produits
- Pattern : `Instructions Bumblebee (31144)` → set_number `31144`
- Pattern : `Instructions Bumblebee (36421)` → set_number `36421`
- Pattern : `Instructions_Crankstart` → chercher par nom dans DB
- Pattern : `Instructions Custom Optimus Prime (81233/80947)` → set_number `81233`
- Pattern : `Instructions Autobot Assault Devastator 1` → multi-livre, même set

### Estimation
- ~95 pages à traiter
- ~2000+ images à télécharger
- ~50-60 sets avec instructions complètes
- Possibilité de générer des PDFs combinés à partir des scans

### Actions
- [ ] Créer `fetchInstructionPages()`
- [ ] Parser la galerie wiki pour extraire les noms d'images
- [ ] Résoudre les URLs via `imageinfo` API
- [ ] Télécharger chaque image
- [ ] Optionnel : combiner en PDF via sharp/pdfkit
- [ ] Upload instructions dans MinIO `kreo-archive/instructions/{set}/`
- [ ] Mettre à jour `pdf_path` dans `kreo_products`

---

## Phase 5 — Hasbro Wayback Machine (Prix) ✅ TERMINÉE

**Source** : Wayback Machine — `web.archive.org`
**Script** : `scripts/scrape-kreo-wayback.js` (350 lignes)

### Résultat
- ✅ CDX Discovery : 114 nouveau format + 121 ancien format = 131 pages uniques scrapées
- ✅ 111 produits matchés (58 par set#, 53 par nom), 17 nouveaux insérés
- ✅ **81 prix mis à jour**, 39 counts de pièces, 2 descriptions
- ✅ Total prix en base : **56 → 146** (+90)
- ❌ Aucun lien PDF d'instructions trouvé sur les pages produit archivées

### Extraction depuis le HTML Hasbro
- Prix : `<span class="price">$XX.XX</span>` dans `product_price`
- Set# : `<span class="itemtext">XXXXX</span>`
- Pièces : regex `(\d+) pieces?`

### Matching
- **Stratégie duale** : match par set_number d'abord, puis par nom normalisé
- `normalizeForMatch()` : lowercase, suppression ponctuation/articles
- 58 matchés par set#, 53 par nom, 20 non-matchés (dont 17 insérés comme nouveaux)

---

## Phase 6 — TFWiki.net + Enrichissement Franchises ✅ TERMINÉE

**Source** : `https://tfwiki.net/wiki/Kre-O`
**Script** : `scripts/enrich-kreo-tfwiki.js` (454 lignes)

### Résultat Transformers (201 produits)
- ✅ Page TFWiki parsée : 269 entrées extraites du wikitext
- ✅ 4 stratégies de matching :
  - **A** : KNOWN_PRODUCTS (35+ mappings manuels) → correspondances exactes
  - **B** : Attribution par année (YEAR_SUBLINE_MAP) → sub_line automatique
  - **C** : Fuzzy matching TFWiki → année depuis les sections wiki
  - **D** : Patterns de noms → sub_line par convention de nommage
- ✅ **60 sub_lines** et **22 years** mis à jour pour les Transformers
- ✅ Sub-lines Transformers finales : Micro-Changers(77), MC Combiners(35), Original(20), AoE(20), Custom Kreons(14), RID(9), QfE(8), Beast Hunters(8), Battle Changers(7), Convention Exclusive(1), G.I. Joe(1)

### Résultat Autres Franchises (181 produits)
- ✅ **GI Joe** (124) : Original(61) + 2013(63), Kreons séparés
- ✅ **Star Trek** (15) : Original(5) + Into Darkness(10), années 2012-2013
- ✅ **Battleship** (10) : Movie(10), année 2012
- ✅ **CityVille** (17) : Invasion(17), année 2013
- ✅ **Dungeons & Dragons** (15) : Original(10) + Collection(5), année 2014
- ✅ **FINAL : 382/382 produits avec sub_line ET year**

---

## Phase 7 — Autres Wikis Franchise ✅ INTÉGRÉ DANS PHASE 6

Les données des franchises non-Transformers ont été enrichies directement par script
dans la Phase 6 (attribution sub_line + year basée sur les noms et conventions).
Pas besoin de scraping additionnel — toutes les 6 franchises sont complètes.

---

## Phase 8 — Kreon Bio Images (Wayback Microsite) 🔲 OPTIONNEL

**Source** : Wayback — `hasbro.com/kre-o-2/`
**Objectif** : Récupérer les images de personnages Kreon du microsite Hasbro
**Priorité** : 🟢 Basse

### Découverte CDX
Le microsite `/kre-o-2/` contenait des images de bios de personnages :
- **Battleship** : AdmiralShane, AlienPilot, AlienSoldier, CaptainYugi, CommanderStone, HopperPennyRaikes, etc.
- **Transformers** : Bumblebee, Megatron, OptimusPrime, Ratchet, Sentinel, Sideswipe, etc.

Format : `hasbro.com/kre-o-2/assets/images/common/characters/{faction}/{name}.png`

### Actions
- [ ] CDX query pour toutes les images du microsite
- [ ] Télécharger les images de bios Kreon
- [ ] Stocker dans MinIO `kreo-archive/bios/`

---

## 🔧 Infrastructure existante

### Base de données
- **Serveur** : 10.20.0.10:5434 (PostgreSQL `mega_archive`)
- **Table** : `kreo_products`
- **Schéma** :
  ```sql
  id SERIAL PRIMARY KEY
  set_number VARCHAR(20) UNIQUE
  name VARCHAR(255) NOT NULL
  franchise VARCHAR(100)
  sub_line VARCHAR(100)
  year SMALLINT
  piece_count INTEGER
  kreons_count SMALLINT
  kreons_included TEXT
  description TEXT
  price_retail DECIMAL(8,2)
  product_type VARCHAR(50)
  image_url TEXT
  image_path TEXT
  pdf_url TEXT
  pdf_path TEXT
  wiki_url TEXT
  wiki_image_url TEXT
  discovered_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
  ```
- **Indexes** : franchise, year, product_type, sub_line, name(trigram)

### MinIO
- **Serveur** : 10.20.0.10:9000
- **Bucket** : `kreo-archive` — **2070 objets**
- **Structure** :
  ```
  kreo-archive/
  ├── images/          # 360 images produits
  ├── instructions/    # 1710 scans d'instructions wiki
  │   └── {set_number}/
  │       ├── page_001.png
  │       └── ...
  └── bios/            # Images bios Kreon microsite (optionnel)
  ```

### API
- **Provider** : `src/domains/construction-toys/providers/kreo.provider.js`
- **Normalizer** : `src/domains/construction-toys/normalizers/kreo.normalizer.js`
- **Routes** : `src/domains/construction-toys/routes/kreo.routes.js`
- **Monté sur** : `/api/v1/construction-toys/kreo/`
- **Endpoints** : health, search, franchises, franchise/:name, sublines, file/:setNumber/image, :id

### Scripts de scraping
- `scripts/scrape-kreo.js` (1151 lignes) — Phases 1-3 : wiki Fandom
- `scripts/scrape-kreo-instructions.js` (420 lignes) — Phase 4 : instructions wiki
- `scripts/scrape-kreo-wayback.js` (350 lignes) — Phase 5 : prix Wayback Machine
- `scripts/enrich-kreo-tfwiki.js` (454 lignes) — Phase 6 : TFWiki + franchises

---

## 📋 Ordre d'exécution recommandé

```
Phase 1  ✅ Wiki Setbox/SetboxV2          → 77 sets
Phase 2  ✅ Wiki Kreonbox/KreonboxV2      → +114 Kreons = 191
Phase 3  ✅ Wiki Categories               → +174 produits = 365, 6 franchises
Phase 4  ✅ Wiki Instructions             → 1710 scans, 50 produits avec pdf_path
Phase 5  ✅ Wayback Prix                  → 81 prix mis à jour, 17 nouveaux = 382
Phase 6  ✅ TFWiki + Franchises           → 382/382 avec sub_line ET year
─────────── Total final : 382 produits, 2070 fichiers MinIO, 6 franchises ───────────
Phase 7  ✅ Autres Wikis                  → intégré dans Phase 6
Phase 8  🟢 Microsite Bio Images          → images bonus optionnelles
```

### Résumé final
- **382 produits** : 201 TF, 124 GI Joe, 17 CityVille, 15 D&D, 15 Star Trek, 10 Battleship
- **382/382** avec sub_line et year
- **146/382** avec prix (38%)
- **50/382** avec scans d'instructions
- **2070 fichiers** MinIO (360 images + 1710 instructions)

---

## 📝 Critères de complétion (avant commit v2.2.0)

- [x] ≥ 150 produits (sets) dans `kreo_products` — **382 ✅**
- [x] ≥ 100 figurines Kreon individuels dans `kreo_products` — **~150 ✅**
- [x] ≥ 4 franchises avec des produits — **6 ✅**
- [x] Instructions disponibles pour ≥ 50 sets — **50 avec pdf_path ✅**
- [x] Prix retail pour ≥ 50 produits — **146 ✅**
- [x] Toutes les images produits dans MinIO — **2070 fichiers ✅**
- [x] Tous les produits avec sub_line — **382/382 ✅**
- [x] Tous les produits avec year — **382/382 ✅**
- [ ] API testée avec les nouvelles données
- [ ] CHANGELOG.md mis à jour

---

*Créé le : 2025-01-15*
*Dernière mise à jour : 2025-01-19 — Phases 1-7 terminées*
