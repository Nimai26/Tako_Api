/**
 * Jikan Normalizer
 * 
 * Transforme les données de l'API Jikan (MyAnimeList) vers le format Tako.
 */

import { BaseNormalizer } from '../../../core/normalizers/index.js';

export class JikanNormalizer extends BaseNormalizer {
  constructor() {
    super({
      source: 'jikan',
      type: 'anime-manga',
      domain: 'anime-manga',
      includeRaw: false
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extrait la meilleure image
   */
  extractImage(images, preferWebp = true) {
    if (!images) return null;
    
    if (preferWebp && images.webp) {
      return images.webp.large_image_url || images.webp.image_url;
    }
    if (images.jpg) {
      return images.jpg.large_image_url || images.jpg.image_url;
    }
    return null;
  }

  /**
   * Extrait toutes les images disponibles
   */
  extractAllImages(images) {
    if (!images) return [];
    
    const result = [];
    
    if (images.jpg) {
      if (images.jpg.large_image_url) result.push({ type: 'jpg', size: 'large', url: images.jpg.large_image_url });
      if (images.jpg.image_url) result.push({ type: 'jpg', size: 'medium', url: images.jpg.image_url });
      if (images.jpg.small_image_url) result.push({ type: 'jpg', size: 'small', url: images.jpg.small_image_url });
    }
    
    if (images.webp) {
      if (images.webp.large_image_url) result.push({ type: 'webp', size: 'large', url: images.webp.large_image_url });
      if (images.webp.image_url) result.push({ type: 'webp', size: 'medium', url: images.webp.image_url });
      if (images.webp.small_image_url) result.push({ type: 'webp', size: 'small', url: images.webp.small_image_url });
    }
    
    return result;
  }

  /**
   * Extrait les noms d'une liste d'objets avec nom
   */
  extractNames(items) {
    if (!items || !Array.isArray(items)) return [];
    return items.map(item => ({
      id: item.mal_id,
      name: item.name,
      url: item.url
    }));
  }

  /**
   * Convertit le rating MAL en catégorie d'âge
   */
  normalizeRating(rating) {
    if (!rating) return null;
    
    // G - All Ages, PG - Children, PG-13, R - 17+, R+ - Mild Nudity, Rx - Hentai
    const ratingMap = {
      'G - All Ages': { code: 'G', label: 'Tous publics', minAge: 0 },
      'PG - Children': { code: 'PG', label: 'Enfants', minAge: 0 },
      'PG-13 - Teens 13 or older': { code: 'PG-13', label: '13+', minAge: 13 },
      'R - 17+ (violence & profanity)': { code: 'R', label: '17+', minAge: 17 },
      'R+ - Mild Nudity': { code: 'R+', label: '17+ (nudité légère)', minAge: 17 },
      'Rx - Hentai': { code: 'Rx', label: 'Hentai (18+)', minAge: 18 }
    };
    
    return ratingMap[rating] || { code: 'Unknown', label: rating, minAge: null };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECHERCHE ANIME
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeAnimeSearchResponse(data, metadata = {}) {
    const { query, page = 1, pageSize = 25, searchType = 'anime' } = metadata;
    const results = data?.data || [];
    const pagination = data?.pagination || {};

    return {
      query,
      searchType,
      total: pagination.items?.total || results.length,
      pagination: {
        page,
        pageSize,
        totalResults: pagination.items?.total || results.length,
        totalPages: pagination.last_visible_page || 1,
        hasMore: pagination.has_next_page || false
      },
      data: results.map((item, index) => this.normalizeAnimeItem(item, (page - 1) * pageSize + index + 1)),
      source: 'jikan'
    };
  }

  normalizeAnimeItem(anime, position = null) {
    const sourceId = String(anime.mal_id);

    return {
      id: `mal:anime:${sourceId}`,
      sourceId,
      malId: anime.mal_id,
      provider: 'jikan',
      type: 'anime',
      resourceType: anime.type?.toLowerCase() || 'anime',
      position,

      title: anime.title,
      titleEnglish: anime.title_english,
      titleJapanese: anime.title_japanese,
      titleAlternatives: anime.titles?.map(t => ({ type: t.type, title: t.title })) || [],
      
      synopsis: anime.synopsis,
      
      poster: this.extractImage(anime.images),
      images: this.extractAllImages(anime.images),
      trailer: anime.trailer?.url || null,
      trailerEmbed: anime.trailer?.embed_url || null,
      
      format: anime.type,
      source: anime.source,
      episodes: anime.episodes,
      status: anime.status,
      airing: anime.airing,
      
      aired: {
        from: anime.aired?.from,
        to: anime.aired?.to,
        string: anime.aired?.string
      },
      
      duration: anime.duration,
      rating: this.normalizeRating(anime.rating),
      
      score: anime.score,
      scoredBy: anime.scored_by,
      rank: anime.rank,
      popularity: anime.popularity,
      members: anime.members,
      favorites: anime.favorites,
      
      season: anime.season,
      year: anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null),
      
      studios: this.extractNames(anime.studios),
      producers: this.extractNames(anime.producers),
      licensors: this.extractNames(anime.licensors),
      
      genres: this.extractNames(anime.genres),
      themes: this.extractNames(anime.themes),
      demographics: this.extractNames(anime.demographics),
      
      src_url: anime.url,
      
      metadata: {
        source: 'jikan',
        malId: anime.mal_id
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECHERCHE MANGA
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeMangaSearchResponse(data, metadata = {}) {
    const { query, page = 1, pageSize = 25, searchType = 'manga' } = metadata;
    const results = data?.data || [];
    const pagination = data?.pagination || {};

    return {
      query,
      searchType,
      total: pagination.items?.total || results.length,
      pagination: {
        page,
        pageSize,
        totalResults: pagination.items?.total || results.length,
        totalPages: pagination.last_visible_page || 1,
        hasMore: pagination.has_next_page || false
      },
      data: results.map((item, index) => this.normalizeMangaItem(item, (page - 1) * pageSize + index + 1)),
      source: 'jikan'
    };
  }

  normalizeMangaItem(manga, position = null) {
    const sourceId = String(manga.mal_id);

    return {
      id: `mal:manga:${sourceId}`,
      sourceId,
      malId: manga.mal_id,
      provider: 'jikan',
      type: 'manga',
      resourceType: manga.type?.toLowerCase() || 'manga',
      position,

      title: manga.title,
      titleEnglish: manga.title_english,
      titleJapanese: manga.title_japanese,
      titleAlternatives: manga.titles?.map(t => ({ type: t.type, title: t.title })) || [],
      
      synopsis: manga.synopsis,
      
      poster: this.extractImage(manga.images),
      images: this.extractAllImages(manga.images),
      
      format: manga.type,
      chapters: manga.chapters,
      volumes: manga.volumes,
      status: manga.status,
      publishing: manga.publishing,
      
      published: {
        from: manga.published?.from,
        to: manga.published?.to,
        string: manga.published?.string
      },
      
      score: manga.score,
      scoredBy: manga.scored_by,
      rank: manga.rank,
      popularity: manga.popularity,
      members: manga.members,
      favorites: manga.favorites,
      
      year: manga.published?.from ? new Date(manga.published.from).getFullYear() : null,
      
      authors: manga.authors?.map(a => ({
        id: a.mal_id,
        name: a.name,
        url: a.url
      })) || [],
      
      serializations: manga.serializations?.map(s => ({
        id: s.mal_id,
        name: s.name,
        url: s.url
      })) || [],
      
      genres: this.extractNames(manga.genres),
      themes: this.extractNames(manga.themes),
      demographics: this.extractNames(manga.demographics),
      
      src_url: manga.url,
      
      metadata: {
        source: 'jikan',
        malId: manga.mal_id
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECHERCHE COMBINÉE
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeCombinedSearchResponse(animeResults, mangaResults, metadata = {}) {
    const { query, page = 1, pageSize = 20 } = metadata;
    
    const animeData = animeResults?.data || [];
    const mangaData = mangaResults?.data || [];
    
    // Fusionner et alterner les résultats
    const combined = [];
    const maxLen = Math.max(animeData.length, mangaData.length);
    
    for (let i = 0; i < maxLen; i++) {
      if (animeData[i]) combined.push(animeData[i]);
      if (mangaData[i]) combined.push(mangaData[i]);
    }
    
    // Mettre à jour les positions
    combined.forEach((item, idx) => {
      item.position = idx + 1;
    });
    
    const totalAnime = animeResults?.total || 0;
    const totalManga = mangaResults?.total || 0;

    return {
      query,
      searchType: 'all',
      total: totalAnime + totalManga,
      breakdown: {
        anime: totalAnime,
        manga: totalManga
      },
      pagination: {
        page,
        pageSize,
        totalResults: totalAnime + totalManga,
        hasMore: (animeResults?.pagination?.hasMore || false) || (mangaResults?.pagination?.hasMore || false)
      },
      data: combined.slice(0, pageSize),
      source: 'jikan'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DÉTAILS ANIME
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeAnimeDetail(anime) {
    const base = this.normalizeAnimeItem(anime);
    
    return {
      ...base,
      
      // Informations supplémentaires du /full
      background: anime.background,
      
      // Relations
      relations: anime.relations?.map(rel => ({
        relation: rel.relation,
        entries: rel.entry?.map(e => ({
          id: e.mal_id,
          type: e.type,
          name: e.name,
          url: e.url
        })) || []
      })) || [],
      
      // Thèmes musicaux
      openingThemes: anime.theme?.openings || [],
      endingThemes: anime.theme?.endings || [],
      
      // Streaming
      streaming: anime.streaming?.map(s => ({
        name: s.name,
        url: s.url
      })) || [],
      
      // External links
      externalLinks: anime.external?.map(e => ({
        name: e.name,
        url: e.url
      })) || [],
      
      metadata: {
        ...base.metadata,
        detailLevel: 'full'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DÉTAILS MANGA
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeMangaDetail(manga) {
    const base = this.normalizeMangaItem(manga);
    
    return {
      ...base,
      
      // Informations supplémentaires du /full
      background: manga.background,
      
      // Relations
      relations: manga.relations?.map(rel => ({
        relation: rel.relation,
        entries: rel.entry?.map(e => ({
          id: e.mal_id,
          type: e.type,
          name: e.name,
          url: e.url
        })) || []
      })) || [],
      
      // External links
      externalLinks: manga.external?.map(e => ({
        name: e.name,
        url: e.url
      })) || [],
      
      metadata: {
        ...base.metadata,
        detailLevel: 'full'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉPISODES
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeEpisodesResponse(data, metadata = {}) {
    const { animeId, page = 1 } = metadata;
    const episodes = data?.data || [];
    const pagination = data?.pagination || {};

    return {
      animeId,
      total: pagination.items?.total || episodes.length,
      pagination: {
        page,
        totalPages: pagination.last_visible_page || 1,
        hasMore: pagination.has_next_page || false
      },
      data: episodes.map(ep => ({
        id: ep.mal_id,
        number: ep.mal_id,
        title: ep.title,
        titleJapanese: ep.title_japanese,
        titleRomanji: ep.title_romanji,
        aired: ep.aired,
        filler: ep.filler,
        recap: ep.recap,
        forumUrl: ep.forum_url
      })),
      source: 'jikan'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSONNAGES
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeCharactersResponse(data, metadata = {}) {
    const { animeId, mangaId } = metadata;
    const characters = data?.data || [];

    return {
      animeId,
      mangaId,
      total: characters.length,
      data: characters.map(item => ({
        id: item.character?.mal_id,
        name: item.character?.name,
        image: this.extractImage(item.character?.images),
        url: item.character?.url,
        role: item.role,
        favorites: item.favorites,
        voiceActors: item.voice_actors?.map(va => ({
          id: va.person?.mal_id,
          name: va.person?.name,
          image: this.extractImage(va.person?.images),
          language: va.language
        })) || []
      })),
      source: 'jikan'
    };
  }

  normalizeCharactersSearchResponse(data, metadata = {}) {
    const { query, page = 1, pageSize = 25 } = metadata;
    const results = data?.data || [];
    const pagination = data?.pagination || {};

    return {
      query,
      searchType: 'characters',
      total: pagination.items?.total || results.length,
      pagination: {
        page,
        pageSize,
        totalResults: pagination.items?.total || results.length,
        totalPages: pagination.last_visible_page || 1,
        hasMore: pagination.has_next_page || false
      },
      data: results.map((item, index) => ({
        id: `mal:character:${item.mal_id}`,
        sourceId: String(item.mal_id),
        malId: item.mal_id,
        provider: 'jikan',
        type: 'character',
        position: (page - 1) * pageSize + index + 1,
        
        name: item.name,
        nameKanji: item.name_kanji,
        nicknames: item.nicknames || [],
        favorites: item.favorites,
        about: item.about,
        image: this.extractImage(item.images),
        url: item.url
      })),
      source: 'jikan'
    };
  }

  normalizeCharacterDetail(character) {
    return {
      id: `mal:character:${character.mal_id}`,
      sourceId: String(character.mal_id),
      malId: character.mal_id,
      provider: 'jikan',
      type: 'character',
      
      name: character.name,
      nameKanji: character.name_kanji,
      nicknames: character.nicknames || [],
      favorites: character.favorites,
      about: character.about,
      
      image: this.extractImage(character.images),
      images: this.extractAllImages(character.images),
      
      // Apparitions dans les anime
      anime: character.anime?.map(a => ({
        id: a.anime?.mal_id,
        title: a.anime?.title,
        image: this.extractImage(a.anime?.images),
        url: a.anime?.url,
        role: a.role
      })) || [],
      
      // Apparitions dans les manga
      manga: character.manga?.map(m => ({
        id: m.manga?.mal_id,
        title: m.manga?.title,
        image: this.extractImage(m.manga?.images),
        url: m.manga?.url,
        role: m.role
      })) || [],
      
      // Doubleurs
      voiceActors: character.voices?.map(v => ({
        id: v.person?.mal_id,
        name: v.person?.name,
        image: this.extractImage(v.person?.images),
        language: v.language
      })) || [],
      
      src_url: character.url,
      
      metadata: {
        source: 'jikan',
        malId: character.mal_id
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAFF
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeStaffResponse(data, metadata = {}) {
    const { animeId } = metadata;
    const staff = data?.data || [];

    return {
      animeId,
      total: staff.length,
      data: staff.map(item => ({
        id: item.person?.mal_id,
        name: item.person?.name,
        image: this.extractImage(item.person?.images),
        url: item.person?.url,
        positions: item.positions || []
      })),
      source: 'jikan'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECOMMANDATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeRecommendationsResponse(data, metadata = {}) {
    const { sourceId, type } = metadata;
    const recommendations = data?.data || [];

    return {
      sourceId,
      sourceType: type,
      total: recommendations.length,
      data: recommendations.map(rec => ({
        id: rec.entry?.mal_id,
        malId: rec.entry?.mal_id,
        title: rec.entry?.title,
        image: this.extractImage(rec.entry?.images),
        url: rec.entry?.url,
        votes: rec.votes
      })),
      source: 'jikan'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAISONS
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeSeasonResponse(data, metadata = {}) {
    const { year, season, current, page = 1 } = metadata;
    const results = data?.data || [];
    const pagination = data?.pagination || {};

    return {
      year,
      season,
      current: current || false,
      total: pagination.items?.total || results.length,
      pagination: {
        page,
        totalPages: pagination.last_visible_page || 1,
        hasMore: pagination.has_next_page || false
      },
      data: results.map((item, index) => this.normalizeAnimeItem(item, (page - 1) * 25 + index + 1)),
      source: 'jikan'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOP / CLASSEMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeTopResponse(data, metadata = {}) {
    const { page = 1, contentType = 'anime' } = metadata;
    const results = data?.data || [];
    const pagination = data?.pagination || {};

    const normalizeFunc = contentType === 'anime' 
      ? this.normalizeAnimeItem.bind(this) 
      : this.normalizeMangaItem.bind(this);

    return {
      contentType,
      total: pagination.items?.total || results.length,
      pagination: {
        page,
        totalPages: pagination.last_visible_page || 1,
        hasMore: pagination.has_next_page || false
      },
      data: results.map((item, index) => normalizeFunc(item, (page - 1) * 25 + index + 1)),
      source: 'jikan'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSONNES
  // ═══════════════════════════════════════════════════════════════════════════

  normalizePeopleSearchResponse(data, metadata = {}) {
    const { query, page = 1, pageSize = 25 } = metadata;
    const results = data?.data || [];
    const pagination = data?.pagination || {};

    return {
      query,
      searchType: 'people',
      total: pagination.items?.total || results.length,
      pagination: {
        page,
        pageSize,
        totalResults: pagination.items?.total || results.length,
        totalPages: pagination.last_visible_page || 1,
        hasMore: pagination.has_next_page || false
      },
      data: results.map((item, index) => ({
        id: `mal:person:${item.mal_id}`,
        sourceId: String(item.mal_id),
        malId: item.mal_id,
        provider: 'jikan',
        type: 'person',
        position: (page - 1) * pageSize + index + 1,
        
        name: item.name,
        givenName: item.given_name,
        familyName: item.family_name,
        alternateNames: item.alternate_names || [],
        birthday: item.birthday,
        favorites: item.favorites,
        about: item.about,
        image: this.extractImage(item.images),
        url: item.url
      })),
      source: 'jikan'
    };
  }

  normalizePersonDetail(person) {
    return {
      id: `mal:person:${person.mal_id}`,
      sourceId: String(person.mal_id),
      malId: person.mal_id,
      provider: 'jikan',
      type: 'person',
      
      name: person.name,
      givenName: person.given_name,
      familyName: person.family_name,
      alternateNames: person.alternate_names || [],
      birthday: person.birthday,
      favorites: person.favorites,
      about: person.about,
      websiteUrl: person.website_url,
      
      image: this.extractImage(person.images),
      images: this.extractAllImages(person.images),
      
      // Rôles de doublage
      voiceActing: person.voices?.map(v => ({
        character: {
          id: v.character?.mal_id,
          name: v.character?.name,
          image: this.extractImage(v.character?.images)
        },
        anime: {
          id: v.anime?.mal_id,
          title: v.anime?.title,
          image: this.extractImage(v.anime?.images)
        },
        role: v.role
      })) || [],
      
      // Travail sur anime
      animeStaff: person.anime?.map(a => ({
        id: a.anime?.mal_id,
        title: a.anime?.title,
        image: this.extractImage(a.anime?.images),
        position: a.position
      })) || [],
      
      // Travail sur manga
      mangaStaff: person.manga?.map(m => ({
        id: m.manga?.mal_id,
        title: m.manga?.title,
        image: this.extractImage(m.manga?.images),
        position: m.position
      })) || [],
      
      src_url: person.url,
      
      metadata: {
        source: 'jikan',
        malId: person.mal_id
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTEURS / STUDIOS
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeProducersSearchResponse(data, metadata = {}) {
    const { query, page = 1, pageSize = 25 } = metadata;
    const results = data?.data || [];
    const pagination = data?.pagination || {};

    return {
      query,
      searchType: 'producers',
      total: pagination.items?.total || results.length,
      pagination: {
        page,
        pageSize,
        totalResults: pagination.items?.total || results.length,
        totalPages: pagination.last_visible_page || 1,
        hasMore: pagination.has_next_page || false
      },
      data: results.map((item, index) => ({
        id: `mal:producer:${item.mal_id}`,
        sourceId: String(item.mal_id),
        malId: item.mal_id,
        provider: 'jikan',
        type: 'producer',
        position: (page - 1) * pageSize + index + 1,
        
        name: item.titles?.[0]?.title || item.name,
        titles: item.titles || [],
        established: item.established,
        favorites: item.favorites,
        about: item.about,
        count: item.count,
        image: this.extractImage(item.images),
        url: item.url
      })),
      source: 'jikan'
    };
  }

  normalizeProducerDetail(producer) {
    return {
      id: `mal:producer:${producer.mal_id}`,
      sourceId: String(producer.mal_id),
      malId: producer.mal_id,
      provider: 'jikan',
      type: 'producer',
      
      name: producer.titles?.[0]?.title || producer.name,
      titles: producer.titles || [],
      japaneseName: producer.titles?.find(t => t.type === 'Japanese')?.title,
      
      established: producer.established,
      favorites: producer.favorites,
      about: producer.about,
      count: producer.count,
      
      image: this.extractImage(producer.images),
      images: this.extractAllImages(producer.images),
      
      // Links externes
      externalLinks: producer.external?.map(e => ({
        name: e.name,
        url: e.url
      })) || [],
      
      src_url: producer.url,
      
      metadata: {
        source: 'jikan',
        malId: producer.mal_id
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENRES
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeGenresResponse(data, metadata = {}) {
    const { type } = metadata;
    const genres = data?.data || [];

    return {
      type,
      total: genres.length,
      data: genres.map(g => ({
        id: g.mal_id,
        name: g.name,
        url: g.url,
        count: g.count
      })),
      source: 'jikan'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANNING / SCHEDULES
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeScheduleResponse(data, metadata = {}) {
    const { day, page = 1 } = metadata;
    const results = data?.data || [];
    const pagination = data?.pagination || {};

    return {
      day: day || 'all',
      total: pagination.items?.total || results.length,
      pagination: {
        page,
        totalPages: pagination.last_visible_page || 1,
        hasMore: pagination.has_next_page || false
      },
      data: results.map((item, index) => this.normalizeAnimeItem(item, (page - 1) * 25 + index + 1)),
      source: 'jikan'
    };
  }
}
