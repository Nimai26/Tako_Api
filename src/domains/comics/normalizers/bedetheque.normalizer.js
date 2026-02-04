/**
 * Bedetheque Normalizer
 * 
 * Transforme les données scrapées de Bedetheque vers le format Tako.
 */

import { BaseNormalizer } from '../../../core/normalizers/index.js';

export class BedethequeNormalizer extends BaseNormalizer {
  constructor() {
    super({
      source: 'bedetheque',
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
      data: results.map((item, index) => this.normalizeSearchItem(item, index + 1)),
      source: 'bedetheque'
    };
  }

  normalizeSearchItem(item, position) {
    // Déterminer le type de l'item
    const itemType = item.type || 'album';
    
    const normalized = {
      sourceId: String(item.id),
      provider: 'bedetheque',
      type: itemType,
      resourceType: itemType,
      
      src_url: item.url,
      // Ne pas utiliser le drapeau (item.flag) comme image par défaut
      src_image_url: item.image || item.coverUrl || null,

      metadata: {
        position,
        source: 'bedetheque'
      }
    };

    // Propriétés spécifiques par type
    if (itemType === 'author') {
      normalized.name = item.name || item.title;
    } else {
      normalized.title = item.title;
      normalized.serie = item.serie || null;
      normalized.tome = item.tome || null;
      normalized.authors = item.author ? [item.author] : [];
    }

    return normalized;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION DE DÉTAILS
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeAlbumDetail(album) {
    // Construire la liste des auteurs
    const authors = [];
    if (album.scenariste) {
      authors.push({ name: album.scenariste, role: 'scénariste' });
    }
    if (album.dessinateur) {
      authors.push({ name: album.dessinateur, role: 'dessinateur' });
    }
    if (album.coloriste) {
      authors.push({ name: album.coloriste, role: 'coloriste' });
    }

    // Extraire l'année
    const year = this.extractYear(album.dateParution);

    return {
      sourceId: String(album.id),
      provider: 'bedetheque',
      type: 'album',
      resourceType: 'album',

      title: album.title,
      serie: album.serie || null,
      description: album.description,

      authors,
      publisher: album.editeur,

      releaseDate: album.dateParution,
      year,

      isbn: album.isbn,
      pages: album.pages,
      format: album.format,

      src_url: album.url,
      src_image_url: album.coverUrl,

      metadata: {
        detailLevel: 'full',
        source: 'bedetheque',
        language: 'fr'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extrait l'année d'une date
   */
  extractYear(dateStr) {
    if (!dateStr) return null;
    // Chercher un format français (janvier 2024, 01/2024, 2024)
    const match = String(dateStr).match(/(\d{4})/);
    return match ? parseInt(match[1]) : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION DES SÉRIES
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeSerieDetail(serie) {
    return {
      sourceId: String(serie.id),
      provider: 'bedetheque',
      type: 'serie',
      resourceType: 'serie',

      title: serie.title,
      description: serie.description,
      
      genre: serie.genre,
      status: serie.status,
      numberOfAlbums: serie.numberOfAlbums,
      origin: serie.origin,
      
      firstPublished: serie.firstPublished,
      year: this.extractYear(serie.firstPublished),
      
      publisher: serie.publisher,
      authors: serie.authors || [],
      
      src_url: serie.url,
      src_image_url: serie.coverUrl,
      
      recommendations: serie.recommendations || [],

      metadata: {
        detailLevel: 'full',
        source: 'bedetheque',
        language: 'fr'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION DES AUTEURS
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeAuthorDetail(author) {
    return {
      sourceId: String(author.id),
      provider: 'bedetheque',
      type: 'author',
      resourceType: 'author',

      name: author.name,
      biography: author.biography,
      
      birthDate: author.birthDate,
      nationality: author.nationality,
      
      src_url: author.url || `https://www.bedetheque.com/auteur/index/a/${author.id}`,
      src_image_url: author.photoUrl,

      metadata: {
        detailLevel: 'full',
        source: 'bedetheque',
        language: 'fr'
      }
    };
  }
}
