Nous sommes dans un container docker donc les modifications nécéssite un rebliud et
redeploiement pour tester. Port 3000

L'import de chaque domaine doit permettre d'importer ses fonctions d'origines mais si possible en améliorant le code et les retours avec plus de routes de rechechers qui sont possibles.

La traduction auto qui doit être dans tous les providers est gérée ici :
/mnt/egon/Programmation/Images docker/Tako_Api/src/shared/utils/translator.js

Si flaresolver est nécéssaire il est disponible ici :
/mnt/egon/Programmation/Images docker/Tako_Api/src/infrastructure/scraping/FlareSolverrClient.js

Pour le sarpping :
une variable fsrClient et une fonction getFsrClient
S'inspiré du domaine Coleka

Il est important que les réponses json soient normalisée.
Voir /mnt/egon/Programmation/Images docker/Tako_Api/docs/RESPONSE-FORMAT.md

La structure est ainsi :
src/domains/{domain}/
├── index.js           # Export principal
├── routes.js          # Router Express
├── providers/
│   └── {provider}.js  # Un fichier par provider
└── normalizers/
    └── {provider}.js  # Un fichier par normalizer

Le dossier du projet d'orignie dont nous faisons la migration est ici :
/mnt/egon/Programmation/Images docker/toys_api

Une fois toutes les fonctionnalités testées et validée de l'ajout d'un domaine, toujours mettre à jour le fichier /mnt/egon/Programmation/Images docker/Tako_Api/docs/API_ROUTES.md

Le logger est exporté en named export
le healthCheck retourne healthy