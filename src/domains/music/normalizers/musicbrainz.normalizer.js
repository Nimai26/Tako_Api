/**
 * Normalizer MusicBrainz
 * 
 * Transforme les réponses MusicBrainz au format Tako standardisé
 * 
 * @module domains/music/normalizers/musicbrainz
 */

const COVER_URL = 'https://coverartarchive.org';

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
 * Extrait les artistes d'un artist-credit
 */
function extractArtists(artistCredit) {
  if (!artistCredit) return [];
  
  return artistCredit.map(ac => ({
    id: ac.artist?.id ? `mb:artist:${ac.artist.id}` : null,
    sourceId: ac.artist?.id || null,
    name: ac.name || ac.artist?.name,
    joinPhrase: ac.joinphrase || ''
  }));
}

/**
 * Extrait le nom d'artiste formaté
 */
function formatArtistName(artistCredit) {
  if (!artistCredit) return null;
  
  return artistCredit.map(ac => {
    const name = ac.name || ac.artist?.name;
    const join = ac.joinphrase || '';
    return name + join;
  }).join('');
}

/**
 * Génère l'URL de pochette
 */
function getCoverUrl(mbid, size = '500') {
  return `${COVER_URL}/release-group/${mbid}/front-${size}`;
}

// ============================================================================
// SEARCH NORMALIZERS
// ============================================================================

/**
 * Normalise les résultats de recherche d'albums
 */
export function normalizeAlbumSearchResponse(data, query) {
  const groups = data['release-groups'] || [];
  const results = groups.map((item, index) => normalizeAlbumSearchItem(item, index + 1));
  
  return {
    query,
    searchType: 'album',
    total: data.count || results.length,
    pagination: {
      page: 1,
      pageSize: results.length,
      totalResults: data.count || results.length,
      hasMore: results.length < (data.count || 0)
    },
    data: results
  };
}

/**
 * Normalise un album de recherche
 */
export function normalizeAlbumSearchItem(item, position = null) {
  const artists = extractArtists(item['artist-credit']);
  
  return {
    id: `mb:album:${item.id}`,
    sourceId: item.id,
    provider: 'musicbrainz',
    type: 'album',
    position,
    
    title: item.title,
    artist: formatArtistName(item['artist-credit']),
    artistId: artists[0]?.sourceId ? `mb:artist:${artists[0].sourceId}` : null,
    artists,
    
    releaseDate: item['first-release-date'] || null,
    year: item['first-release-date']?.substring(0, 4) || null,
    
    primaryType: item['primary-type'] || null,
    secondaryTypes: item['secondary-types'] || [],
    
    score: item.score || null,
    
    poster: getCoverUrl(item.id, '250'),
    posterLarge: getCoverUrl(item.id, '500'),
    
    url: `https://musicbrainz.org/release-group/${item.id}`
  };
}

/**
 * Normalise les résultats de recherche d'artistes
 */
export function normalizeArtistSearchResponse(data, query) {
  const artists = data.artists || [];
  const results = artists.map((item, index) => normalizeArtistSearchItem(item, index + 1));
  
  return {
    query,
    searchType: 'artist',
    total: data.count || results.length,
    pagination: {
      page: 1,
      pageSize: results.length,
      totalResults: data.count || results.length,
      hasMore: results.length < (data.count || 0)
    },
    data: results
  };
}

/**
 * Normalise un artiste de recherche
 */
export function normalizeArtistSearchItem(item, position = null) {
  return {
    id: `mb:artist:${item.id}`,
    sourceId: item.id,
    provider: 'musicbrainz',
    type: 'artist',
    position,
    
    name: item.name,
    sortName: item['sort-name'] || null,
    disambiguation: item.disambiguation || null,
    
    type: item.type || null, // Person, Group, Orchestra, etc.
    country: item.country || null,
    
    beginDate: item['life-span']?.begin || null,
    endDate: item['life-span']?.end || item['life-span']?.ended ? item['life-span']?.end : null,
    active: !item['life-span']?.ended,
    
    score: item.score || null,
    
    tags: (item.tags || []).slice(0, 5).map(t => t.name),
    
    url: `https://musicbrainz.org/artist/${item.id}`
  };
}

// ============================================================================
// DETAIL NORMALIZERS
// ============================================================================

/**
 * Normalise les détails d'un album
 */
