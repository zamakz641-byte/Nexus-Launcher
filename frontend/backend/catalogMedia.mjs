const hosts = ['steamstatic.com', 'steamusercontent.com'];
function officialUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : undefined;
  } catch { return undefined; }
}
export function getCatalogMedia(data) {
  const trailers = (data.movies || []).map(movie => ({
    id: String(movie.id), title: movie.name || 'Trailer',
    url: [movie.mp4?.max, movie.webm?.max, movie.hls_h264, movie.mp4?.['480'], movie.webm?.['480']].map(officialUrl).find(Boolean),
    poster: officialUrl(movie.thumbnail),
  })).filter(movie => movie.url);
  const screenshots = [...new Set((data.screenshots || []).map(image => officialUrl(image.path_full)).filter(Boolean))];
  return { trailers, screenshots };
}
