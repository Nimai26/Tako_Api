/**
 * TVDB Normalizer
 * 
 * Transforme les données de l'API TheTVDB vers le format Tako.
 * Gère films, séries, saisons, épisodes, listes, personnes.
 */

import { BaseNormalizer } from '../../../core/normalizers/index.js';

export class TvdbNormalizer extends BaseNormalizer {
  constructor() {
    super({
      source: 'tvdb',
      type: 'media',
      domain: 'media',
      includeRaw: false
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  extractYear(dateString) {
    if (!dateString) return null;
    const match = dateString.match(/^(\d{4})/);
    return match ? parseInt(match[1]) : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECHERCHE
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeSearchResponse(results, metadata = {}) {
    const { query, searchType, total, pagination } = metadata;

    return {
      query,
      searchType,
      total,
      pagination: pagination || {
        page: 1,
        pageSize: results.length,
        totalResults: total,
        hasMore: false
      },
      data: results.map((item, index) => this.normalizeSearchItem(item, index + 1)),
      source: 'tvdb'
    };
  }

  normalizeSearchItem(item, position) {
    const type = item.type || 'series';
    
    return {
      sourceId: String(item.tvdb_id || item.id),
      provider: 'tvdb',
      type: type,
      mediaType: type,

      title: item.name || item.title,
      originalTitle: item.name,
      slug: item.slug,
      
      description: item.overview || null,
      year: item.year || this.extractYear(item.first_air_time),
      
      status: item.status || null,
      network: item.network || null,
      country: item.country || null,
      primaryLanguage: item.primary_language || null,

      poster: item.image || item.thumbnail || item.image_url || null,
      
      aliases: item.aliases || [],

      src_url: type === 'movie'
        ? `https://thetvdb.com/movies/${item.slug || item.tvdb_id || item.id}`
        : `https://thetvdb.com/series/${item.slug || item.tvdb_id || item.id}`,

      metadata: {
        position,
        objectID: item.objectID,
        source: 'tvdb'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DÉTAIL FILM
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeMovieDetail(movie, options = {}) {
    const { translations, baseOverview } = options;
    const genres = Array.isArray(movie.genres) ? movie.genres.map(g => g.name) : [];

    // Détermine l'overview à utiliser
    const overview = translations?.overview || baseOverview || null;

    const data = {
      id: `${this.source}:${movie.id}`,
      sourceId: String(movie.id),
      source: this.source,
      provider: 'tvdb',
      type: 'movie',
      mediaType: 'movie',

      // Infos principales
      title: translations?.name || movie.name,
      originalTitle: movie.name,
      slug: movie.slug,
      description: overview,
      
      year: movie.year,
      runtime: movie.runtime,
      status: movie.status?.name || null,

      // Images
      poster: movie.image,
      artworks: movie.artworks?.slice(0, 20).map(a => ({
        id: a.id,
        type: a.type,
        image: a.image,
        thumbnail: a.thumbnail,
        language: a.language,
        score: a.score
      })) || [],

      // Notes
      rating: movie.score ? {
        average: movie.score,
        votes: null
      } : null,

      // Genres
      genres,
      genresFull: Array.isArray(movie.genres) ? movie.genres.map(g => ({
        id: g.id,
        name: g.name,
        slug: g.slug
      })) : [],

      // Langues et pays
      originalLanguage: movie.originalLanguage,
      originalCountry: movie.originalCountry,

      // Releases
      releases: Array.isArray(movie.releases) ? movie.releases.map(r => ({
        country: r.country,
        date: r.date,
        detail: r.detail
      })) : [],

      // Casting - filtrer les acteurs
      cast: Array.isArray(movie.characters) ? movie.characters
        .filter(c => c.peopleType === 'Actor' || c.isFeatured || 
          (c.personName && !['Director', 'Writer', 'Producer', 'Creator'].includes(c.peopleType)))
        .slice(0, 20)
        .map(c => ({
          id: c.id,
          name: c.name,
          peopleId: c.peopleId,
          personName: c.personName,
          character: c.name,
          image: c.image
        })) : [],

      // Réalisateurs
      directors: this.extractPeopleByType(movie, 'Director'),
      
      // Scénaristes
      writers: this.extractPeopleByType(movie, ['Writer', 'Screenplay']),
      
      // Producteurs
      producers: this.extractPeopleByType(movie, 'Producer'),

      // Sociétés
      companies: Array.isArray(movie.companies) ? movie.companies.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        country: c.country,
        companyType: c.companyType?.name || c.companyType
      })) : [],

      studios: Array.isArray(movie.studios) ? movie.studios.map(s => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        country: s.country
      })) : [],

      // Finances
      budget: movie.budget || null,
      boxOffice: movie.boxOffice || null,
      boxOfficeUS: movie.boxOfficeUS || null,

      // Trailers
      trailers: Array.isArray(movie.trailers) ? movie.trailers.map(t => ({
        id: t.id,
        name: t.name,
        url: t.url,
        runtime: t.runtime,
        language: t.language
      })) : [],

      // Sagas/Collections
      lists: Array.isArray(movie.lists) ? movie.lists.map(l => ({
        id: l.id,
        name: l.name,
        overview: l.overview,
        url: l.url,
        isOfficial: l.isOfficial
      })) : [],

      collection: this.extractMainCollection(movie.lists),

      // Certifications
      contentRatings: Array.isArray(movie.contentRatings) ? movie.contentRatings.map(c => ({
        country: c.country,
        rating: c.name,
        fullName: c.fullName
      })) : [],

      // IDs externes
      remoteIds: movie.remoteIds || [],

      // URLs
      urls: {
        source: `https://thetvdb.com/movies/${movie.slug}`,
        detail: `/api/${this.domain}/${this.source}/${movie.id}`
      },
      src_url: `https://thetvdb.com/movies/${movie.slug}`,

      metadata: {
        lastUpdated: movie.lastUpdated,
        source: 'tvdb'
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
  // DÉTAIL SÉRIE
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeSeriesDetail(series, options = {}) {
    const { translations } = options;
    const genres = Array.isArray(series.genres) ? series.genres.map(g => g.name) : [];

    const data = {
      id: `${this.source}:${series.id}`,
      sourceId: String(series.id),
      source: this.source,
      provider: 'tvdb',
      type: 'series',
      mediaType: 'tv',

      // Infos principales
      title: translations?.name || series.name,
      originalTitle: series.name,
      slug: series.slug,
      description: translations?.overview || series.overview || null,
      
      year: series.year,
      endYear: series.lastAired ? this.extractYear(series.lastAired) : null,
      status: series.status?.name || null,
      averageRuntime: series.averageRuntime,

      // Diffusion
      firstAired: series.firstAired,
      lastAired: series.lastAired,
      nextAired: series.nextAired,

      // Images
      poster: series.image,
      artworks: series.artworks?.slice(0, 20).map(a => ({
        id: a.id,
        type: a.type,
        image: a.image,
        thumbnail: a.thumbnail,
        language: a.language,
        score: a.score
      })) || [],

      // Notes
      rating: series.score ? {
        average: series.score,
        votes: null
      } : null,

      // Genres
      genres,
      genresFull: Array.isArray(series.genres) ? series.genres.map(g => ({
        id: g.id,
        name: g.name,
        slug: g.slug
      })) : [],

      // Langues et pays
      originalLanguage: series.originalLanguage,
      originalCountry: series.originalCountry,

      // Saisons
      seasons: series.seasons?.filter(s => s.type?.id === 1 || s.type?.name === 'Aired Order')
        .map(s => ({
          id: s.id,
          number: s.number,
          name: s.name?.en || s.name || `Saison ${s.number}`,
          image: s.image,
          type: s.type?.name
        })) || [],
      
      numberOfSeasons: series.seasons?.filter(s => s.type?.id === 1).length || 0,
      numberOfEpisodes: series.episodes?.length || null,

      // Networks
      originalNetwork: series.originalNetwork ? {
        id: series.originalNetwork.id,
        name: series.originalNetwork.name,
        slug: series.originalNetwork.slug,
        country: series.originalNetwork.country
      } : null,
      latestNetwork: series.latestNetwork ? {
        id: series.latestNetwork.id,
        name: series.latestNetwork.name,
        slug: series.latestNetwork.slug,
        country: series.latestNetwork.country
      } : null,

      // Casting
      cast: Array.isArray(series.characters) ? series.characters
        .filter(c => c.peopleType === 'Actor' || c.isFeatured)
        .slice(0, 20)
        .map(c => ({
          id: c.id,
          name: c.name,
          peopleId: c.peopleId,
          personName: c.personName,
          character: c.name,
          image: c.image
        })) : [],

      // Créateurs
      creators: this.extractPeopleByType(series, 'Creator'),
      directors: this.extractPeopleByType(series, 'Director'),
      writers: this.extractPeopleByType(series, ['Writer', 'Screenplay']),

      // Sociétés
      companies: Array.isArray(series.companies) ? series.companies.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        country: c.country,
        companyType: c.companyType?.name || c.companyType
      })) : [],

      // Trailers
      trailers: Array.isArray(series.trailers) ? series.trailers.map(t => ({
        id: t.id,
        name: t.name,
        url: t.url,
        runtime: t.runtime,
        language: t.language
      })) : [],

      // Sagas
      lists: Array.isArray(series.lists) ? series.lists.slice(0, 10).map(l => ({
        id: l.id,
        name: l.name,
        overview: l.overview,
        isOfficial: l.isOfficial
      })) : [],

      collection: this.extractMainCollection(series.lists),

      // Certifications
      contentRatings: series.contentRatings || [],

      // IDs externes
      remoteIds: series.remoteIds || [],

      // URLs
      urls: {
        source: `https://thetvdb.com/series/${series.slug}`,
        detail: `/api/${this.domain}/${this.source}/${series.id}`
      },
      src_url: `https://thetvdb.com/series/${series.slug}`,

      metadata: {
        defaultSeasonType: series.defaultSeasonType,
        lastUpdated: series.lastUpdated,
        source: 'tvdb'
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
  // SAISON
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeSeasonDetail(season, options = {}) {
    const { translations } = options;

    return {
      sourceId: String(season.id),
      provider: 'tvdb',
      type: 'season',

      seriesId: season.seriesId,
      number: season.number,
      
      name: translations?.name || season.name?.en || season.name || `Saison ${season.number}`,
      overview: translations?.overview || season.overview || null,
      
      year: season.year,
      
      poster: season.image,
      
      type: season.type?.name || 'Aired Order',

      episodes: season.episodes?.map(ep => this.normalizeEpisodeItem(ep)) || [],
      episodeCount: season.episodes?.length || 0,

      src_url: null, // TVDB n'a pas d'URL directe pour les saisons

      metadata: {
        lastUpdated: season.lastUpdated,
        source: 'tvdb'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉPISODE
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeEpisodeItem(episode) {
    return {
      sourceId: String(episode.id),
      provider: 'tvdb',
      type: 'episode',

      seriesId: episode.seriesId,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.number,
      absoluteNumber: episode.absoluteNumber,

      name: episode.name,
      overview: episode.overview || null,
      
      airDate: episode.aired,
      runtime: episode.runtime,
      
      image: episode.image,

      rating: episode.rating ? {
        average: episode.rating,
        votes: null
      } : null,

      isMovie: episode.isMovie || false,
      finaleType: episode.finaleType || null,

      metadata: {
        lastUpdated: episode.lastUpdated,
        source: 'tvdb'
      }
    };
  }

  normalizeEpisodeDetail(episode, options = {}) {
    const { translations } = options;
    const base = this.normalizeEpisodeItem(episode);

    return {
      ...base,
      name: translations?.name || base.name,
      overview: translations?.overview || base.overview,

      // Équipe technique
      directors: this.extractPeopleByType({ characters: episode.characters }, 'Director'),
      writers: this.extractPeopleByType({ characters: episode.characters }, ['Writer', 'Screenplay']),

      // Guest stars
      guestStars: Array.isArray(episode.characters) ? episode.characters
        .filter(c => c.peopleType === 'Guest Star' || c.isFeatured)
        .map(c => ({
          id: c.id,
          name: c.name,
          personName: c.personName,
          character: c.name,
          image: c.image
        })) : [],

      // Artworks
      artworks: episode.artworks?.slice(0, 10) || [],

      src_url: null,

      metadata: {
        ...base.metadata,
        detailLevel: 'full'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTE / SAGA
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeListDetail(list) {
    return {
      sourceId: String(list.id),
      provider: 'tvdb',
      type: 'list',

      name: list.name,
      overview: list.overview || null,
      isOfficial: list.isOfficial || false,

      // Contenu de la liste
      entities: (list.entities || []).map(e => ({
        id: e.entityId,
        type: e.type, // movie, series
        order: e.order
      })),

      movieCount: (list.entities || []).filter(e => e.type === 'movie').length,
      seriesCount: (list.entities || []).filter(e => e.type === 'series').length,
      totalCount: list.entities?.length || 0,

      src_url: list.url || null,

      metadata: {
        source: 'tvdb'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSONNE
  // ═══════════════════════════════════════════════════════════════════════════

  normalizePersonDetail(person) {
    return {
      sourceId: String(person.id),
      provider: 'tvdb',
      type: 'person',

      name: person.name,
      image: person.image,
      
      birth: person.birth,
      death: person.death,
      birthPlace: person.birthPlace,
      gender: person.gender,

      // Biographies par langue
      biographies: person.biographies || [],
      
      // Crédits
      characters: person.characters?.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        peopleType: c.peopleType,
        seriesId: c.seriesId,
        movieId: c.movieId,
        image: c.image
      })) || [],

      // IDs externes
      remoteIds: person.remoteIds || [],

      src_url: person.slug ? `https://thetvdb.com/people/${person.slug}` : null,

      metadata: {
        lastUpdated: person.lastUpdated,
        source: 'tvdb'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS PRIVÉS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extrait les personnes par type (Director, Writer, etc.)
   */
  extractPeopleByType(item, types) {
    const typeArray = Array.isArray(types) ? types : [types];
    
    const fromCharacters = Array.isArray(item.characters) 
      ? item.characters.filter(c => typeArray.includes(c.peopleType))
      : [];
    
    const fromPeople = Array.isArray(item.people)
      ? item.people.filter(p => typeArray.includes(p.peopleType) || typeArray.includes(p.role))
      : [];

    const combined = [...fromCharacters, ...fromPeople];
    
    // Dédupliquer par peopleId
    const seen = new Set();
    return combined
      .filter(c => {
        const id = c.peopleId || c.id;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map(c => ({
        id: c.peopleId || c.id,
        name: c.personName || c.name,
        image: c.image
      }));
  }

  /**
   * Extrait la collection/saga principale
   */
  extractMainCollection(lists) {
    if (!Array.isArray(lists) || lists.length === 0) return null;
    
    const official = lists.find(l => l.isOfficial);
    const first = official || lists[0];
    
    return {
      id: first.id,
      name: first.name,
      overview: first.overview
    };
  }
}