export function normalizeAlbumDetail(rg, tracks = []) {
  const artists = extractArtists(rg['artist-credit']);
  
  const releases = (rg.releases || []).slice(0, 10).map(r => ({
    id: `mb:release:${r.id}`,
    sourceId: r.id,
    title: r.title,
    status: r.status || null,
    date: r.date || null,
    country: r.country || null,
    barcode: r.barcode || null
  }));
  
  const normalizedTracks = tracks.map((t, idx) => ({
    position: t.position || idx + 1,
    disc: t.disc || 1,
    title: t.title,
    duration: t.duration ? Math.round(t.duration / 1000) : null,
    durationFormatted: t.duration ? formatDuration(t.duration) : null
  }));
  
  const tags = (rg.tags || [])
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10)
    .map(t => ({ name: t.name, count: t.count }));
  
  return {
    id: `mb:album:${rg.id}`,
    sourceId: rg.id,
    provider: 'musicbrainz',
    type: 'album',
    
    title: rg.title,
    artist: formatArtistName(rg['artist-credit']),
    artists,
    
    releaseDate: rg['first-release-date'] || null,
    year: rg['first-release-date']?.substring(0, 4) || null,
    
    primaryType: rg['primary-type'] || null,
    secondaryTypes: rg['secondary-types'] || [],
    
    tags,
    
    rating: rg.rating ? {
      value: rg.rating.value,
      votes: rg.rating['votes-count']
    } : null,
    
    releases,
    releasesCount: rg.releases?.length || 0,
    
    tracks: normalizedTracks,
    trackCount: normalizedTracks.length,
    
    poster: getCoverUrl(rg.id, '250'),
    posterLarge: getCoverUrl(rg.id, '500'),
    posterXL: getCoverUrl(rg.id, '1200'),
    
    url: `https://musicbrainz.org/release-group/${rg.id}`
  };
}

/**
 * Normalise les détails d'un artiste
 */
export function normalizeArtistDetail(artist) {
  const aliases = (artist.aliases || []).map(a => ({
    name: a.name,
    sortName: a['sort-name'],
    type: a.type,
    locale: a.locale,
    primary: a.primary || false
  }));
  
  const tags = (artist.tags || [])
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10)
    .map(t => ({ name: t.name, count: t.count }));
  
  const releaseGroups = (artist['release-groups'] || []).map((rg, idx) => ({
    position: idx + 1,
    id: `mb:album:${rg.id}`,
    sourceId: rg.id,
    title: rg.title,
    primaryType: rg['primary-type'],
    secondaryTypes: rg['secondary-types'] || [],
    releaseDate: rg['first-release-date'] || null,
    year: rg['first-release-date']?.substring(0, 4) || null,
    poster: getCoverUrl(rg.id, '250')
  }));
  
  return {
    id: `mb:artist:${artist.id}`,
    sourceId: artist.id,
    provider: 'musicbrainz',
    type: 'artist',
    
    name: artist.name,
    sortName: artist['sort-name'] || null,
    disambiguation: artist.disambiguation || null,
    
    artistType: artist.type || null, // Person, Group, etc.
    gender: artist.gender || null,
    country: artist.country || null,
    area: artist.area?.name || null,
    
    beginDate: artist['life-span']?.begin || null,
    endDate: artist['life-span']?.end || null,
    active: !artist['life-span']?.ended,
    
    aliases,
    tags,
    
    rating: artist.rating ? {
      value: artist.rating.value,
      votes: artist.rating['votes-count']
    } : null,
    
    albums: releaseGroups.filter(rg => rg.primaryType === 'Album'),
    eps: releaseGroups.filter(rg => rg.primaryType === 'EP'),
    singles: releaseGroups.filter(rg => rg.primaryType === 'Single'),
    allReleases: releaseGroups,
    
    url: `https://musicbrainz.org/artist/${artist.id}`
  };
}

/**
 * Normalise une recherche par code-barres
 */
export function normalizeBarcodeSearch(data, barcode) {
  const releases = data.releases || [];
  
  if (releases.length === 0) {
    return {
      found: false,
      barcode,
      provider: 'musicbrainz'
    };
  }
  
  const release = releases[0];
  const artists = extractArtists(release['artist-credit']);
  
  return {
    found: true,
    barcode,
    provider: 'musicbrainz',
    
    id: `mb:release:${release.id}`,
    sourceId: release.id,
    releaseGroupId: release['release-group']?.id || null,
    
    title: release.title,
    artist: formatArtistName(release['artist-credit']),
    artists,
    
    date: release.date || null,
    year: release.date?.substring(0, 4) || null,
    country: release.country || null,
    status: release.status || null,
    
    label: release['label-info']?.[0]?.label?.name || null,
    catalogNumber: release['label-info']?.[0]?.['catalog-number'] || null,
    
    poster: release['release-group']?.id 
      ? getCoverUrl(release['release-group'].id, '250')
      : null,
    
    url: `https://musicbrainz.org/release/${release.id}`
  };
}

/**
 * Normalise les albums d'un artiste
 */
export function normalizeArtistAlbums(data, artistId) {
  const groups = data['release-groups'] || [];
  const results = groups.map((rg, idx) => ({
    position: idx + 1,
    id: `mb:album:${rg.id}`,
    sourceId: rg.id,
    title: rg.title,
    primaryType: rg['primary-type'],
    secondaryTypes: rg['secondary-types'] || [],
    releaseDate: rg['first-release-date'] || null,
    year: rg['first-release-date']?.substring(0, 4) || null,
    poster: getCoverUrl(rg.id, '250')
  }));
  
  return {
    artistId,
    total: data['release-group-count'] || results.length,
    pagination: {
      offset: data['release-group-offset'] || 0,
      count: results.length,
      hasMore: results.length < (data['release-group-count'] || 0)
    },
    data: results
  };
}

export default {
  normalizeAlbumSearchResponse,
  normalizeAlbumSearchItem,
  normalizeArtistSearchResponse,
  normalizeArtistSearchItem,
  normalizeAlbumDetail,
  normalizeArtistDetail,
  normalizeBarcodeSearch,
  normalizeArtistAlbums
};
