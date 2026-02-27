#!/bin/bash

API_URL="http://localhost:3000"

echo "=== TEST OPENLIBRARY PROVIDER ==="
echo ""

echo "1. Health check..."
curl -s "${API_URL}/api/books/openlibrary/health" | jq -r '.healthy'
echo ""

echo "2. Recherche 'Harry Potter' (sans traduction)..."
curl -s "${API_URL}/api/books/openlibrary/search?q=Harry%20Potter&limit=2" | jq -r '.data[0] | "Titre: \(.title)\nCover Large: \(.covers.large)\nCover Medium: \(.covers.medium)\nCover Small: \(.covers.small)"'
echo ""

echo "3. Recherche 'Harry Potter' (avec traduction FR)..."
curl -s "${API_URL}/api/books/openlibrary/search?q=Harry%20Potter&limit=2&lang=fr&autoTrad=1" | jq -r '.data[0] | "Titre: \(.title)\nTitre original: \(.titleOriginal // "N/A")\nCover Large: \(.covers.large)\nCover Medium: \(.covers.medium)\nCover Small: \(.covers.small)"'
echo ""

echo "4. Détails d'un livre (OL82563W - Harry Potter) sans traduction..."
curl -s "${API_URL}/api/books/openlibrary/OL82563W" | jq -r '.data | "Titre: \(.title)\nCover Large: \(.covers.large)\nCover Medium: \(.covers.medium)\nCover Small: \(.covers.small)"'
echo ""

echo "5. Détails d'un livre (OL82563W) avec traduction FR..."
curl -s "${API_URL}/api/books/openlibrary/OL82563W?lang=fr&autoTrad=1" | jq -r '.data | "Titre: \(.title)\nTitre original: \(.titleOriginal // "N/A")\nCover Large: \(.covers.large)\nCover Medium: \(.covers.medium)\nCover Small: \(.covers.small)"'
echo ""

echo "=== FIN DES TESTS ==="
