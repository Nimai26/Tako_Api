/**
 * MangaUpdates Normalizer
 * 
 * Transforme les données de l'API MangaUpdates vers le format Tako.
 */

import { BaseNormalizer } from '../../../core/normalizers/index.js';

export class MangaUpdatesNormalizer extends BaseNormalizer {
  constructor() {
    super({
      source: 'mangaupdates',
      type: 'manga',
      domain: 'anime-manga',
      includeRaw: false
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Nettoie le HTML d'une description
   */
  cleanHtml(html) {
    if (!html) return null;
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extrait l'année d'une date string
   */
  extractYearFromString(yearStr) {
    if (!yearStr) return null;
    const match = String(yearStr).match(/\d{4}/);
    return match ? parseInt(match[0]) : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION DE RECHERCHE (SÉRIES)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normalise la réponse de recherche de séries
   */
  normalizeSearchResponse(data, metadata = {}) {
    const { query, page = 1, pageSize = 25 } = metadata;
    const results = data?.results || [];
    const totalHits = data?.total_hits || 0;

    return {
      query,
      searchType: 'series',
      total: totalHits,
      pagination: {
        page,
        pageSize,
        totalResults: totalHits,
        totalPages: Math.ceil(totalHits / pageSize),
        hasMore: (page * pageSize) < totalHits
      },
      data: results.map((item, index) => this.normalizeSeriesItem(item.record, (page - 1) * pageSize + index + 1)),
      source: 'mangaupdates'
    };
  }

  /**
   * Normalise un item de série pour la recherche
   */
  normalizeSeriesItem(series, position = null) {
    const sourceId = String(series.series_id);

    return {
      id: `mangaupdates:${sourceId}`,
      sourceId,
      provider: 'mangaupdates',
      type: 'manga',
      resourceType: 'series',
      position,

      title: series.title,
      titleOriginal: this.extractOriginalTitle(series),
      titleAlternatives: this.extractAlternativeTitles(series),
      description: this.cleanHtml(series.description),

      type: series.type || 'Manga',
      year: this.extractYearFromString(series.year),
      status: this.extractStatus(series),

      genres: this.extractGenres(series),
      
      rating: {
        score: series.bayesian_rating || null,
        votes: series.rating_votes || 0
      },

      image: this.extractImage(series),
      
      urls: {
        source: series.url,
        detail: `/api/anime-manga/mangaupdates/series/${sourceId}`
      },

      lastUpdated: series.last_updated?.as_rfc3339 || null
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION DÉTAILS SÉRIE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normalise les détails complets d'une série
   */
  normalizeSeriesDetails(series, options = {}) {
    const sourceId = String(series.series_id);

    const data = {
      id: `mangaupdates:${sourceId}`,
      sourceId,
      source: this.source,
      provider: 'mangaupdates',
      type: 'manga',
      resourceType: 'series',

      // Titres
      title: series.title,
      titleOriginal: this.extractOriginalTitle(series),
      titleAlternatives: this.extractAlternativeTitles(series),
      titleFrench: null, // Sera enrichi par le service français

      // Métadonnées
      description: this.cleanHtml(series.description),
      type: series.type || 'Manga',
      year: this.extractYearFromString(series.year),
      status: this.extractStatus(series),
      
      // Statut détaillé
      statusDetails: {
        completed: series.completed ?? null,
        licensed: series.licensed ?? null,
        licensedEnglish: series.licensed_in_english ?? null,
        animeAdaptation: series.anime?.start ? true : false
      },

      // Classification
      genres: this.extractGenres(series),
      categories: this.extractCategories(series),

      // Notation
      rating: {
        score: series.bayesian_rating || null,
        votes: series.rating_votes || 0,
        distribution: series.rating_distribution || null
      },

      // Publication
      publications: this.extractPublications(series),
      
      // Auteurs
      authors: this.extractAuthors(series),
      
      // Éditeurs
      publishers: this.extractPublishers(series),
      
      // Séries liées
      relatedSeries: this.extractRelatedSeries(series),
      
      // Recommandations
      recommendations: this.extractRecommendations(series),

      // Anime
      anime: series.anime ? {
        startYear: series.anime.start,
        endYear: series.anime.end
      } : null,

      // Images
      image: this.extractImage(series),

      // URLs
      urls: {
        source: series.url,
        detail: `/api/anime-manga/mangaupdates/series/${sourceId}`
      },

      // Statistiques
      stats: {
        rankPosition: series.rank?.position || null,
        rankOldPosition: series.rank?.old_position || null,
        forumId: series.forum_id || null
      },

      lastUpdated: series.last_updated?.as_rfc3339 || null,
      metadata: {
        source: 'mangaupdates'
      }
    };

    // Wrapper standardisé
    return {
      success: true,
      provider: this.source,
      domain: this.domain,
      id: data.id,
      data,
      meta: {
        fetchedAt: new Date().toISOString(),
        lang: options.lang || 'en',
        cached: options.cached || false,
        cacheAge: options.cacheAge || null
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTION HELPERS (SÉRIES)
  // ═══════════════════════════════════════════════════════════════════════════

  extractOriginalTitle(series) {
    // Chercher un titre japonais dans les titres associés
    const associated = series.associated || [];
    const jpTitle = associated.find(t => 
      /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(t.title)
    );
    return jpTitle?.title || null;
  }

  extractAlternativeTitles(series) {
    const associated = series.associated || [];
    return associated.map(t => t.title).filter(Boolean);
  }

  extractStatus(series) {
    if (series.completed === true) return 'completed';
    if (series.completed === false) return 'ongoing';
    return series.status || 'unknown';
  }

  extractGenres(series) {
    const genres = series.genres || [];
    return genres.map(g => ({
      id: g.genre?.toLowerCase().replace(/\s+/g, '-') || null,
      name: g.genre
    }));
  }

  extractCategories(series) {
    const categories = series.categories || [];
    return categories.map(c => ({
      id: c.category_id || null,
      name: c.category,
      votes: c.votes || 0,
      votesPlus: c.votes_plus || 0,
      votesMinus: c.votes_minus || 0
    }));
  }

  extractPublications(series) {
    const publications = series.publications || [];
    return publications.map(p => ({
      name: p.publication_name,
      publisherId: p.publisher_id || null,
      publisherName: p.publisher_name || null
    }));
  }

  extractAuthors(series) {
    const authors = series.authors || [];
    return authors.map(a => ({
      id: a.author_id ? String(a.author_id) : null,
      name: a.name || a.author,
      type: a.type || 'Author' // Author, Artist, etc.
    }));
  }

  extractPublishers(series) {
    const publishers = series.publishers || [];
    return publishers.map(p => ({
      id: p.publisher_id ? String(p.publisher_id) : null,
      name: p.publisher_name || p.name,
      type: p.type || null,
      notes: p.notes || null
    }));
  }

  extractRelatedSeries(series) {
    const related = series.related_series || [];
    return related.map(r => ({
      id: r.related_series_id ? String(r.related_series_id) : null,
      name: r.related_series_name,
      type: r.relation_type || 'related',
      triggeredByRelation: r.triggered_by_relation || false
    }));
  }

  extractRecommendations(series) {
    const recs = series.recommendations || [];
    return recs.slice(0, 10).map(r => ({
      id: r.series_id ? String(r.series_id) : null,
      name: r.series_name || r.title,
      weight: r.weight || 0
    }));
  }

  extractImage(series) {
    const img = series.image;
    if (!img?.url) return null;

    return {
      original: img.url.original || null,
      thumbnail: img.url.thumb || null,
      width: img.width || null,
      height: img.height || null
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION AUTEURS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normalise la réponse de recherche d'auteurs
   */
  normalizeAuthorSearchResponse(data, metadata = {}) {
    const { query, page = 1, pageSize = 25 } = metadata;
    const results = data?.results || [];
    const totalHits = data?.total_hits || 0;

    return {
      query,
      searchType: 'author',
      total: totalHits,
      pagination: {
        page,
        pageSize,
        totalResults: totalHits,
        totalPages: Math.ceil(totalHits / pageSize),
        hasMore: (page * pageSize) < totalHits
      },
      data: results.map((item, index) => this.normalizeAuthorItem(item.record, (page - 1) * pageSize + index + 1)),
      source: 'mangaupdates'
    };
  }

  /**
   * Normalise un item auteur pour la recherche
   */
  normalizeAuthorItem(author, position = null) {
    // L'API utilise 'id' pour la recherche et 'author_id' pour les détails
    const sourceId = String(author.id || author.author_id);

    return {
      id: `mangaupdates:author:${sourceId}`,
      sourceId,
      provider: 'mangaupdates',
      type: 'person',
      resourceType: 'author',
      position,

      name: author.name,
      nameAlternatives: this.extractAuthorAltNames(author),

      image: author.image?.url?.original || null,
      
      genres: author.genres || [],
      
      stats: {
        totalSeries: author.stats?.total_series || 0
      },

      urls: {
        source: author.url,
        detail: `/api/anime-manga/mangaupdates/author/${sourceId}`
      }
    };
  }

  /**
   * Normalise les détails complets d'un auteur
   */
  normalizeAuthorDetails(author) {
    // L'API utilise 'id' pour les détails, pas 'author_id'
    const sourceId = String(author.id || author.author_id);

    return {
      id: `mangaupdates:author:${sourceId}`,
      sourceId,
      provider: 'mangaupdates',
      type: 'person',
      resourceType: 'author',

      name: author.name,
      nameAlternatives: this.extractAuthorAltNames(author),
      actualName: author.actualname || null,

      // Infos personnelles
      birthday: author.birthday || null,
      birthplace: author.birthplace || null,
      bloodtype: author.bloodtype || null,
      gender: author.gender || null,

      // Réseaux sociaux
      social: {
        website: author.social?.officialsite || null,
        facebook: author.social?.facebook || null,
        twitter: author.social?.twitter || null
      },

      // Statistiques
      stats: {
        totalSeries: author.stats?.total_series || 0,
        genres: author.genres || []
      },

      image: author.image?.url?.original || null,

      urls: {
        source: author.url,
        detail: `/api/anime-manga/mangaupdates/author/${sourceId}`,
        works: `/api/anime-manga/mangaupdates/author/${sourceId}/works`
      },

      lastUpdated: author.last_updated?.as_rfc3339 || null,
      source: 'mangaupdates'
    };
  }

  /**
   * Normalise les œuvres d'un auteur
   */
  normalizeAuthorWorks(data, authorId) {
    const series = data?.series_list || data || [];
    const list = Array.isArray(series) ? series : [];

    return {
      authorId: String(authorId),
      total: list.length,
      data: list.map(s => ({
        id: s.series_id ? String(s.series_id) : null,
        title: s.title || s.series_name,
        type: s.type || null,
        year: s.year || null,
        url: s.url || null
      })),
      source: 'mangaupdates'
    };
  }

  extractAuthorAltNames(author) {
    const associated = author.associated || author.associated_names || [];
    if (Array.isArray(associated)) {
      return associated.map(n => typeof n === 'string' ? n : n.name).filter(Boolean);
    }
    return [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION ÉDITEURS
  // ═══════════════════════════════════════════════════════════════════════════

  normalizePublisherSearchResponse(data, metadata = {}) {
    const { query, page = 1, pageSize = 25 } = metadata;
    const results = data?.results || [];
    const totalHits = data?.total_hits || 0;

    return {
      query,
      searchType: 'publisher',
      total: totalHits,
      pagination: {
        page,
        pageSize,
        totalResults: totalHits,
        totalPages: Math.ceil(totalHits / pageSize),
        hasMore: (page * pageSize) < totalHits
      },
      data: results.map((item, index) => this.normalizePublisherItem(item.record, (page - 1) * pageSize + index + 1)),
      source: 'mangaupdates'
    };
  }

  normalizePublisherItem(publisher, position = null) {
    const sourceId = String(publisher.publisher_id);

    return {
      id: `mangaupdates:publisher:${sourceId}`,
      sourceId,
      provider: 'mangaupdates',
      type: 'organization',
      resourceType: 'publisher',
      position,

      name: publisher.name || publisher.publisher_name,
      type: publisher.type || null,
      info: publisher.info || null,

      urls: {
        source: publisher.url,
        detail: `/api/anime-manga/mangaupdates/publisher/${sourceId}`
      }
    };
  }

  normalizePublisherDetails(publisher) {
    const sourceId = String(publisher.publisher_id);

    return {
      id: `mangaupdates:publisher:${sourceId}`,
      sourceId,
      provider: 'mangaupdates',
      type: 'organization',
      resourceType: 'publisher',

      name: publisher.name || publisher.publisher_name,
      type: publisher.type || null,
      info: publisher.info || null,
      site: publisher.site || null,

      stats: {
        totalSeries: publisher.stats?.total_series || 0
      },

      urls: {
        source: publisher.url,
        detail: `/api/anime-manga/mangaupdates/publisher/${sourceId}`
      },

      lastUpdated: publisher.last_updated?.as_rfc3339 || null,
      source: 'mangaupdates'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION RELEASES
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeReleasesResponse(data, metadata = {}) {
    const { search, page = 1, pageSize = 25 } = metadata;
    const results = data?.results || [];
    const totalHits = data?.total_hits || 0;

    return {
      search,
      searchType: 'release',
      total: totalHits,
      pagination: {
        page,
        pageSize,
        totalResults: totalHits,
        totalPages: Math.ceil(totalHits / pageSize),
        hasMore: (page * pageSize) < totalHits
      },
      data: results.map((item, index) => this.normalizeReleaseItem(item.record, (page - 1) * pageSize + index + 1)),
      source: 'mangaupdates'
    };
  }

  normalizeReleaseItem(release, position = null) {
    return {
      id: release.id ? String(release.id) : null,
      provider: 'mangaupdates',
      resourceType: 'release',
      position,

      title: release.title || release.series?.title,
      seriesId: release.series_id ? String(release.series_id) : null,
      
      chapter: release.chapter || null,
      volume: release.volume || null,
      
      groupName: release.group?.name || null,
      groupId: release.group?.group_id ? String(release.group.group_id) : null,

      releaseDate: release.release_date || null
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION RECOMMANDATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeRecommendations(data, seriesId) {
    const recs = data?.recommendations || data || [];
    const list = Array.isArray(recs) ? recs : [];

    return {
      seriesId: String(seriesId),
      total: list.length,
      data: list.map(r => ({
        id: r.series_id ? String(r.series_id) : null,
        title: r.series_name || r.title,
        weight: r.weight || 0
      })),
      source: 'mangaupdates'
    };
  }
}

export default MangaUpdatesNormalizer;
