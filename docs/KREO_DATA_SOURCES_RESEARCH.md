# Rapport de Recherche : Sources de Données KRE-O (Hasbro, 2011-2017)

> **Date** : Juillet 2025  
> **Objectif** : Identifier toutes les bases de données et sources de données KRE-O disponibles sur Internet pour construire une archive similaire à MEGA Construx (PostgreSQL + MinIO)

---

## Résumé Exécutif

KRE-O est une ligne de jouets de construction Hasbro (2011-2017) couvrant **7 franchises** : Transformers, Battleship, G.I. Joe, Star Trek, Dungeons & Dragons, CityVille Invasion, et Trolls (+ lignes régionales : Armor Hero, Doraemon au Japon).

**Découverte majeure** : Le **Kre-O Wiki** (kreo.fandom.com) est une base de données vivante de **1 021 pages** couvrant TOUTES les franchises avec numéros de set, images, instructions et checklists. C'est la source principale recommandée.

Estimation totale : **~150-200 building sets** + **~300+ Kreons individuels** (minifigurines) + **~50+ packs blind bag** = **~500+ produits uniques** à archiver.

---

## Sources Tier 1 — Bases de Données Principales

### 1. Kre-O Wiki (kreo.fandom.com) ⭐⭐⭐⭐⭐

| Critère | Détail |
|---------|--------|
| **URL** | https://kreo.fandom.com |
| **Pages** | **1 021 pages** |
| **Franchises** | TOUTES (TF, Battleship, GI Joe, Star Trek, D&D, CityVille, Trolls, Armor Hero, Doraemon) |
| **Données disponibles** | Numéros de set Hasbro (ex: A2224, B5152, 31144), noms, descriptions, images produit, instructions (scans/liens), checklists Kreons, années de sortie |
| **Images** | Oui — hébergées sur `static.wikia.nocookie.net/kreo/` |
| **Instructions** | Oui — pages dédiées par franchise + pages individuelles (ex: "Instructions Bumblebee (31144)") |
| **API** | MediaWiki API : `https://kreo.fandom.com/api.php` |
| **Licence** | CC-BY-SA |
| **Scrapabilité** | ⭐⭐⭐⭐⭐ Excellente — API MediaWiki standard |
| **Statut** | VIVANT et accessible |

**Structure du wiki** :
- Pages index par franchise : `Transformers_Sets`, `Battleship_Sets`, `G.I._Joe_Sets`, `D&D_Building_Sets`, `Star_Trek_Sets`, `Cityville_Invasion_Building_Sets`
- Pages d'instructions par franchise : `Transformers_Instructions`, `Battleship_Instructions`, `G.I._Joe_Instructions`, `Star_Trek_Instructions`, `Dungeons_&_Dragons_Instructions`, `CityVille_Invasion_Instructions`
- Pages individuelles de produits avec set numbers (ex: `Bumblebee_(31144)`, `Devastator_(A2224)`)
- Pages individuelles d'instructions (ex: `Instructions_Bumblebee_(31144)`)
- Checklists Kreons : `Kreon_Checklists`, `Battleship_Kreon_Checklist`, `G.I._Joe_Kreon_Checklist`
- Pages par année : `2011`, `2012`, `2013`, `2014`, `2015`

**Méthode de scraping recommandée** :
```
GET https://kreo.fandom.com/api.php?action=query&list=allpages&aplimit=500&format=json
GET https://kreo.fandom.com/api.php?action=parse&page=PAGE_NAME&format=json
```

---

### 2. TFWiki.net ⭐⭐⭐⭐⭐ (Transformers uniquement)

| Critère | Détail |
|---------|--------|
| **URL** | https://tfwiki.net/wiki/Kre-O |
| **Couverture** | Transformers KRE-O UNIQUEMENT, mais la PLUS détaillée |
| **Données** | Toutes les sous-lignes 2011-2017 : Building Sets, Micro-Changers (Séries 1-4), Micro-Changer Combiners, Custom Kreons, Kreon Warriors, Battle Changers, Robots in Disguise |
| **Détails par produit** | Noms, numéros Hasbro, Kreons inclus, année, sous-ligne |
| **API** | MediaWiki API standard |
| **Licence** | CC-BY-SA-NC 3.0 |
| **Scrapabilité** | ⭐⭐⭐⭐⭐ |

**Avantage** : Plus détaillé que le Kre-O Wiki pour les Transformers (inclut les noms de tous les Kreons dans chaque set, les sous-lignes Beast Hunters, Age of Extinction, etc.)

---

### 3. Hasbro.com via Wayback Machine ⭐⭐⭐⭐

