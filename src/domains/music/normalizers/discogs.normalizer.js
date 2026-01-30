/**
 * Normalizer Discogs
 * 
 * Transforme les réponses Discogs au format Tako standardisé
 * 
 * @module domains/music/normalizers/discogs
 */

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extrait l'artiste principal d'un titre Discogs
 */
function extractArtistFromTitle(title) {
  if (!title) return null;
  const parts = title.split(' - ');
  return parts.length > 1 ? parts[0].trim() : null;
}

/**
 * Extrait le titre d'album d'un titre Discogs
 */
function extractAlbumFromTitle(title) {
  if (!title) return title;
  const parts = title.split(' - ');
  return parts.length > 1 ? parts.slice(1).join(' - ').trim() : title;
}

/**
 * Formate une durée "mm:ss" en secondes
 */
function parseDuration(duration) {
  if (!duration) return null;
  const parts = duration.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return null;
}

// ============================================================================
// SEARCH NORMALIZERS
// ============================================================================

/**
 * Normalise les résultats de recherche Discogs
 */
export function normalizeSearchResponse(data, query, searchType = 'release') {
  const results = (data.results || []).map((item, index) => normalizeSearchItem(item, index + 1));
  
  return {
    query,
    searchType,
    total: data.pagination?.items || results.length,
    pagination: {
      page: data.pagination?.page || 1,
      pageSize: data.pagination?.per_page || 25,
      totalResults: data.pagination?.items || results.length,
      totalPages: data.pagination?.pages || 1,
      hasMore: (data.pagination?.page || 1) < (data.pagination?.pages || 1)
    },
    data: results
  };
}

/**
 * Normalise un item de recherche
 */
export function normalizeSearchItem(item, position = null) {
  const isArtist = item.type === 'artist';
  const isLabel = item.type === 'label';
  
  if (isArtist) {
    return {
      id: `discogs:artist:${item.id}`,
      sourceId: String(item.id),
      provider: 'discogs',
      type: 'artist',
      position,
      name: item.title,
      image: item.cover_image || item.thumb,
      url: item.uri ? `https://www.discogs.com${item.uri}` : null
    };
  }
  
  if (isLabel) {
    return {
      id: `discogs:label:${item.id}`,
      sourceId: String(item.id),
      provider: 'discogs',
      type: 'label',
      position,
      name: item.title,
      image: item.cover_image || item.thumb,
      url: item.uri ? `https://www.discogs.com${item.uri}` : null
    };
  }
  
  // Release ou Master
  return {
    id: `discogs:${item.type}:${item.id}`,
    sourceId: String(item.id),
    masterId: item.master_id ? String(item.master_id) : null,
    provider: 'discogs',
    type: 'album',
    resourceType: item.type, // release, master
    position,
    title: extractAlbumFromTitle(item.title),
    artist: extractArtistFromTitle(item.title),
    year: item.year || null,
    country: item.country || null,
    poster: item.cover_image || item.thumb,
    images: item.cover_image ? [{ type: 'cover', url: item.cover_image }] : [],
    formats: item.format || [],
    genres: item.genre || [],
    styles: item.style || [],
    labels: item.label || [],
    url: item.uri ? `https://www.discogs.com${item.uri}` : null
  };
}

// ============================================================================
// DETAIL NORMALIZERS
// ============================================================================

/**
 * Normalise les détails d'une release
 */
export function normalizeReleaseDetail(release) {
  const artists = (release.artists || []).map(a => ({
    id: `discogs:artist:${a.id}`,
    sourceId: String(a.id),
    name: a.name,
    role: a.role || 'Main'
  }));
  
  const tracks = (release.tracklist || []).map((t, idx) => ({
    position: t.position || String(idx + 1),
    title: t.title,
    duration: t.duration || null,
    durationSeconds: parseDuration(t.duration),
    artists: t.artists?.map(a => a.name) || null
  }));
  
  const images = (release.images || []).map(img => ({
    type: img.type,
    url: img.uri,
    thumbnail: img.uri150
  }));
  
  return {
    id: `discogs:release:${release.id}`,
    sourceId: String(release.id),
    masterId: release.master_id ? String(release.master_id) : null,
    provider: 'discogs',
    type: 'album',
    resourceType: 'release',
    
    title: release.title,
    artists,
    artist: artists.map(a => a.name).join(', '),
    
    year: release.year || null,
    releaseDate: release.released || null,
    country: release.country || null,
    
    genres: release.genres || [],
    styles: release.styles || [],
    
    formats: (release.formats || []).map(f => ({
      name: f.name,
      qty: f.qty,
      descriptions: f.descriptions || []
    })),
    
    labels: (release.labels || []).map(l => ({
      id: `discogs:label:${l.id}`,
      sourceId: String(l.id),
      name: l.name,
      catalogNumber: l.catno
    })),
    
    tracks,
    trackCount: tracks.length,
    
    notes: release.notes || null,
    
    images,
    poster: images.find(i => i.type === 'primary')?.url || images[0]?.url || null,
    
    community: release.community ? {
      have: release.community.have,
      want: release.community.want,
      rating: release.community.rating?.average,
      ratingCount: release.community.rating?.count
    } : null,
    
    identifiers: (release.identifiers || []).map(id => ({
      type: id.type,
      value: id.value
    })),
    
    url: release.uri,
    resourceUrl: release.resource_url
  };
}

