/**
 * ComicVine Normalizer
 * 
 * Transforme les données de l'API ComicVine vers le format Tako.
 */

import { BaseNormalizer } from '../../../core/normalizers/index.js';

export class ComicVineNormalizer extends BaseNormalizer {
  constructor() {
    super({
      source: 'comicvine',
      type: 'comic',
      domain: 'comics',
      includeRaw: false
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION DE RECHERCHE
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
      data: results.map((item, index) => this.normalizeSearchItem(item, searchType, index + 1)),
      source: 'comicvine'
    };
  }

  normalizeSearchItem(item, resourceType, position) {
    // Dispatcher selon le type de ressource
    switch (resourceType) {
      case 'issue':
        return this.normalizeIssueItem(item, position);
      case 'character':
        return this.normalizeCharacterItem(item, position);
      case 'publisher':
        return this.normalizePublisherItem(item, position);
      case 'person':
        return this.normalizeCreatorItem(item, position);
      case 'volume':
      default:
        return this.normalizeVolumeItem(item, position);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VOLUMES (SÉRIES)
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeVolumeItem(volume, position = null) {
    return {
      sourceId: String(volume.id),
      provider: 'comicvine',
      type: 'volume',
      resourceType: 'volume',

      title: volume.name,
      description: this.cleanHtml(volume.deck),
      
      startYear: volume.start_year,
      year: volume.start_year ? parseInt(volume.start_year) : null,
      
      publisher: volume.publisher?.name || null,
      publisherId: volume.publisher?.id || null,
      
      issueCount: volume.count_of_issues || 0,

      src_url: volume.site_detail_url,
      src_image_url: this.extractImage(volume.image),

      metadata: {
        position,
        apiDetailUrl: volume.api_detail_url,
        source: 'comicvine'
      }
    };
  }

  normalizeVolumeDetail(volume, options = {}) {
    const base = this.normalizeVolumeItem(volume);

    const data = {
      ...base,
      id: `${this.source}:${base.sourceId}`,
      source: this.source,
      description: this.cleanHtml(volume.description) || base.description,
      aliases: this.parseAliases(volume.aliases),
      
      firstIssue: volume.first_issue ? {
        id: volume.first_issue.id,
        name: volume.first_issue.name,
        issueNumber: volume.first_issue.issue_number
      } : null,
      
      lastIssue: volume.last_issue ? {
        id: volume.last_issue.id,
        name: volume.last_issue.name,
        issueNumber: volume.last_issue.issue_number
      } : null,

      issues: volume.issues?.map(issue => ({
        id: issue.id,
        name: issue.name,
        issueNumber: issue.issue_number
      })) || [],

      urls: {
        source: base.src_url,
        detail: `/api/${this.domain}/${this.source}/${base.sourceId}`
      },

      metadata: {
        ...base.metadata,
        detailLevel: 'full'
      }
    };

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
  // ISSUES (NUMÉROS)
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeIssueItem(issue, position = null) {
    return {
      sourceId: String(issue.id),
      provider: 'comicvine',
      type: 'issue',
      resourceType: 'issue',

      title: issue.name || `#${issue.issue_number}`,
      issueNumber: issue.issue_number,
      description: this.cleanHtml(issue.deck),

      coverDate: issue.cover_date,
      storeDate: issue.store_date,
      year: this.extractYear(issue.cover_date),

      volume: issue.volume ? {
        id: issue.volume.id,
        name: issue.volume.name
      } : null,

      src_url: issue.site_detail_url,
      src_image_url: this.extractImage(issue.image),

      metadata: {
        position,
        apiDetailUrl: issue.api_detail_url,
        source: 'comicvine'
      }
    };
  }

  normalizeIssueDetail(issue, options = {}) {
    const base = this.normalizeIssueItem(issue);

    const data = {
      ...base,
      id: `${this.source}:${base.sourceId}`,
      source: this.source,
      description: this.cleanHtml(issue.description) || base.description,

      characters: issue.character_credits?.map(c => ({
        id: c.id,
        name: c.name
      })) || [],

      creators: issue.person_credits?.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role
      })) || [],

      teams: issue.team_credits?.map(t => ({
        id: t.id,
        name: t.name
      })) || [],

      storyArcs: issue.story_arc_credits?.map(sa => ({
        id: sa.id,
        name: sa.name
      })) || [],

      urls: {
        source: base.src_url,
        detail: `/api/${this.domain}/${this.source}/${base.sourceId}`
      },

      metadata: {
        ...base.metadata,
        detailLevel: 'full'
      }
    };

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

  normalizeIssuesList(issues, metadata = {}) {
    const { volumeId, total, pagination } = metadata;

    return {
      volumeId,
      total,
      pagination,
      data: issues.map((issue, index) => this.normalizeIssueItem(issue, index + 1)),
      source: 'comicvine'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSONNAGES
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeCharacterItem(character, position = null) {
    return {
      sourceId: String(character.id),
      provider: 'comicvine',
      type: 'character',
      resourceType: 'character',

      name: character.name,
      realName: character.real_name || null,
      description: this.cleanHtml(character.deck),

      publisher: character.publisher?.name || null,
      publisherId: character.publisher?.id || null,

      firstAppearance: character.first_appeared_in_issue ? {
        id: character.first_appeared_in_issue.id,
        name: character.first_appeared_in_issue.name,
        issueNumber: character.first_appeared_in_issue.issue_number
      } : null,

      src_url: character.site_detail_url,
      src_image_url: this.extractImage(character.image),

      metadata: {
        position,
        apiDetailUrl: character.api_detail_url,
        source: 'comicvine'
      }
    };
  }

  normalizeCharacterDetail(character) {
    const base = this.normalizeCharacterItem(character);

    return {
      ...base,
      description: this.cleanHtml(character.description) || base.description,
      aliases: this.parseAliases(character.aliases),
      birth: character.birth,
      gender: this.normalizeGender(character.gender),
      origin: character.origin?.name || null,

      powers: character.powers?.map(p => p.name) || [],
      
      teams: character.teams?.map(t => ({
        id: t.id,
        name: t.name
      })) || [],

      enemies: character.enemies?.map(e => ({
        id: e.id,
        name: e.name
      })) || [],

      friends: character.friends?.map(f => ({
        id: f.id,
        name: f.name
      })) || [],

      metadata: {
        ...base.metadata,
        detailLevel: 'full'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉDITEURS
  // ═══════════════════════════════════════════════════════════════════════════

  normalizePublisherItem(publisher, position = null) {
    return {
      sourceId: String(publisher.id),
      provider: 'comicvine',
      type: 'publisher',
      resourceType: 'publisher',

      name: publisher.name,
      description: this.cleanHtml(publisher.deck),

      location: [publisher.location_city, publisher.location_state]
        .filter(Boolean)
        .join(', ') || null,

      src_url: publisher.site_detail_url,
      src_image_url: this.extractImage(publisher.image),

      metadata: {
        position,
        apiDetailUrl: publisher.api_detail_url,
        source: 'comicvine'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRÉATEURS (PERSONNES)
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeCreatorItem(person, position = null) {
    return {
      sourceId: String(person.id),
      provider: 'comicvine',
      type: 'creator',
      resourceType: 'person',

      name: person.name,
      description: this.cleanHtml(person.deck),

      birth: person.birth || null,
      death: person.death || null,
      hometown: person.hometown || null,
      country: person.country || null,

      issueCount: person.count_of_issue_appearances || 0,

      src_url: person.site_detail_url,
      src_image_url: this.extractImage(person.image),

      metadata: {
        position,
        apiDetailUrl: person.api_detail_url,
        source: 'comicvine'
      }
    };
  }

  normalizeCreatorDetail(person) {
    const base = this.normalizeCreatorItem(person);

    return {
      ...base,
      description: this.cleanHtml(person.description) || base.description,
      aliases: this.parseAliases(person.aliases),
      gender: this.normalizeGender(person.gender),
      website: person.website || null,

      // Compteurs
      volumeCount: person.volume_credits?.length || 0,
      issueCount: person.issue_credits?.length || person.count_of_issue_appearances || 0,
      characterCount: person.created_characters?.length || 0,

      // Personnages créés
      createdCharacters: person.created_characters?.map(c => ({
        id: c.id,
        name: c.name
      })) || [],

      metadata: {
        ...base.metadata,
        detailLevel: 'full'
      }
    };
  }

  normalizeCreatorWorks(volumes, metadata = {}) {
    const { creatorId, total, pagination } = metadata;

    return {
      creatorId,
      total,
      pagination,
      data: volumes.map((vol, index) => ({
        sourceId: String(vol.id),
        provider: 'comicvine',
        type: 'volume',
        resourceType: 'volume',
        
        title: vol.name,
        startYear: vol.start_year,
        year: vol.start_year ? parseInt(vol.start_year) : null,
        
        issueCount: vol.count_of_issues || 0,
        
        src_url: vol.site_detail_url,
        src_image_url: this.extractImage(vol.image),

        metadata: {
          position: index + 1 + ((pagination?.page - 1) * pagination?.pageSize || 0),
          source: 'comicvine'
        }
      })),
      source: 'comicvine'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extrait l'URL de l'image depuis l'objet image ComicVine
   */
  extractImage(imageObj) {
    if (!imageObj) return null;
    // Préférer l'image originale, sinon medium, sinon small
    return imageObj.original_url || imageObj.medium_url || imageObj.small_url || null;
  }

  /**
   * Nettoie le HTML des descriptions
   */
  cleanHtml(html) {
    if (!html) return null;
    return html
      .replace(/<[^>]*>/g, '')           // Supprime les tags HTML
      .replace(/&nbsp;/g, ' ')           // Remplace &nbsp;
      .replace(/&amp;/g, '&')            // Remplace &amp;
      .replace(/&lt;/g, '<')             // Remplace &lt;
      .replace(/&gt;/g, '>')             // Remplace &gt;
      .replace(/&quot;/g, '"')           // Remplace &quot;
      .replace(/&#39;/g, "'")            // Remplace &#39;
      .replace(/\s+/g, ' ')              // Normalise les espaces
      .trim();
  }

  /**
   * Parse les aliases (séparés par \n ou ;)
   */
  parseAliases(aliases) {
    if (!aliases) return [];
    return aliases
      .split(/[\n;]/)
      .map(a => a.trim())
      .filter(a => a.length > 0);
  }

  /**
   * Normalise le genre
   */
  normalizeGender(gender) {
    if (!gender) return null;
    const genderMap = {
      1: 'male',
      2: 'female',
      3: 'other'
    };
    return genderMap[gender] || null;
  }

  /**
   * Extrait l'année d'une date
   */
  extractYear(dateStr) {
    if (!dateStr) return null;
    const match = String(dateStr).match(/^(\d{4})/);
    return match ? parseInt(match[1]) : null;
  }
}