| Critère | Détail |
|---------|--------|
| **URL** | `https://web.archive.org/web/20160101/http://www.hasbro.com/en-us/brands/kreo/toys-games` |
| **Produits** | **114 items** au total (répartis sur 3 pages) |
| **Données** | Noms officiels, **prix retail** ($2.49-$59.99), UUID produit Hasbro, images officielles |
| **Franchises** | TOUTES dans un seul catalogue |
| **Scrapabilité** | ⭐⭐⭐ Moyenne (HTML statique via Wayback, certaines pages 404) |

**Produits confirmés avec prix** (échantillon de la première page de 48) :

| Produit | Prix |
|---------|------|
| Transformers sets (Beast Hunters, AoE, RID) | $7.99 - $59.99 |
| D&D Fortress Defense | $24.99 |
| D&D Fortress Tower | $19.99 |
| D&D Battle Outpost | $16.99 |
| D&D Wallbreaker Javelin | $11.99 |
| D&D Knight's Catapult / Orc's Crossbow | $9.99 |
| D&D Kreon Warriors | $3.99 |
| Star Trek USS Enterprise | $49.99 |
| Star Trek Klingon Bird-of-Prey | $24.99 |
| Star Trek Spock's Volcano Mission | $14.99 |
| Star Trek Transporter Trouble | $9.99 |
| CityVille City Street Chase | $7.99 |
| CityVille Construction Site Smash | $7.99 |
| CityVille small sets | $3.99 |
| GI Joe Construction Commandos Pack | $49.99 |
| Brick Buckets (275/475/700 pcs) | $9.99 - $14.99 |

---

## Sources Tier 2 — Complémentaires par Franchise

### 4. GI Joe Fandom Wiki ⭐⭐⭐⭐

| Critère | Détail |
|---------|--------|
| **URL** | https://gijoe.fandom.com/wiki/Kre-O |
| **Couverture** | G.I. Joe KRE-O complète |
| **Données** | 10 building sets (2013-2014), 5 waves × 12 blind-bag Kreons = 60+ figurines, exclusives conventions |
| **Scrapabilité** | ⭐⭐⭐⭐⭐ Fandom MediaWiki API |

**Sets G.I. Joe (2013)** : Checkpoint Alpha, Ninja Temple Battle, Dragonfly XH-1, Serpent Armor Strike, Ghoststriker X-16, Cobra Armored Assault, Thunderwave Jet Boat, Battle Platform Attack, Arashikage Dojo

**Sets G.I. Joe (2014)** : Outpost Defense, Firebat Attack, Terrordrome

---

### 5. Memory Alpha (Star Trek) ⭐⭐⭐

| Critère | Détail |
|---------|--------|
| **URL** | https://memory-alpha.fandom.com/wiki/Kre-O |
| **Couverture** | Star Trek KRE-O (sets + Kreons) |
| **Données** | Images officielles des boîtes, descriptions, liste des sets Star Trek |
| **Sets listés** | USS Enterprise, Klingon Bird-of-Prey (D4), USS Vengeance, Jellyfish, USS Kelvin, Space Dive, Spock's Volcano Mission, Transporter Trouble, Klingon Starfleet Attack |

---

### 6. kre-o-nation.com via Wayback Machine ⭐⭐⭐

| Critère | Détail |
|---------|--------|
| **URL** | `https://web.archive.org/web/20140910132440/http://kre-o-nation.com/instructions/` |
| **Données** | **10 fichiers PDF d'instructions** téléchargeables |
| **Scrapabilité** | ⭐⭐⭐⭐ Liens directs vers PDFs |

**PDFs disponibles** :

| Catégorie | Set | Fichier PDF |
|-----------|-----|-------------|
| Micro-Changers Combiners | Superion | `superion_combiners.pdf` |
| Micro-Changers Combiners | Bruticus | `bruticus_combiners.pdf` |
| Micro-Changers Combiners | Devastator | `devastator_combiners.pdf` |
| Micro-Changers Combiners | Predaking | `predaking_combiners.pdf` |
| Star Trek | USS Enterprise (A3137) | `uss-enterprise-a3137.pdf` |
| Star Trek | USS Enterprise (A4879) | `uss-enterprise-a4879.pdf` |
| Star Trek | Space Dive | `space-dive.pdf` |
| Star Trek | Jellyfish | `jellyfish.pdf` |
| Star Trek | Klingon D7 Battle Cruiser | `klingon-d7-battle-cruiser.pdf` |
| Star Trek | USS Kelvin | `uss-kelvin.pdf` |

---

### 7. Wikipedia ⭐⭐

