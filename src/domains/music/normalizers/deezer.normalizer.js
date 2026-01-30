/**
 * Normalizer Deezer
 * 
 * Transforme les réponses Deezer au format Tako standardisé
 * 
 * @module domains/music/normalizers/deezer
 */

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Formate une durée en secondes vers "mm:ss"
 */
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Agrandit l'URL d'une image Deezer
 */
function getLargeImageUrl(url) {
  if (!url) return null;
  return url.replace('/cover/', '/cover/500x500/')
            .replace('/artist/', '/artist/500x500/');
}

// ============================================================================
// SEARCH NORMALIZERS
// ============================================================================

/**
 * Normalise les résultats de recherche d'albums
 */
export function normalizeAlbumSearchResponse(data, query) {
  const results = (data.data || []).map((item, index) => normalizeAlbumSearchItem(item, index + 1));
  
  return {
    query,
    searchType: 'album',
    total: data.total || results.length,
    pagination: {
      page: 1,
      pageSize: results.length,
      totalResults: data.total || results.length,
      hasMore: data.next ? true : false
    },
    data: results
  };
}

/**
 * Normalise un album de recherche
 */
export function normalizeAlbumSearchItem(item, position = null) {
  return {
    id: `deezer:album:${item.id}`,
    sourceId: String(item.id),
    provider: 'deezer',
    type: 'album',
    position,
    
    title: item.title,
    artist: item.artist?.name || null,
    artistId: item.artist?.id ? `deezer:artist:${item.artist.id}` : null,
    
    poster: item.cover_medium || item.cover,
    posterLarge: item.cover_xl || item.cover_big,
    images: [
      { type: 'small', url: item.cover_small || item.cover },
      { type: 'medium', url: item.cover_medium || item.cover },
      { type: 'large', url: item.cover_big },
      { type: 'xl', url: item.cover_xl }
    ].filter(img => img.url),
    
    trackCount: item.nb_tracks || null,
    explicit: item.explicit_lyrics || false,
    
    url: item.link
  };
}

/**
 * Normalise les résultats de recherche d'artistes
 */
export function normalizeArtistSearchResponse(data, query) {
  const results = (data.data || []).map((item, index) => normalizeArtistSearchItem(item, index + 1));
  
  return {
    query,
    searchType: 'artist',
    total: data.total || results.length,
    pagination: {
      page: 1,
      pageSize: results.length,
      totalResults: data.total || results.length,
      hasMore: data.next ? true : false
    },
    data: results
  };
}

/**
 * Normalise un artiste de recherche
 */
export function normalizeArtistSearchItem(item, position = null) {
  return {
    id: `deezer:artist:${item.id}`,
    sourceId: String(item.id),
    provider: 'deezer',
    type: 'artist',
    position,
    
    name: item.name,
    
    image: item.picture_medium || item.picture,
    imageLarge: item.picture_xl || item.picture_big,
    images: [
      { type: 'small', url: item.picture_small || item.picture },
      { type: 'medium', url: item.picture_medium || item.picture },
      { type: 'large', url: item.picture_big },
      { type: 'xl', url: item.picture_xl }
    ].filter(img => img.url),
    
    nbAlbums: item.nb_album || null,
    nbFans: item.nb_fan || null,
    
    url: item.link
  };
}

/**
 * Normalise les résultats de recherche de tracks
 */
export function normalizeTrackSearchResponse(data, query) {
  const results = (data.data || []).map((item, index) => normalizeTrackSearchItem(item, index + 1));
  
  return {
    query,
    searchType: 'track',
    total: data.total || results.length,
    pagination: {
      page: 1,
      pageSize: results.length,
      totalResults: data.total || results.length,
      hasMore: data.next ? true : false
    },
    data: results
  };
}

/**
 * Normalise un track de recherche
 */
export function normalizeTrackSearchItem(item, position = null) {
  return {
    id: `deezer:track:${item.id}`,
    sourceId: String(item.id),
    provider: 'deezer',
    type: 'track',
    position,
    
    title: item.title,
    artist: item.artist?.name || null,
    artistId: item.artist?.id ? `deezer:artist:${item.artist.id}` : null,
    album: item.album?.title || null,
    albumId: item.album?.id ? `deezer:album:${item.album.id}` : null,
    
    duration: item.duration || null,
    durationFormatted: item.duration ? formatDuration(item.duration) : null,
    
    poster: item.album?.cover_medium || item.album?.cover,
    preview: item.preview || null,
    explicit: item.explicit_lyrics || false,
    rank: item.rank || null,
    
    url: item.link
  };
}

// ============================================================================
// DETAIL NORMALIZERS
// ============================================================================

/**
 * Normalise les détails d'un album
 */
