/**
 * Google Books Normalizer
 * 
 * Transforme les données de l'API Google Books vers le format Tako.
 */

import { BaseNormalizer } from '../../../core/normalizers/index.js';

export class GoogleBooksNormalizer extends BaseNormalizer {
  constructor() {
    super({
      source: 'googlebooks',
      type: 'book',
      domain: 'books',
      includeRaw: false
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION DE RECHERCHE
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeSearchResponse(books, metadata = {}) {
    const { query, searchType, total, pagination, lang } = metadata;

    return {
      query,
      searchType,
      total,
      pagination: pagination || {
        page: 1,
        pageSize: books.length,
        totalResults: total,
        hasMore: false
      },
      lang,
      data: books.map((book, index) => this.normalizeSearchItem(book, index + 1)),
      source: 'googlebooks'
    };
  }

  normalizeSearchItem(book, position) {
    return {
      sourceId: book.id,
      provider: 'googlebooks',
      type: 'book',

      title: book.title,
      subtitle: book.subtitle || null,
      authors: book.authors || [],
      publisher: book.publisher || null,

      publishedDate: book.publishedDate,
      year: this.extractYear(book.publishedDate),

      categories: book.categories || [],
      language: book.language,

      isbn: book.isbn,
      isbn10: book.isbn10,
      isbn13: book.isbn13,

      pageCount: book.pageCount,

      src_url: book.infoLink,
      src_image_url: book.coverUrl,

      metadata: {
        position,
        previewLink: book.previewLink,
        source: 'googlebooks'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALISATION DE DÉTAILS
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeDetailResponse(book, options = {}) {
    const { lang } = options;

    return {
      sourceId: book.id,
      provider: 'googlebooks',
      type: 'book',

      // Titre
      title: book.title,
      subtitle: book.subtitle || null,
      fullTitle: book.subtitle ? `${book.title}: ${book.subtitle}` : book.title,

      // Auteurs et éditeur
      authors: book.authors || [],
      publisher: book.publisher || null,

      // Dates
      publishedDate: book.publishedDate,
      year: this.extractYear(book.publishedDate),

      // Classification
      categories: book.categories || [],
      language: book.language,

      // Identifiants
      isbn: book.isbn,
      isbn10: book.isbn10,
      isbn13: book.isbn13,
      identifiers: book.identifiers || {},

      // Contenu
      pageCount: book.pageCount,
      description: book.description || null,
      synopsis: book.description || null,

      // Images
      images: this.normalizeImages(book),

      // URLs
      src_url: book.infoLink,
      googlebooks_url: book.infoLink,
      previewLink: book.previewLink,

      // Évaluations
      rating: book.averageRating ? {
        value: book.averageRating,
        count: book.ratingsCount || 0
      } : null,

      // Métadonnées
      printType: book.printType,
      maturityRating: book.maturityRating,

      metadata: {
        source: 'googlebooks',
        lang
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  extractYear(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
  }

  normalizeImages(book) {
    const images = [];

    if (book.coverUrl) {
      images.push({
        url: book.coverUrl,
        type: 'primary',
        size: 'large'
      });
    }

    if (book.covers) {
      const sizes = ['extraLarge', 'large', 'medium', 'small', 'thumbnail'];
      for (const size of sizes) {
        if (book.covers[size] && book.covers[size] !== book.coverUrl) {
          images.push({
            url: book.covers[size],
            type: 'cover',
            size
          });
        }
      }
    }

    return images;
  }
}

export default GoogleBooksNormalizer;