| Critère | Détail |
|---------|--------|
| **URL** | https://en.wikipedia.org/wiki/Kre-O |
| **Données** | Vue d'ensemble des 7 franchises, historique de la marque, dates clés |
| **Utilité** | Contexte et validation uniquement |

---

## Sources Tier 3 — Sites Régionaux / Spécifiques

### 8. Kre-O Japan (via Kre-O Wiki)
- Le wiki mentionne `Kre-O_Japan` comme page dédiée
- Lignes exclusives japonaises : **Armor Hero** (sets de combat), **Doraemon**
- Oxford comme fabricant partenaire au Japon

### 9. kre-o.com via Wayback Machine
- **101 captures** entre juin 2011 et août 2025
- Site officiel Hasbro pour la marque
- Contenait : vidéos promotionnelles, jeux, téléchargements, checklists
- Structure : pages produit par franchise, bouton "Downloads" pour instructions

---

## Sources MORTES / INUTILES (Confirmées)

| Source | Statut | Détail |
|--------|--------|--------|
| kre-o.fandom.com (avec tiret) | ❌ 404 | Wiki mort, ne pas confondre avec kreo.fandom.com |
| Reddit r/kreo | ❌ BANNI | Communauté supprimée |
| BrickLink | ❌ 0 résultats | LEGO uniquement |
| Brickset | ❌ 0 résultats | LEGO uniquement |
| BrickEconomy | ❌ 0 résultats | LEGO uniquement |
| instructions.hasbro.com | ❌ 404 pour KRE-O | Pas de résultats KRE-O |
| blokcity.com/kreosite | ❌ 404 | Ancien wiki indépendant, 45 captures Wayback mais contenu mort |
| brickinstructions.com | ❌ 404 | Pas de KRE-O |
| letsbuild.com | ❌ Échec | Pas de KRE-O |
| PriceCharting | ❌ 0 résultats | Pas de catégorie jouets KRE-O |
| ToyWiz | ⚠️ 2 items | Quasi vide |
| eBay / Amazon | ⚠️ Anti-bot | Pas accessible programmatiquement |
| ManualsLib | ⚠️ Limité | Hasbro manuals mais pas spécifiquement KRE-O |

---

## Inventaire par Franchise

### Transformers (2011-2017) — La plus grande ligne
| Sous-ligne | Année | Type |
|-----------|-------|------|
| Battle For Earth | 2011 | 11 building sets |
| Quest for Energon | 2012 | 8 building sets + Dark Energon Weapon |
| Micro-Changers Series 1-4 | 2012-2014 | ~48 blind bags (12 per series) |
| Micro-Changer Combiners | 2013-2014 | Superion, Bruticus, Devastator, Predaking, Defensor, Piranacon, Abominus, Computron, Menasor |
| Beast Hunters | 2013 | 6 building sets |
| Custom Kreons | 2013-2015 | Packs à customiser |
| Age of Extinction | 2014 | 11 building sets |
| Kreon Warriors | 2014 | Figurines individuelles |
| Battle Changers | 2015 | Transformables |
| Robots in Disguise | 2015 | 5 building sets |
| **Estimé** | | **~100+ sets + ~200+ Kreons** |

### Battleship (2012)
| Set | Numéro |
|-----|--------|
| Air Assault | 38975 |
| Alien Strike | 38955 |
| Battle Base | 38974 |
| Battle Boat | A0794 |
| Combat Chopper | 38954 |
| Land Defense Battle Pack | 38953 |
| Mine Stryker | 38976 |
| Ocean Attack | 38952 |
| U.S.S. Missouri | 38977 |
| U.S.S. Missouri Alien Showdown | A0989 |
| Shoreline Strike | 38953/38952 |
| **Total** | **11 sets** |

### G.I. Joe (2013-2014)
- **2013** : Checkpoint Alpha, Ninja Temple Battle, Dragonfly XH-1, Serpent Armor Strike, Ghoststriker X-16, Cobra Armored Assault, Thunderwave Jet Boat, Battle Platform Attack, Arashikage Dojo (9 sets)
- **2014** : Outpost Defense, Firebat Attack, Terrordrome (3 sets)
- **Blind bags** : 5 waves × 12 = 60 Kreons
- **Total** : **12 sets + 60+ Kreons**

### Star Trek (2013)
- USS Enterprise (A3137), Klingon Bird-of-Prey D4, USS Vengeance, Jellyfish (A3371), USS Kelvin, Space Dive, Spock's Volcano Mission, Transporter Trouble, Klingon D7 Battle Cruiser (A3369), Klingon Starfleet Attack (A4879), Micro Build Ships
- Micro Build: USS Enterprise TOS (SDCC exclusive)
- **Blind bags** : 1 collection de Kreons
- **Total** : **~12 sets + Kreons**