export function normalizeAlbumDetail(album) {
  const tracks = (album.tracks?.data || []).map((t, idx) => ({
    position: idx + 1,
    id: `deezer:track:${t.id}`,
    sourceId: String(t.id),
    title: t.title,
    duration: t.duration || null,
    durationFormatted: t.duration ? formatDuration(t.duration) : null,
    preview: t.preview || null,
    explicit: t.explicit_lyrics || false
  }));
  
  const contributors = (album.contributors || []).map(c => ({
    id: `deezer:artist:${c.id}`,
    sourceId: String(c.id),
    name: c.name,
    role: c.role || null,
    image: c.picture_medium || c.picture
  }));
  
  return {
    id: `deezer:album:${album.id}`,
    sourceId: String(album.id),
    provider: 'deezer',
    type: 'album',
    
    title: album.title,
    upc: album.upc || null,
    
    artist: album.artist?.name || null,
    artistId: album.artist?.id ? `deezer:artist:${album.artist.id}` : null,
    artistImage: album.artist?.picture_medium || null,
    
    releaseDate: album.release_date || null,
    year: album.release_date?.substring(0, 4) || null,
    
    genres: (album.genres?.data || []).map(g => g.name),
    label: album.label || null,
    
    duration: album.duration || null,
    durationFormatted: album.duration ? formatDuration(album.duration) : null,
    
    tracks,
    trackCount: album.nb_tracks || tracks.length,
    
    contributors,
    
    explicit: album.explicit_lyrics || false,
    fans: album.fans || 0,
    
    poster: album.cover_medium || album.cover,
    posterLarge: album.cover_xl || album.cover_big,
    images: [
      { type: 'small', url: album.cover_small || album.cover },
      { type: 'medium', url: album.cover_medium || album.cover },
      { type: 'large', url: album.cover_big },
      { type: 'xl', url: album.cover_xl }
    ].filter(img => img.url),
    
    url: album.link
  };
}

/**
 * Normalise les détails d'un artiste
 */
export function normalizeArtistDetail(artist, topTracks = [], albums = []) {
  const normalizedTopTracks = (topTracks.data || topTracks || []).map((t, idx) => ({
    position: idx + 1,
    id: `deezer:track:${t.id}`,
    sourceId: String(t.id),
    title: t.title,
    duration: t.duration || null,
    durationFormatted: t.duration ? formatDuration(t.duration) : null,
    album: t.album?.title || null,
    albumCover: t.album?.cover_medium || null,
    preview: t.preview || null,
    rank: t.rank || null
  }));
  
  const normalizedAlbums = (albums.data || albums || []).map((a, idx) => ({
    position: idx + 1,
    id: `deezer:album:${a.id}`,
    sourceId: String(a.id),
    title: a.title,
    poster: a.cover_medium || a.cover,
    releaseDate: a.release_date || null,
    year: a.release_date?.substring(0, 4) || null,
    type: a.record_type || 'album'
  }));
  
  return {
    id: `deezer:artist:${artist.id}`,
    sourceId: String(artist.id),
    provider: 'deezer',
    type: 'artist',
    
    name: artist.name,
    
    image: artist.picture_medium || artist.picture,
    imageLarge: artist.picture_xl || artist.picture_big,
    images: [
      { type: 'small', url: artist.picture_small || artist.picture },
      { type: 'medium', url: artist.picture_medium || artist.picture },
      { type: 'large', url: artist.picture_big },
      { type: 'xl', url: artist.picture_xl }
    ].filter(img => img.url),
    
    nbAlbums: artist.nb_album || normalizedAlbums.length,
    nbFans: artist.nb_fan || 0,
    
    topTracks: normalizedTopTracks,
    albums: normalizedAlbums,
    
    url: artist.link
  };
}

/**
 * Normalise les détails d'un track
 */
export function normalizeTrackDetail(track) {
  return {
    id: `deezer:track:${track.id}`,
    sourceId: String(track.id),
    provider: 'deezer',
    type: 'track',
    
    title: track.title,
    
    artist: track.artist?.name || null,
    artistId: track.artist?.id ? `deezer:artist:${track.artist.id}` : null,
    
    album: track.album?.title || null,
    albumId: track.album?.id ? `deezer:album:${track.album.id}` : null,
    albumCover: track.album?.cover_medium || null,
    
    duration: track.duration || null,
    durationFormatted: track.duration ? formatDuration(track.duration) : null,
    
    discNumber: track.disk_number || 1,
    trackNumber: track.track_position || null,
    
    releaseDate: track.release_date || null,
    
    bpm: track.bpm || null,
    gain: track.gain || null,
    
    preview: track.preview || null,
    explicit: track.explicit_lyrics || false,
    
    isrc: track.isrc || null,
    
    contributors: (track.contributors || []).map(c => ({
      id: `deezer:artist:${c.id}`,
      name: c.name,
      role: c.role
    })),
    
    url: track.link
  };
}

/**
 * Normalise les genres
 */
export function normalizeGenres(data) {
  return {
    total: data.data?.length || 0,
    data: (data.data || []).map(g => ({
      id: g.id,
      name: g.name,
      image: g.picture_medium || g.picture
    }))
  };
}

/**
 * Normalise le chart
 */
export function normalizeChart(data, type) {
  const items = (data.data || []).map((item, idx) => {
    if (type === 'albums') {
      return normalizeAlbumSearchItem(item, idx + 1);
    } else if (type === 'artists') {
      return normalizeArtistSearchItem(item, idx + 1);
    } else {
      return normalizeTrackSearchItem(item, idx + 1);
    }
  });
  
  return {
    type,
    total: data.total || items.length,
    data: items
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
  normalizeTrackDetail,
  normalizeGenres,
  normalizeChart
};
