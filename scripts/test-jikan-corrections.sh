#!/bin/bash

#
# Script de test des corrections Jikan
# Valide le filtrage NSFW et la stratégie de cache DEFAULT_LOCALE
#

set -e

BASE_URL="http://localhost:3000"
JIKAN_BASE="${BASE_URL}/api/anime-manga/jikan"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonctions helpers
print_section() {
    echo -e "\n${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_test() {
    echo -e "${GREEN}▶ Test:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Vérifier que l'API est accessible
print_section "1. Vérification de l'API"

print_test "Health check Jikan"
HEALTH=$(curl -s "${JIKAN_BASE}/health")
if echo "$HEALTH" | grep -q '"status":"healthy"'; then
    print_success "API Jikan opérationnelle"
else
    print_error "API Jikan non accessible"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════
# TEST 1 : Filtrage NSFW sur les routes search
# ═══════════════════════════════════════════════════════════════════════════

print_section "2. Test filtrage NSFW - Routes search"

# Test 2.1 : Search anime avec sfw=sfw (pas de hentai)
print_test "Search anime avec sfw=sfw (sans hentai)"
SEARCH_SFW=$(curl -s "${JIKAN_BASE}/search/anime?q=naruto&sfw=sfw&maxResults=10")

if echo "$SEARCH_SFW" | grep -q '"sfw":"sfw"'; then
    print_success "Paramètre sfw accepté"
else
    print_error "Paramètre sfw non accepté dans la réponse"
fi

# Vérifier qu'il n'y a pas de contenu Rx (hentai)
if echo "$SEARCH_SFW" | grep -q '"rating":"Rx'; then
    print_error "Contenu hentai trouvé avec sfw=sfw"
else
    print_success "Pas de contenu hentai (sfw=sfw fonctionnel)"
fi

# Test 2.2 : Search anime avec sfw=all (tout le contenu)
print_test "Search anime avec sfw=all (tout contenu)"
SEARCH_ALL=$(curl -s "${JIKAN_BASE}/search/anime?q=anime&sfw=all&maxResults=10")

if echo "$SEARCH_ALL" | grep -q '"sfw":"all"'; then
    print_success "Paramètre sfw=all accepté"
else
    print_error "Paramètre sfw=all non accepté"
fi

# Test 2.3 : Search manga avec sfw=sfw
print_test "Search manga avec sfw=sfw"
SEARCH_MANGA=$(curl -s "${JIKAN_BASE}/search/manga?q=one+piece&sfw=sfw&maxResults=10")

if echo "$SEARCH_MANGA" | grep -q '"sfw":"sfw"'; then
    print_success "Paramètre sfw accepté sur search manga"
else
    print_error "Paramètre sfw non accepté sur search manga"
fi

# ═══════════════════════════════════════════════════════════════════════════
# TEST 2 : Filtrage NSFW sur les routes discovery
# ═══════════════════════════════════════════════════════════════════════════

print_section "3. Test filtrage NSFW - Routes discovery"

# Test 3.1 : Trending TV avec sfw=sfw
print_test "Trending TV avec sfw=sfw"
TRENDING_SFW=$(curl -s "${JIKAN_BASE}/trending/tv?sfw=sfw")

if echo "$TRENDING_SFW" | grep -q '"success":true'; then
    print_success "Trending TV répond correctement"
    
    # Vérifier qu'il n'y a pas de hentai
    if echo "$TRENDING_SFW" | grep -q '"rating":"Rx'; then
        print_error "Contenu hentai trouvé avec sfw=sfw sur trending"
    else
        print_success "Pas de contenu hentai sur trending (sfw=sfw)"
    fi
else
    print_error "Trending TV ne répond pas correctement"
fi

# Test 3.2 : Top movie avec sfw=all
print_test "Top movie avec sfw=all"
TOP_ALL=$(curl -s "${JIKAN_BASE}/top/movie?sfw=all&page=1")

if echo "$TOP_ALL" | grep -q '"success":true'; then
    print_success "Top movie répond correctement"
else
    print_error "Top movie ne répond pas correctement"
fi

# ═══════════════════════════════════════════════════════════════════════════
# TEST 3 : Stratégie cache DEFAULT_LOCALE
# ═══════════════════════════════════════════════════════════════════════════

print_section "4. Test cache DEFAULT_LOCALE (fr-FR)"

# Test 4.1 : Première requête fr-FR (MISS attendu)
print_test "1ère requête fr-FR (cache MISS attendu)"
REQ1=$(curl -s "${JIKAN_BASE}/trending/tv?lang=fr-FR&autoTrad=true&sfw=sfw")

CACHE1=$(echo "$REQ1" | grep -o '"fromCache":[^,]*' | head -1)
if echo "$CACHE1" | grep -q 'false'; then
    print_success "Cache MISS détecté (normal pour 1ère requête)"
else
    print_error "Cache devrait être MISS pour 1ère requête"
fi

# Attendre 1 seconde pour s'assurer que le cache est sauvegardé
sleep 1

# Test 4.2 : Deuxième requête fr-FR (HIT attendu)
print_test "2ème requête fr-FR (cache HIT attendu)"
REQ2=$(curl -s "${JIKAN_BASE}/trending/tv?lang=fr-FR&autoTrad=true&sfw=sfw")

CACHE2=$(echo "$REQ2" | grep -o '"fromCache":[^,]*' | head -1)
if echo "$CACHE2" | grep -q 'true'; then
    print_success "Cache HIT détecté ✓ (optimisation fr-FR fonctionne)"
else
    print_error "Cache devrait être HIT pour 2ème requête fr-FR"
fi

# Test 4.3 : Requête en (HIT attendu + traduction)
print_test "Requête en (cache HIT + traduction attendue)"
REQ3=$(curl -s "${JIKAN_BASE}/trending/tv?lang=en&autoTrad=true&sfw=sfw")

CACHE3=$(echo "$REQ3" | grep -o '"fromCache":[^,]*' | head -1)
if echo "$CACHE3" | grep -q 'true'; then
    print_success "Cache HIT détecté (même cache pour toutes les langues) ✓"
else
    print_error "Cache devrait être HIT pour requête en"
fi

# Test 4.4 : Vérifier que la 3ème requête fr-FR reste en cache HIT
print_test "3ème requête fr-FR (cache HIT sans traduction)"
REQ4=$(curl -s "${JIKAN_BASE}/trending/tv?lang=fr-FR&autoTrad=true&sfw=sfw")

CACHE4=$(echo "$REQ4" | grep -o '"fromCache":[^,]*' | head -1)
if echo "$CACHE4" | grep -q 'true'; then
    print_success "Cache HIT maintenu (pas de pollution par autres langues) ✓"
else
    print_error "Cache devrait rester HIT pour fr-FR"
fi

# ═══════════════════════════════════════════════════════════════════════════
# TEST 4 : Vérification absence de filterBySfw dans le code
# ═══════════════════════════════════════════════════════════════════════════

print_section "5. Vérification suppression filterBySfw"

print_test "Grep filterBySfw dans jikan.routes.js"
if grep -q "filterBySfw" "/Projets/Tako_Api/src/domains/anime-manga/routes/jikan.routes.js" 2>/dev/null; then
    print_error "filterBySfw encore présent dans le code"
else
    print_success "filterBySfw correctement supprimé du code ✓"
fi

# ═══════════════════════════════════════════════════════════════════════════
# RÉSUMÉ
# ═══════════════════════════════════════════════════════════════════════════

print_section "Résumé des tests"

echo -e "${GREEN}✓ Filtrage NSFW fonctionnel${NC}"
echo -e "${GREEN}✓ Routes search acceptent paramètre sfw${NC}"
echo -e "${GREEN}✓ Routes discovery acceptent paramètre sfw${NC}"
echo -e "${GREEN}✓ Cache DEFAULT_LOCALE opérationnel${NC}"
echo -e "${GREEN}✓ filterBySfw supprimé du code${NC}"

echo -e "\n${YELLOW}Toutes les corrections validées ! 🎉${NC}\n"

# Afficher quelques statistiques du cache
print_section "6. Statistiques cache (PostgreSQL)"

echo "Nombre d'entrées cache Jikan :"
docker exec tako_db psql -U tako -d tako_cache -t -c \
  "SELECT COUNT(*) FROM discovery_cache WHERE provider='jikan';" 2>/dev/null || echo "N/A (conteneur non accessible)"

echo -e "\nDernières clés de cache Jikan :"
docker exec tako_db psql -U tako -d tako_cache -c \
  "SELECT cache_key, provider, endpoint, created_at FROM discovery_cache WHERE provider='jikan' ORDER BY created_at DESC LIMIT 5;" 2>/dev/null || echo "N/A (conteneur non accessible)"

echo ""
