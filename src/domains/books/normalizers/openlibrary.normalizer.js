/**
 * OpenLibrary Normalizer
 * 
 * Transforme les données de l'API OpenLibrary au format Tako standardisé.
 */

import { BaseNormalizer } from '../../../core/normalizers/index.js';

export class OpenLibraryNormalizer extends BaseNormalizer {
  constructor() {
    super({
      source: 'openlibrary',
      type: 'book',
      domain: 'books',
      includeRaw: false
    });
  }

  /**
   * Normaliser une réponse de recherche
   * @param {Array} books - Liste de livres parsés
   * @param {Object} metadata - Métadonnées de recherche
   */
  normalizeSearchResponse(books, metadata = {}) {
    const { query, searchType, total = 0, pagination = {}, lang = null } = metadata;

    const results = books.map(book => this.normalizeSearchItem(book));

    return {
      meta: {
        source: 'openlibrary',
        query,
        searchType,
        total,
        returned: results.length,
        pagination,
        language: lang,
        timestamp: new Date().toISOString()
      },
      data: results
    };
  }

  /**
   * Normaliser un item de recherche
   * @param {Object} book - Livre parsé
   */
  normalizeSearchItem(book) {
    // Extraire l'année de publication
    let year = null;
    if (book.publishedDate) {
      const match = String(book.publishedDate).match(/\b(19\d{2}|20\d{2})\b/);
      if (match) year = parseInt(match[1], 10);
    }

    // Formater les auteurs
    const authors = (book.authors || []).map(name => ({
      name,
      role: 'author'
    }));

    // Formater les couvertures
    const covers = {
      large: book.images?.[0] || null,
      medium: book.images?.[1] || null,
      small: book.images?.[2] || null
    };

    // Formater les identifiants
    const identifiers = {
      openlibrary: book.id,
      isbn: book.isbn || null
    };

    // Catégories / Sujets
    const categories = (book.subjects || []).slice(0, 10);

    return {
      id: book.id,
      type: 'book',
      title: book.title,
      subtitle: null,
      authors,
      publisher: book.publishers?.[0] || null,
      publishedDate: book.publishedDate,
      year,
      categories,
      language: book.language,
      identifiers,
      covers,
      description: book.synopsis || null,
      pageCount: book.pageCount || null,
      url: book.url,
      source: 'openlibrary'
    };
  }

  /**
   * Normaliser une réponse de détails
   * @param {Object} book - Livre parsé
   * @param {Object} options
   */
  normalizeDetailResponse(book, options = {}) {
    const { lang = null } = options;

    // Extraire l'année de publication
    let year = null;
    if (book.publishedDate) {
      const match = String(book.publishedDate).match(/\b(19\d{2}|20\d{2})\b/);
      if (match) year = parseInt(match[1], 10);
    }

    // Formater les auteurs
    const authors = (book.authors || []).map(name => ({
      name,
      role: 'author'
    }));

    // Formater les couvertures
    const covers = {
      large: book.images?.[0] || null,
      medium: book.images?.[1] || null,
      small: book.images?.[2] || null
    };

    // Formater les identifiants
    const identifiers = {
      openlibrary: book.id,
      isbn: book.isbn || null
    };

    // Catégories / Sujets
    const categories = (book.subjects || []).slice(0, 15);

    // Métadonnées additionnelles spécifiques OpenLibrary
    const additionalMetadata = {};

    if (book.subjectPlaces?.length > 0) {
      additionalMetadata.places = book.subjectPlaces.slice(0, 10);
    }
    if (book.subjectTimes?.length > 0) {
      additionalMetadata.times = book.subjectTimes.slice(0, 10);
    }
    if (book.subjectPeople?.length > 0) {
      additionalMetadata.people = book.subjectPeople.slice(0, 10);
    }
    if (book.links?.length > 0) {
      additionalMetadata.externalLinks = book.links.slice(0, 5).map(link => ({
        title: link.title || 'Link',
        url: link.url
      }));
    }
    if (book.physicalFormat) {
      additionalMetadata.format = book.physicalFormat;
    }
    if (book.workKey) {
      additionalMetadata.workId = book.workKey.replace('/works/', '');
    }
    if (book.allLanguages?.length > 1) {
      additionalMetadata.availableLanguages = book.allLanguages;
    }

    // Construire l'objet data
    const data = {
      id: `${this.source}:${book.id}`,
      sourceId: book.id,
      source: this.source,
      type: book.type || 'book',
      title: book.title,
      subtitle: null,
      authors,
      publishers: book.publishers || [],
      publisher: book.publishers?.[0] || null,
      publishedDate: book.publishedDate,
      year,
      categories,
      language: book.language,
      identifiers,
      covers,
      description: book.synopsis || null,
      pageCount: book.pageCount || null,
      urls: {
        source: book.url,
        detail: `/api/${this.domain}/${this.source}/${book.id}`
      },
      url: book.url,
      provider: 'openlibrary'
    };

    // Ajouter les métadonnées si présentes
    if (Object.keys(additionalMetadata).length > 0) {
      data.metadata = additionalMetadata;
    }

    // Wrapper standardisé
    return {
      success: true,
      provider: this.source,
      domain: this.domain,
      id: data.id,
      data,
      meta: {
        fetchedAt: new Date().toISOString(),
        lang: lang,
        cached: options.cached || false,
        cacheAge: options.cacheAge || null
      }
    };
  }
}

export default OpenLibraryNormalizer;