### Dungeons & Dragons (2014)
- Battle Starter Packs : Wallbreaker Javelin, Knight's Catapult, Orc's Crossbow ($8.99, 60-75 pcs)
- Building Sets : Battle Outpost, Battle Fortress, Fortress Tower, Fortress Defense
- Army Builder blind bags
- Kreon Warriors individuels ($3.99)
- **Total** : **~10 sets + Kreons**

### CityVille Invasion (2013-2014)
- Building Sets : City Street Chase, Construction Site Smash, Air Assault, Offroad Runner, Capture Cruiser, + grands sets (Haunted Hideaway, Service Station Scare, etc.)
- Booster Packs
- Kreon Packs + online game
- **Total** : **~15 sets + Kreons**

### Trolls (2016-2017)
- DJ Suki's Wooferbug (B9528)
- Poppy's Bug Adventure (B9989)
- Poppy's Coronation Party (B9527)
- Guy Diamond's Glitterific Grooves (B9987)
- Bridget's Makeover Mania (B9984)
- **Total** : **~5 sets**

### Divers
- Boxes and Buckets : 275 pcs ($9.99), 475 pcs ($14.99), 700 pcs
- Convention Exclusives (BotCon 2013, 2014)
- Construction Commandos Pack ($49.99)

---

## Stratégie de Scraping Recommandée

### Phase 1 : Scraping du Kre-O Wiki (Source principale)

```javascript
// Utiliser l'API MediaWiki de Fandom
const WIKI_API = 'https://kreo.fandom.com/api.php';

// 1. Récupérer toutes les pages
const allPages = await fetch(`${WIKI_API}?action=query&list=allpages&aplimit=500&format=json`);

// 2. Pour chaque page produit, parser le contenu
const pageContent = await fetch(`${WIKI_API}?action=parse&page=${pageName}&format=json`);

// 3. Extraire : nom, set_number, franchise, piece_count, year, description, image_urls
// 4. Télécharger les images depuis static.wikia.nocookie.net
```

### Phase 2 : Enrichissement avec Hasbro Wayback
- Scraper les prix retail depuis les pages archivées
- Récupérer les descriptions officielles Hasbro
- Télécharger les images produit officielles via Wayback CDN

### Phase 3 : Instructions PDF
- Télécharger les 10 PDFs de kre-o-nation.com (Wayback)
- Scraper les pages "Instructions_*" du Kre-O Wiki pour plus de PDFs/scans
- Vérifier kre-o.com (Wayback) pour la section "Downloads"

### Phase 4 : Compléments
- TFWiki pour les détails Transformers manquants
- GI Joe Fandom pour les détails GI Joe
- Memory Alpha pour les images Star Trek haute qualité

---

## Estimation pour l'Archive

| Métrique | Estimation |
|----------|-----------|
| Produits uniques (sets) | ~150-200 |
| Kreons/figurines individuels | ~300+ |
| Images à télécharger | ~1 000-2 000 |
| Instructions PDF | ~50-100 (via wiki + kre-o-nation + Wayback) |
| Taille estimée base de données | ~50-100 Mo (sans images/PDFs) |
| Taille estimée stockage MinIO | ~2-5 Go (images + PDFs) |

---

## Comparaison avec MEGA Construx

| Critère | MEGA Construx (actuel) | KRE-O (estimé) |
|---------|----------------------|----------------|
| Produits | 199 | ~150-200 sets + ~300 Kreons |
| Source principale | SearchSpring API / megaconstrux.com | Kre-O Wiki API (MediaWiki) |
| Images | Site officiel actif | Wiki + Wayback Machine |
| Instructions PDF | Site officiel actif | Wiki + kre-o-nation (Wayback) + kre-o.com (Wayback) |
| Prix | API temps réel | Archives Wayback (prix historiques 2012-2016) |
| Difficulté | Moyenne (API active) | Moyenne-haute (multiple sources, certaines archivées) |
| Marque active | Oui | Non (arrêtée 2017) |

---

## Prochaines Étapes

1. **Créer `kreo.provider.js`** dans `src/domains/construction-toys/providers/`
2. **Écrire un scraper** pour kreo.fandom.com utilisant l'API MediaWiki
3. **Peupler PostgreSQL** avec les produits, sets, Kreons
4. **Télécharger images et PDFs** vers MinIO
5. **Exposer les endpoints API** : `/kreo/:id`, `/kreo/:id/instructions`, `/kreo/category/:franchise`
6. **Explorer kre-o.com via Wayback** pour contenu additionnel (vidéos, checklists officiels)
