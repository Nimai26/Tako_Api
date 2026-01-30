/**
 * Normalizer iTunes
 * 
 * Transforme les réponses iTunes au format Tako standardisé
 * 
 * @module domains/music/normalizers/itunes
 */

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Formate une durée en ms vers "mm:ss"
 */
function formatDuration(ms) {
  if (!ms) return null;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Agrandit l'URL d'une image iTunes
 */
function getLargeImageUrl(url, size = '600x600') {
  if (!url) return null;
  return url.replace('100x100bb', `${size}bb`);
}

// ============================================================================
// SEARCH NORMALIZERS
// ============================================================================

/**
 * Normalise les résultats de recherche d'albums
 */
export function normalizeAlbumSearchResponse(data, query) {
  const albums = (data.results || []).filter(r => r.wrapperType === 'collection');
  const results = albums.map((item, index) => normalizeAlbumSearchItem(item, index + 1));
  
  return {
    query,
    searchType: 'album',
    total: data.resultCount || results.length,
    pagination: {
      page: 1,
      pageSize: results.length,
      totalResults: data.resultCount || results.length,
      hasMore: false
    },
    data: results
  };
}

/**
 * Normalise un album de recherche
 */
export function normalizeAlbumSearchItem(item, position = null) {
  return {
    id: `itunes:album:${item.collectionId}`,
    sourceId: String(item.collectionId),
    provider: 'itunes',
    type: 'album',
    position,
    
    title: item.collectionName,
    artist: item.artistName || null,
    artistId: item.artistId ? `itunes:artist:${item.artistId}` : null,
    
    releaseDate: item.releaseDate || null,
    year: item.releaseDate?.substring(0, 4) || null,
    
    trackCount: item.trackCount || null,
    genre: item.primaryGenreName || null,
    
    explicit: item.collectionExplicitness === 'explicit',
    
    price: item.collectionPrice || null,
    currency: item.currency || null,
    
    poster: item.artworkUrl100,
    posterLarge: getLargeImageUrl(item.artworkUrl100, '600x600'),
    images: [
      { type: 'small', url: item.artworkUrl60 },
      { type: 'medium', url: item.artworkUrl100 },
      { type: 'large', url: getLargeImageUrl(item.artworkUrl100, '600x600') }
    ].filter(img => img.url),
    
    url: item.collectionViewUrl
  };
}

/**
 * Normalise les résultats de recherche d'artistes
 */
export function normalizeArtistSearchResponse(data, query) {
  const artists = (data.results || []).filter(r => r.wrapperType === 'artist');
  const results = artists.map((item, index) => normalizeArtistSearchItem(item, index + 1));
  
  return {
    query,
    searchType: 'artist',
    total: data.resultCount || results.length,
    pagination: {
      page: 1,
      pageSize: results.length,
      totalResults: data.resultCount || results.length,
      hasMore: false
    },
    data: results
  };
}

/**
 * Normalise un artiste de recherche
 */
export function normalizeArtistSearchItem(item, position = null) {
  return {
    id: `itunes:artist:${item.artistId}`,
    sourceId: String(item.artistId),
    provider: 'itunes',
    type: 'artist',
    position,
    
    name: item.artistName,
    genre: item.primaryGenreName || null,
    
    url: item.artistLinkUrl
  };
}

/**
 * Normalise les résultats de recherche de tracks
 */
export function normalizeTrackSearchResponse(data, query) {
  const tracks = (data.results || []).filter(r => r.wrapperType === 'track');
  const results = tracks.map((item, index) => normalizeTrackSearchItem(item, index + 1));
  
  return {
    query,
    searchType: 'track',
    total: data.resultCount || results.length,
    pagination: {
      page: 1,
      pageSize: results.length,
      totalResults: data.resultCount || results.length,
      hasMore: false
    },
    data: results
  };
}

/**
 * Normalise un track de recherche
 */
export function normalizeTrackSearchItem(item, position = null) {
  return {
    id: `itunes:track:${item.trackId}`,
    sourceId: String(item.trackId),
    provider: 'itunes',
    type: 'track',
    position,
    
    title: item.trackName,
    artist: item.artistName || null,
    artistId: item.artistId ? `itunes:artist:${item.artistId}` : null,
    album: item.collectionName || null,
    albumId: item.collectionId ? `itunes:album:${item.collectionId}` : null,
    
    duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : null,
    durationFormatted: item.trackTimeMillis ? formatDuration(item.trackTimeMillis) : null,
    
    trackNumber: item.trackNumber || null,
    discNumber: item.discNumber || 1,
    
    genre: item.primaryGenreName || null,
    releaseDate: item.releaseDate || null,
    
    explicit: item.trackExplicitness === 'explicit',
    
    price: item.trackPrice || null,
    currency: item.currency || null,
    
    preview: item.previewUrl || null,
    
    poster: item.artworkUrl100,
    posterLarge: getLargeImageUrl(item.artworkUrl100, '600x600'),
    
    url: item.trackViewUrl
  };
}

// ============================================================================
// DETAIL NORMALIZERS
// ============================================================================

/**
 * Normalise les détails d'un album (avec tracks)
 */
export function normalizeAlbumDetail(data) {
  const results = data.results || [];
  
  // Premier élément = album, reste = tracks
  const albumInfo = results.find(r => r.wrapperType === 'collection');
  const trackItems = results.filter(r => r.wrapperType === 'track');
  
  if (!albumInfo) {
    throw new Error('Album non trouvé dans les résultats');
  }
  
  const tracks = trackItems.map((t, idx) => ({
    position: t.trackNumber || idx + 1,
    id: `itunes:track:${t.trackId}`,
    sourceId: String(t.trackId),
    title: t.trackName,
    duration: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : null,
    durationFormatted: t.trackTimeMillis ? formatDuration(t.trackTimeMillis) : null,
    discNumber: t.discNumber || 1,
    preview: t.previewUrl || null,
    explicit: t.trackExplicitness === 'explicit',
    price: t.trackPrice || null
  }));
  
  // Calculer la durée totale
  const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  
  return {
    id: `itunes:album:${albumInfo.collectionId}`,
    sourceId: String(albumInfo.collectionId),
    provider: 'itunes',
    type: 'album',
    
    title: albumInfo.collectionName,
    artist: albumInfo.artistName || null,
    artistId: albumInfo.artistId ? `itunes:artist:${albumInfo.artistId}` : null,
    
    releaseDate: albumInfo.releaseDate || null,
    year: albumInfo.releaseDate?.substring(0, 4) || null,
    
    genre: albumInfo.primaryGenreName || null,
    
    tracks,
    trackCount: albumInfo.trackCount || tracks.length,
    discCount: albumInfo.discCount || 1,
    
    duration: totalDuration || null,
    durationFormatted: totalDuration ? formatDuration(totalDuration * 1000) : null,
    
    explicit: albumInfo.collectionExplicitness === 'explicit',
    
    price: albumInfo.collectionPrice || null,
    currency: albumInfo.currency || null,
    
    copyright: albumInfo.copyright || null,
    
    poster: albumInfo.artworkUrl100,
    posterLarge: getLargeImageUrl(albumInfo.artworkUrl100, '600x600'),
    images: [
      { type: 'small', url: albumInfo.artworkUrl60 },
      { type: 'medium', url: albumInfo.artworkUrl100 },
      { type: 'large', url: getLargeImageUrl(albumInfo.artworkUrl100, '600x600') }
    ].filter(img => img.url),
    
    url: albumInfo.collectionViewUrl
  };
}

/**
 * Normalise les détails d'un artiste
 */
export function normalizeArtistDetail(data) {
  const results = data.results || [];
  
  const artistInfo = results.find(r => r.wrapperType === 'artist');
  
  if (!artistInfo) {
    throw new Error('Artiste non trouvé dans les résultats');
  }
  
  return {
    id: `itunes:artist:${artistInfo.artistId}`,
    sourceId: String(artistInfo.artistId),
    provider: 'itunes',
    type: 'artist',
    
    name: artistInfo.artistName,
    genre: artistInfo.primaryGenreName || null,
    
    url: artistInfo.artistLinkUrl
  };
}

/**
 * Normalise les albums d'un artiste
 */
export function normalizeArtistAlbums(data, artistId) {
  const results = data.results || [];
  
  // Premier = artiste, reste = albums
  const albums = results
    .filter(r => r.wrapperType === 'collection')
    .map((item, idx) => normalizeAlbumSearchItem(item, idx + 1));
  
  return {
    artistId,
    total: albums.length,
    pagination: {
      page: 1,
      pageSize: albums.length,
      hasMore: false
    },
    data: albums
  };
}

export default {
  normalizeAlbumSearchResponse,
  normalizeAlbumSearchItem,
  normalizeArtistSearchResponse,
  normalizeArtistSearchItem,
  normalizeTrackSearchResponse,
  normalizeTrackSearchItem,
  normalizeAlbumDetail,
  normalizeArtistDetail,
  normalizeArtistAlbums
};
