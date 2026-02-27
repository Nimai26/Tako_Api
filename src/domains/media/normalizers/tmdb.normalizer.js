/**
 * TMDB Normalizer
 * 
 * Transforme les données de l'API TMDB vers le format Tako.
 * Gère films, séries, saisons, épisodes, collections, personnes.
 */

import { BaseNormalizer } from '../../../core/normalizers/index.js';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export class TmdbNormalizer extends BaseNormalizer {
  constructor() {
    super({
      source: 'tmdb',
      type: 'media',
      domain: 'media',
      includeRaw: false
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  buildImageUrl(path, size = 'w500') {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }

  extractYear(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date.getFullYear();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECHERCHE
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeSearchResponse(results, metadata = {}) {
    const { query, searchType, total, pagination, imageBaseUrl } = metadata;

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
      data: results.map((item, index) => this.normalizeSearchItem(item, searchType, index + 1)),
      source: 'tmdb'
    };
  }

  normalizeSearchItem(item, searchType, position) {
    const mediaType = item.media_type || searchType;
    
    if (mediaType === 'movie') {
      return this.normalizeMovieSearchItem(item, position);
    } else if (mediaType === 'tv') {
      return this.normalizeSeriesSearchItem(item, position);
    } else if (mediaType === 'person') {
      return this.normalizePersonSearchItem(item, position);
    }
    
    // Multi search - détecter automatiquement
    if (item.title || item.release_date) {
      return this.normalizeMovieSearchItem(item, position);
    } else if (item.name && (item.first_air_date || item.origin_country)) {
      return this.normalizeSeriesSearchItem(item, position);
    } else if (item.known_for_department) {
      return this.normalizePersonSearchItem(item, position);
    }
    
    return this.normalizeMovieSearchItem(item, position);
  }

  normalizeMovieSearchItem(movie, position = null) {
    return {
      sourceId: String(movie.id),
      provider: 'tmdb',
      type: 'movie',
      mediaType: 'movie',

      title: movie.title,
      originalTitle: movie.original_title,
      description: movie.overview || null,
      
      releaseDate: movie.release_date,
      year: this.extractYear(movie.release_date),
      
      poster: this.buildImageUrl(movie.poster_path, 'w500'),
      posterSmall: this.buildImageUrl(movie.poster_path, 'w185'),
      backdrop: this.buildImageUrl(movie.backdrop_path, 'w1280'),
      
      rating: movie.vote_average ? {
        average: movie.vote_average,
        votes: movie.vote_count
      } : null,
      popularity: movie.popularity,
      
      genreIds: movie.genre_ids || [],
      originalLanguage: movie.original_language,
      adult: movie.adult || false,

      src_url: `https://www.themoviedb.org/movie/${movie.id}`,

      metadata: {
        position,
        source: 'tmdb'
      }
    };
  }

  normalizeSeriesSearchItem(series, position = null) {
    return {
      sourceId: String(series.id),
      provider: 'tmdb',
      type: 'series',
      mediaType: 'tv',

      title: series.name,
      originalTitle: series.original_name,
      description: series.overview || null,
      
      firstAirDate: series.first_air_date,
      year: this.extractYear(series.first_air_date),
      
      poster: this.buildImageUrl(series.poster_path, 'w500'),
      posterSmall: this.buildImageUrl(series.poster_path, 'w185'),
      backdrop: this.buildImageUrl(series.backdrop_path, 'w1280'),
      
      rating: series.vote_average ? {
        average: series.vote_average,
        votes: series.vote_count
      } : null,
      popularity: series.popularity,
      
      genreIds: series.genre_ids || [],
      originalLanguage: series.original_language,
      originCountry: series.origin_country || [],

      src_url: `https://www.themoviedb.org/tv/${series.id}`,

      metadata: {
        position,
        source: 'tmdb'
      }
    };
  }

  normalizePersonSearchItem(person, position = null) {
    return {
      sourceId: String(person.id),
      provider: 'tmdb',
      type: 'person',
      mediaType: 'person',

      name: person.name,
      knownForDepartment: person.known_for_department,
      
      profile: this.buildImageUrl(person.profile_path, 'w185'),
      popularity: person.popularity,
      adult: person.adult || false,

      knownFor: (person.known_for || []).map(item => ({
        id: item.id,
        mediaType: item.media_type,
        title: item.title || item.name,
        poster: this.buildImageUrl(item.poster_path, 'w185')
      })),

      src_url: `https://www.themoviedb.org/person/${person.id}`,

      metadata: {
        position,
        source: 'tmdb'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DÉTAIL FILM
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeMovieDetail(movie, options = {}) {
    const genres = movie.genres?.map(g => g.name) || [];

    const data = {
      id: `${this.source}:${movie.id}`,
      sourceId: String(movie.id),
      source: this.source,
      provider: 'tmdb',
      type: 'movie',
      mediaType: 'movie',

      // Infos principales
      title: movie.title,
      originalTitle: movie.original_title,
      tagline: movie.tagline || null,
      description: movie.overview || null,
      
      releaseDate: movie.release_date,
      year: this.extractYear(movie.release_date),
      runtime: movie.runtime,
      status: movie.status,
      adult: movie.adult || false,

      // Images
      poster: this.buildImageUrl(movie.poster_path, 'w500'),
      posterOriginal: this.buildImageUrl(movie.poster_path, 'original'),
      backdrop: this.buildImageUrl(movie.backdrop_path, 'w1280'),
      backdropOriginal: this.buildImageUrl(movie.backdrop_path, 'original'),

      // Notes
      rating: {
        average: movie.vote_average,
        votes: movie.vote_count
      },
      popularity: movie.popularity,

      // Genres
      genres,
      genresFull: movie.genres || [],

      // Finances
      budget: movie.budget || null,
      revenue: movie.revenue || null,

      // Langues et pays
      originalLanguage: movie.original_language,
      spokenLanguages: movie.spoken_languages?.map(l => ({
        code: l.iso_639_1,
        name: l.name,
        englishName: l.english_name
      })) || [],
      productionCountries: movie.production_countries?.map(c => ({
        code: c.iso_3166_1,
        name: c.name
      })) || [],

      // Collection/Saga
      collection: movie.belongs_to_collection ? {
        id: movie.belongs_to_collection.id,
        name: movie.belongs_to_collection.name,
        poster: this.buildImageUrl(movie.belongs_to_collection.poster_path, 'w500'),
        backdrop: this.buildImageUrl(movie.belongs_to_collection.backdrop_path, 'w1280')
      } : null,

      // Sociétés de production
      productionCompanies: movie.production_companies?.map(c => ({
        id: c.id,
        name: c.name,
        logo: this.buildImageUrl(c.logo_path, 'w185'),
        country: c.origin_country
      })) || [],

      // Casting
      cast: movie.credits?.cast?.slice(0, 20).map(c => ({
        id: c.id,
        name: c.name,
        character: c.character,
        order: c.order,
        profile: this.buildImageUrl(c.profile_path, 'w185')
      })) || [],

      // Équipe technique
      crew: movie.credits?.crew?.filter(c => 
        ['Director', 'Writer', 'Screenplay', 'Producer', 'Executive Producer', 'Original Music Composer'].includes(c.job)
      ).map(c => ({
        id: c.id,
        name: c.name,
        job: c.job,
        department: c.department,
        profile: this.buildImageUrl(c.profile_path, 'w185')
      })) || [],

      // Réalisateurs (extraction directe)
      directors: movie.credits?.crew?.filter(c => c.job === 'Director').map(c => ({
        id: c.id,
        name: c.name,
        profile: this.buildImageUrl(c.profile_path, 'w185')
      })) || [],

      // Vidéos (trailers, etc.)
      videos: movie.videos?.results?.filter(v => v.site === 'YouTube').map(v => ({
        id: v.id,
        key: v.key,
        name: v.name,
        type: v.type,
        official: v.official,
        url: `https://www.youtube.com/watch?v=${v.key}`
      })) || [],

      // Mots-clés
      keywords: movie.keywords?.keywords?.map(k => k.name) || [],

      // IDs externes
      externalIds: {
        imdb: movie.external_ids?.imdb_id,
        facebook: movie.external_ids?.facebook_id,
        instagram: movie.external_ids?.instagram_id,
        twitter: movie.external_ids?.twitter_id,
        wikidata: movie.external_ids?.wikidata_id
      },

      // Certifications
      certifications: movie.release_dates?.results?.map(r => ({
        country: r.iso_3166_1,
        certification: r.release_dates?.[0]?.certification || null,
        releaseDate: r.release_dates?.[0]?.release_date || null
      })).filter(c => c.certification) || [],

      // Recommandations
      recommendations: movie.recommendations?.results?.slice(0, 10).map(r => ({
        id: r.id,
        title: r.title,
        releaseDate: r.release_date,
        year: this.extractYear(r.release_date),
        rating: r.vote_average,
        poster: this.buildImageUrl(r.poster_path, 'w185')
      })) || [],

      // Films similaires
      similar: movie.similar?.results?.slice(0, 10).map(s => ({
        id: s.id,
        title: s.title,
        releaseDate: s.release_date,
        year: this.extractYear(s.release_date),
        rating: s.vote_average,
        poster: this.buildImageUrl(s.poster_path, 'w185')
      })) || [],

      // URLs
      homepage: movie.homepage || null,
      urls: {
        source: `https://www.themoviedb.org/movie/${movie.id}`,
        detail: `/api/${this.domain}/${this.source}/${movie.id}`
      },
      src_url: `https://www.themoviedb.org/movie/${movie.id}`,

      metadata: {
        imdbId: movie.imdb_id,
        source: 'tmdb'
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
    const genres = series.genres?.map(g => g.name) || [];

    const data = {
      id: `${this.source}:${series.id}`,
      sourceId: String(series.id),
      source: this.source,
      provider: 'tmdb',
      type: 'series',
      mediaType: 'tv',

      // Infos principales
      title: series.name,
      originalTitle: series.original_name,
      tagline: series.tagline || null,
      description: series.overview || null,
      
      firstAirDate: series.first_air_date,
      lastAirDate: series.last_air_date,
      year: this.extractYear(series.first_air_date),
      endYear: this.extractYear(series.last_air_date),
      
      status: series.status,
      tvType: series.type,
      inProduction: series.in_production,
      adult: series.adult || false,

      // Épisodes/Saisons
      numberOfSeasons: series.number_of_seasons,
      numberOfEpisodes: series.number_of_episodes,
      episodeRunTime: series.episode_run_time || [],

      // Images
      poster: this.buildImageUrl(series.poster_path, 'w500'),
      posterOriginal: this.buildImageUrl(series.poster_path, 'original'),
      backdrop: this.buildImageUrl(series.backdrop_path, 'w1280'),
      backdropOriginal: this.buildImageUrl(series.backdrop_path, 'original'),

      // Notes
      rating: {
        average: series.vote_average,
        votes: series.vote_count
      },
      popularity: series.popularity,

      // Genres
      genres,
      genresFull: series.genres || [],

      // Langues et pays
      originalLanguage: series.original_language,
      languages: series.languages || [],
      originCountry: series.origin_country || [],
      spokenLanguages: series.spoken_languages?.map(l => ({
        code: l.iso_639_1,
        name: l.name,
        englishName: l.english_name
      })) || [],
      productionCountries: series.production_countries?.map(c => ({
        code: c.iso_3166_1,
        name: c.name
      })) || [],

      // Dernier/Prochain épisode
      lastEpisodeToAir: series.last_episode_to_air ? {
        id: series.last_episode_to_air.id,
        name: series.last_episode_to_air.name,
        overview: series.last_episode_to_air.overview,
        airDate: series.last_episode_to_air.air_date,
        seasonNumber: series.last_episode_to_air.season_number,
        episodeNumber: series.last_episode_to_air.episode_number,
        rating: series.last_episode_to_air.vote_average
      } : null,
      nextEpisodeToAir: series.next_episode_to_air ? {
        id: series.next_episode_to_air.id,
        name: series.next_episode_to_air.name,
        overview: series.next_episode_to_air.overview,
        airDate: series.next_episode_to_air.air_date,
        seasonNumber: series.next_episode_to_air.season_number,
        episodeNumber: series.next_episode_to_air.episode_number
      } : null,

      // Networks
      networks: series.networks?.map(n => ({
        id: n.id,
        name: n.name,
        logo: this.buildImageUrl(n.logo_path, 'w185'),
        country: n.origin_country
      })) || [],

      // Sociétés de production
      productionCompanies: series.production_companies?.map(c => ({
        id: c.id,
        name: c.name,
        logo: this.buildImageUrl(c.logo_path, 'w185'),
        country: c.origin_country
      })) || [],

      // Créateurs
      createdBy: series.created_by?.map(c => ({
        id: c.id,
        name: c.name,
        profile: this.buildImageUrl(c.profile_path, 'w185')
      })) || [],

      // Saisons
      seasons: series.seasons?.map(s => ({
        id: s.id,
        seasonNumber: s.season_number,
        name: s.name,
        overview: s.overview,
        episodeCount: s.episode_count,
        airDate: s.air_date,
        poster: this.buildImageUrl(s.poster_path, 'w185'),
        rating: s.vote_average
      })) || [],

      // Casting
      cast: series.credits?.cast?.slice(0, 20).map(c => ({
        id: c.id,
        name: c.name,
        character: c.character,
        order: c.order,
        profile: this.buildImageUrl(c.profile_path, 'w185')
      })) || [],

      // Équipe technique
      crew: series.credits?.crew?.filter(c => 
        ['Executive Producer', 'Creator', 'Original Music Composer', 'Director of Photography'].includes(c.job)
      ).map(c => ({
        id: c.id,
        name: c.name,
        job: c.job,
        department: c.department,
        profile: this.buildImageUrl(c.profile_path, 'w185')
      })) || [],

      // Vidéos
      videos: series.videos?.results?.filter(v => v.site === 'YouTube').map(v => ({
        id: v.id,
        key: v.key,
        name: v.name,
        type: v.type,
        official: v.official,
        url: `https://www.youtube.com/watch?v=${v.key}`
      })) || [],

      // Mots-clés
      keywords: series.keywords?.results?.map(k => k.name) || [],

      // IDs externes
      externalIds: {
        imdb: series.external_ids?.imdb_id,
        tvdb: series.external_ids?.tvdb_id,
        facebook: series.external_ids?.facebook_id,
        instagram: series.external_ids?.instagram_id,
        twitter: series.external_ids?.twitter_id,
        wikidata: series.external_ids?.wikidata_id
      },

      // Certifications
      contentRatings: series.content_ratings?.results?.map(r => ({
        country: r.iso_3166_1,
        rating: r.rating
      })) || [],

      // Recommandations
      recommendations: series.recommendations?.results?.slice(0, 10).map(r => ({
        id: r.id,
        name: r.name,
        firstAirDate: r.first_air_date,
        year: this.extractYear(r.first_air_date),
        rating: r.vote_average,
        poster: this.buildImageUrl(r.poster_path, 'w185')
      })) || [],

      // Séries similaires
      similar: series.similar?.results?.slice(0, 10).map(s => ({
        id: s.id,
        name: s.name,
        firstAirDate: s.first_air_date,
        year: this.extractYear(s.first_air_date),
        rating: s.vote_average,
        poster: this.buildImageUrl(s.poster_path, 'w185')
      })) || [],

      // URLs
      homepage: series.homepage || null,
      urls: {
        source: `https://www.themoviedb.org/tv/${series.id}`,
        detail: `/api/${this.domain}/${this.source}/${series.id}`
      },
      src_url: `https://www.themoviedb.org/tv/${series.id}`,

      metadata: {
        source: 'tmdb'
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
    const { seriesId } = options;

    return {
      sourceId: String(season.id),
      provider: 'tmdb',
      type: 'season',
      
      seriesId,
      seasonNumber: season.season_number,
      
      name: season.name,
      overview: season.overview || null,
      airDate: season.air_date,
      year: this.extractYear(season.air_date),

      poster: this.buildImageUrl(season.poster_path, 'w500'),

      episodes: season.episodes?.map(ep => ({
        id: ep.id,
        episodeNumber: ep.episode_number,
        name: ep.name,
        overview: ep.overview,
        airDate: ep.air_date,
        runtime: ep.runtime,
        still: this.buildImageUrl(ep.still_path, 'w300'),
        rating: ep.vote_average ? {
          average: ep.vote_average,
          votes: ep.vote_count
        } : null,
        crew: ep.crew?.slice(0, 5).map(c => ({
          id: c.id,
          name: c.name,
          job: c.job
        })) || [],
        guestStars: ep.guest_stars?.slice(0, 10).map(g => ({
          id: g.id,
          name: g.name,
          character: g.character,
          profile: this.buildImageUrl(g.profile_path, 'w185')
        })) || []
      })) || [],

      episodeCount: season.episodes?.length || 0,

      // Casting de la saison
      cast: season.credits?.cast?.slice(0, 15).map(c => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profile: this.buildImageUrl(c.profile_path, 'w185')
      })) || [],

      // Vidéos de la saison
      videos: season.videos?.results?.filter(v => v.site === 'YouTube').map(v => ({
        id: v.id,
        key: v.key,
        name: v.name,
        type: v.type,
        url: `https://www.youtube.com/watch?v=${v.key}`
      })) || [],

      src_url: seriesId ? `https://www.themoviedb.org/tv/${seriesId}/season/${season.season_number}` : null,

      metadata: {
        source: 'tmdb'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉPISODE
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeEpisodeDetail(episode, options = {}) {
    const { seriesId, seasonNumber } = options;

    return {
      sourceId: String(episode.id),
      provider: 'tmdb',
      type: 'episode',
      
      seriesId,
      seasonNumber: seasonNumber || episode.season_number,
      episodeNumber: episode.episode_number,
      
      name: episode.name,
      overview: episode.overview || null,
      airDate: episode.air_date,
      runtime: episode.runtime,

      still: this.buildImageUrl(episode.still_path, 'w500'),
      stillOriginal: this.buildImageUrl(episode.still_path, 'original'),

      rating: episode.vote_average ? {
        average: episode.vote_average,
        votes: episode.vote_count
      } : null,

      // Équipe technique de l'épisode
      crew: episode.crew?.map(c => ({
        id: c.id,
        name: c.name,
        job: c.job,
        department: c.department,
        profile: this.buildImageUrl(c.profile_path, 'w185')
      })) || [],

      // Réalisateur(s)
      directors: episode.crew?.filter(c => c.job === 'Director').map(c => ({
        id: c.id,
        name: c.name,
        profile: this.buildImageUrl(c.profile_path, 'w185')
      })) || [],

      // Scénariste(s)
      writers: episode.crew?.filter(c => c.job === 'Writer' || c.job === 'Screenplay').map(c => ({
        id: c.id,
        name: c.name,
        profile: this.buildImageUrl(c.profile_path, 'w185')
      })) || [],

      // Guest stars
      guestStars: episode.guest_stars?.map(g => ({
        id: g.id,
        name: g.name,
        character: g.character,
        order: g.order,
        profile: this.buildImageUrl(g.profile_path, 'w185')
      })) || [],

      // Vidéos
      videos: episode.videos?.results?.filter(v => v.site === 'YouTube').map(v => ({
        id: v.id,
        key: v.key,
        name: v.name,
        type: v.type,
        url: `https://www.youtube.com/watch?v=${v.key}`
      })) || [],

      src_url: seriesId 
        ? `https://www.themoviedb.org/tv/${seriesId}/season/${seasonNumber || episode.season_number}/episode/${episode.episode_number}` 
        : null,

      metadata: {
        source: 'tmdb'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COLLECTION / SAGA
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeCollectionDetail(collection, options = {}) {
    return {
      sourceId: String(collection.id),
      provider: 'tmdb',
      type: 'collection',
      
      name: collection.name,
      overview: collection.overview || null,

      poster: this.buildImageUrl(collection.poster_path, 'w500'),
      posterOriginal: this.buildImageUrl(collection.poster_path, 'original'),
      backdrop: this.buildImageUrl(collection.backdrop_path, 'w1280'),
      backdropOriginal: this.buildImageUrl(collection.backdrop_path, 'original'),

      // Films de la collection, triés par date de sortie
      parts: (collection.parts || [])
        .sort((a, b) => {
          const dateA = a.release_date ? new Date(a.release_date) : new Date(0);
          const dateB = b.release_date ? new Date(b.release_date) : new Date(0);
          return dateA - dateB;
        })
        .map((movie, index) => ({
          id: movie.id,
          title: movie.title,
          originalTitle: movie.original_title,
          overview: movie.overview,
          releaseDate: movie.release_date,
          year: this.extractYear(movie.release_date),
          poster: this.buildImageUrl(movie.poster_path, 'w185'),
          backdrop: this.buildImageUrl(movie.backdrop_path, 'w780'),
          rating: movie.vote_average ? {
            average: movie.vote_average,
            votes: movie.vote_count
          } : null,
          popularity: movie.popularity,
          order: index + 1
        })),

      movieCount: collection.parts?.length || 0,

      src_url: `https://www.themoviedb.org/collection/${collection.id}`,

      metadata: {
        source: 'tmdb'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSONNE
  // ═══════════════════════════════════════════════════════════════════════════

  normalizePersonDetail(person, options = {}) {
    const data = {
      id: `${this.source}:${person.id}`,
      sourceId: String(person.id),
      source: this.source,
      provider: 'tmdb',
      type: 'person',
      
      name: person.name,
      title: person.name,  // Pour cohérence avec autres providers
      alsoKnownAs: person.also_known_as || [],
      
      biography: person.biography || null,
      birthday: person.birthday,
      deathday: person.deathday,
      placeOfBirth: person.place_of_birth,
      gender: person.gender, // 0: non spécifié, 1: femme, 2: homme, 3: non-binaire
      
      knownForDepartment: person.known_for_department,
      popularity: person.popularity,
      adult: person.adult || false,

      profile: this.buildImageUrl(person.profile_path, 'w500'),
      profileOriginal: this.buildImageUrl(person.profile_path, 'original'),

      // IDs externes
      externalIds: {
        imdb: person.external_ids?.imdb_id,
        facebook: person.external_ids?.facebook_id,
        instagram: person.external_ids?.instagram_id,
        twitter: person.external_ids?.twitter_id,
        tiktok: person.external_ids?.tiktok_id,
        youtube: person.external_ids?.youtube_id
      },

      // Crédits films
      movieCredits: {
        cast: person.movie_credits?.cast?.map(m => ({
          id: m.id,
          title: m.title,
          character: m.character,
          releaseDate: m.release_date,
          year: this.extractYear(m.release_date),
          poster: this.buildImageUrl(m.poster_path, 'w185'),
          rating: m.vote_average,
          popularity: m.popularity
        })) || [],
        crew: person.movie_credits?.crew?.map(m => ({
          id: m.id,
          title: m.title,
          job: m.job,
          department: m.department,
          releaseDate: m.release_date,
          year: this.extractYear(m.release_date),
          poster: this.buildImageUrl(m.poster_path, 'w185'),
          rating: m.vote_average,
          popularity: m.popularity
        })) || []
      },

      // Crédits TV
      tvCredits: {
        cast: person.tv_credits?.cast?.map(t => ({
          id: t.id,
          name: t.name,
          character: t.character,
          firstAirDate: t.first_air_date,
          year: this.extractYear(t.first_air_date),
          poster: this.buildImageUrl(t.poster_path, 'w185'),
          rating: t.vote_average,
          episodeCount: t.episode_count
        })) || [],
        crew: person.tv_credits?.crew?.map(t => ({
          id: t.id,
          name: t.name,
          job: t.job,
          department: t.department,
          firstAirDate: t.first_air_date,
          year: this.extractYear(t.first_air_date),
          poster: this.buildImageUrl(t.poster_path, 'w185'),
          rating: t.vote_average,
          episodeCount: t.episode_count
        })) || []
      },

      homepage: person.homepage || null,
      urls: {
        source: `https://www.themoviedb.org/person/${person.id}`,
        detail: `/api/${this.domain}/${this.source}/${person.id}`
      },
      src_url: `https://www.themoviedb.org/person/${person.id}`,

      metadata: {
        source: 'tmdb'
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
}
