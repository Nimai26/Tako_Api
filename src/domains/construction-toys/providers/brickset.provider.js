/**
 * Brickset Provider
 * 
 * Provider pour l'API Brickset (données LEGO officielles).
 * 
 * @see https://brickset.com/api/v3.asmx
 * 
 * ENDPOINTS DISPONIBLES :
 * - getSets: Recherche de sets
 * - getSet: Détails d'un set
 * - getThemes: Liste des thèmes
 * - getSubthemes: Sous-thèmes
 * - getYears: Années disponibles
 */

import { BaseProvider } from '../../../core/providers/index.js';
import { BricksetNormalizer } from '../normalizers/brickset.normalizer.js';
import { env } from '../../../config/env.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';

export class BricksetProvider extends BaseProvider {
  constructor() {
    super({
      name: 'brickset',
      domain: 'construction-toys',
      baseUrl: 'https://brickset.com/api/v3.asmx',
      timeout: 15000,
      retries: 2
    });

    this.normalizer = new BricksetNormalizer();
    this.apiKey = env.BRICKSET_API_KEY;
    
    // Hash utilisateur pour certains endpoints
    this.userHash = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPLÉMENTATION DES MÉTHODES ABSTRAITES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Rechercher des sets LEGO
   * @param {string} query - Terme de recherche (nom ou numéro de set)
   * @param {Object} options
   * @param {number} [options.page=1] - Page
   * @param {number} [options.pageSize=20] - Résultats par page (max 500)
   * @param {string} [options.theme] - Filtrer par thème
   * @param {number} [options.year] - Filtrer par année
   * @param {string} [options.orderBy='Name'] - Tri (Name, Number, Year, Pieces, Rating)
   */
  async search(query, options = {}) {
    const {
      page = 1,
      pageSize = 20,
      theme,
      year,
      orderBy = 'Name'
    } = options;

    // Construire les paramètres de recherche
    const params = {
      apiKey: this.apiKey,
      query: query || '',
      pageNumber: page,
      pageSize: Math.min(pageSize, 500),
      orderBy
    };

    // Filtres optionnels
    if (theme) params.theme = theme;
    if (year) params.year = year;

    // Appel API
    const response = await this.post('/getSets', params);
    
    // Vérifier le succès
    this.checkApiResponse(response);

    // Extraire les données
    const sets = response.sets || [];
    const total = response.matches || sets.length;

    // Normaliser et retourner
    return this.normalizer.normalizeSearchResponse(sets, {
      query,
      total,
      pagination: {
        page,
        pageSize,
        totalResults: total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total
      },
      lang: 'en'
    });
  }

  /**
   * Récupérer les détails d'un set par son ID
   * @param {string} id - ID Brickset (setID) ou numéro de set (75192-1)
   */
  async getById(id, options = {}) {
    let params = {
      apiKey: this.apiKey
    };

    // Détecter si c'est un setID numérique ou un numéro de set
    if (/^\d+$/.test(id)) {
      params.setID = id;
    } else {
      // Format attendu: "75192-1" ou "75192"
      const [number, variant = 1] = id.split('-');
      params.setNumber = number;
      params.setNumberVariant = variant;
    }

    const response = await this.post('/getSets', params);
    this.checkApiResponse(response);

    const sets = response.sets || [];
    if (sets.length === 0) {
      throw new NotFoundError(`Set LEGO "${id}" non trouvé`);
    }

    return this.normalizer.normalizeDetailResponse(sets[0], {
      lang: options.lang || 'en'
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTHODES SPÉCIFIQUES BRICKSET
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Récupérer la liste des thèmes
   */
  async getThemes() {
    const response = await this.post('/getThemes', {
      apiKey: this.apiKey
    });
    
    this.checkApiResponse(response);
    return response.themes || [];
  }

  /**
   * Récupérer les sous-thèmes d'un thème
   * @param {string} theme - Nom du thème
   */
  async getSubthemes(theme) {
    if (!theme) {
      throw new ValidationError('Le paramètre "theme" est requis');
    }

    const response = await this.post('/getSubthemes', {
      apiKey: this.apiKey,
      theme
    });
    
    this.checkApiResponse(response);
    return response.subthemes || [];
  }

  /**
   * Récupérer les années disponibles pour un thème
   * @param {string} [theme] - Nom du thème (optionnel)
   */
  async getYears(theme = null) {
    const params = { apiKey: this.apiKey };
    if (theme) params.theme = theme;

    const response = await this.post('/getYears', params);
    this.checkApiResponse(response);
    
    return response.years || [];
  }

  /**
   * Récupérer les sets récemment mis à jour
   * @param {number} [minutesAgo=10080] - Minutes depuis la mise à jour (défaut: 7 jours)
   */
  async getRecentlyUpdated(minutesAgo = 10080) {
    const response = await this.post('/getRecentlyUpdatedSets', {
      apiKey: this.apiKey,
      minutesAgo
    });
    
    this.checkApiResponse(response);
    const sets = response.sets || [];
    
    return this.normalizer.normalizeSearchResponse(sets, {
      query: 'recently_updated',
      total: sets.length
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Vérifier la réponse API et lever une erreur si nécessaire
   * @private
   */
  checkApiResponse(response) {
    if (response.status === 'error') {
      throw new ValidationError(response.message || 'Erreur API Brickset');
    }
  }

  /**
   * Override de buildFetchOptions pour Brickset (utilise form-data)
   * @override
   */
  buildFetchOptions(options) {
    // Brickset attend du form-urlencoded pour ses endpoints
    if (options.method === 'POST' && options.body) {
      const body = JSON.parse(options.body);
      const formData = new URLSearchParams();
      
      Object.entries(body).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      return {
        method: 'POST',
        headers: {
          ...this.defaultHeaders,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      };
    }

    return super.buildFetchOptions(options);
  }

  /**
   * Health check spécifique
   * @override
   */
  async healthCheck() {
    const startTime = Date.now();
    
    try {
      // Test avec getThemes (léger)
      await this.getThemes();
      
      return {
        healthy: true,
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        message: error.message
      };
    }
  }
}

export default BricksetProvider;