/**
 * Normalise les détails d'un master
 */
export function normalizeMasterDetail(master) {
  const artists = (master.artists || []).map(a => ({
    id: `discogs:artist:${a.id}`,
    sourceId: String(a.id),
    name: a.name,
    role: a.role || 'Main'
  }));
  
  const tracks = (master.tracklist || []).map((t, idx) => ({
    position: t.position || String(idx + 1),
    title: t.title,
    duration: t.duration || null,
    durationSeconds: parseDuration(t.duration)
  }));
  
  const images = (master.images || []).map(img => ({
    type: img.type,
    url: img.uri,
    thumbnail: img.uri150
  }));
  
  return {
    id: `discogs:master:${master.id}`,
    sourceId: String(master.id),
    provider: 'discogs',
    type: 'album',
    resourceType: 'master',
    
    title: master.title,
    artists,
    artist: artists.map(a => a.name).join(', '),
    
    year: master.year || null,
    
    genres: master.genres || [],
    styles: master.styles || [],
    
    tracks,
    trackCount: tracks.length,
    
    images,
    poster: images.find(i => i.type === 'primary')?.url || images[0]?.url || null,
    
    versionsCount: master.num_for_sale || 0,
    mainReleaseId: master.main_release ? String(master.main_release) : null,
    
    url: master.uri,
    resourceUrl: master.resource_url
  };
}

/**
 * Normalise les détails d'un artiste
 */
export function normalizeArtistDetail(artist) {
  const images = (artist.images || []).map(img => ({
    type: img.type,
    url: img.uri,
    thumbnail: img.uri150
  }));
  
  const members = (artist.members || []).map(m => ({
    id: `discogs:artist:${m.id}`,
    sourceId: String(m.id),
    name: m.name,
    active: m.active
  }));
  
  const aliases = (artist.aliases || []).map(a => ({
    id: `discogs:artist:${a.id}`,
    sourceId: String(a.id),
    name: a.name
  }));
  
  return {
    id: `discogs:artist:${artist.id}`,
    sourceId: String(artist.id),
    provider: 'discogs',
    type: 'artist',
    
    name: artist.name,
    realName: artist.realname || null,
    profile: artist.profile || null,
    
    images,
    image: images.find(i => i.type === 'primary')?.url || images[0]?.url || null,
    
    members,
    aliases,
    
    urls: artist.urls || [],
    
    url: artist.uri,
    resourceUrl: artist.resource_url
  };
}

/**
 * Normalise les releases d'un artiste
 */
export function normalizeArtistReleases(data, artistId) {
  const releases = (data.releases || []).map((r, idx) => ({
    id: `discogs:${r.type}:${r.id}`,
    sourceId: String(r.id),
    provider: 'discogs',
    type: 'album',
    resourceType: r.type,
    position: idx + 1,
    title: r.title,
    artist: r.artist,
    year: r.year || null,
    poster: r.thumb || null,
    role: r.role,
    format: r.format,
    label: r.label
  }));
  
  return {
    artistId,
    total: data.pagination?.items || releases.length,
    pagination: {
      page: data.pagination?.page || 1,
      pageSize: data.pagination?.per_page || 50,
      totalPages: data.pagination?.pages || 1,
      hasMore: (data.pagination?.page || 1) < (data.pagination?.pages || 1)
    },
    data: releases
  };
}

/**
 * Normalise les détails d'un label
 */
export function normalizeLabelDetail(label) {
  const images = (label.images || []).map(img => ({
    type: img.type,
    url: img.uri,
    thumbnail: img.uri150
  }));
  
  const sublabels = (label.sublabels || []).map(s => ({
    id: `discogs:label:${s.id}`,
    sourceId: String(s.id),
    name: s.name
  }));
  
  return {
    id: `discogs:label:${label.id}`,
    sourceId: String(label.id),
    provider: 'discogs',
    type: 'label',
    
    name: label.name,
    profile: label.profile || null,
    contactInfo: label.contact_info || null,
    
    images,
    image: images.find(i => i.type === 'primary')?.url || images[0]?.url || null,
    
    sublabels,
    parentLabel: label.parent_label ? {
      id: `discogs:label:${label.parent_label.id}`,
      sourceId: String(label.parent_label.id),
      name: label.parent_label.name
    } : null,
    
    urls: label.urls || [],
    
    url: label.uri,
    resourceUrl: label.resource_url
  };
}

/**
 * Normalise une recherche par code-barres
 */
export function normalizeBarcodeSearch(data, barcode) {
  if (!data.results || data.results.length === 0) {
    return {
      found: false,
      barcode,
      provider: 'discogs'
    };
  }
  
  const item = data.results[0];
  
  return {
    found: true,
    barcode,
    provider: 'discogs',
    ...normalizeSearchItem(item, 1)
  };
}

export default {
  normalizeSearchResponse,
  normalizeSearchItem,
  normalizeReleaseDetail,
  normalizeMasterDetail,
  normalizeArtistDetail,
  normalizeArtistReleases,
  normalizeLabelDetail,
  normalizeBarcodeSearch
};
