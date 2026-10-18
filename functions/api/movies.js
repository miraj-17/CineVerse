
const API_BASE = 'https://api.themoviedb.org/3';

const ALLOWED_ORIGINS = new Set([
  'https://localhost',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://cineverse-49q.pages.dev'
]);

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const headers = new Headers();

  if (ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }

  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');

  return headers;
}

function jsonResponse(request, data, status = 200, extraHeaders = {}) {
  const headers = corsHeaders(request);

  headers.set('Content-Type', 'application/json; charset=utf-8');

  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }

  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}

export async function onRequestOptions({ request }) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request)
  });
}

export async function onRequestGet({ request, env }) {
  const apiKey = env.TMDB_API_KEY;

  if (!apiKey) {
    return jsonResponse(
      request,
      { error: 'TMDB API key is not configured.' },
      500
    );
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'trending';
  const query = url.searchParams.get('query') || '';
  const id = url.searchParams.get('id');
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);

  const params = new URLSearchParams({
    api_key: apiKey,
    language: 'en-US',
    page: String(page)
  });

  let path;

  switch (type) {
    case 'trending':
      path = '/trending/movie/week';
      break;

    case 'popular':
      path = '/movie/popular';
      break;

    case 'genres':
      path = '/genre/movie/list';
      break;

    case 'search':
      if (!query.trim()) {
        return jsonResponse(request, { results: [] });
      }
      path = '/search/movie';
      params.set('query', query.trim());
      break;

    case 'details':
      if (!id || !/^\d+$/.test(id)) {
        return jsonResponse(
          request,
          { error: 'A valid movie ID is required.' },
          400
        );
      }
      path = `/movie/${id}`;
      params.set('append_to_response', 'videos,credits');
      break;

    case 'tv':
    case 'trending-tv':
      path = '/trending/tv/week';
      break;

    case 'popular-tv':
      path = '/tv/popular';
      break;

    case 'genres-tv':
      path = '/genre/tv/list';
      break;

    case 'search-tv':
      if (!query.trim()) {
        return jsonResponse(request, { results: [] });
      }
      path = '/search/tv';
      params.set('query', query.trim());
      break;

    case 'details-tv':
      if (!id || !/^\d+$/.test(id)) {
        return jsonResponse(
          request,
          { error: 'A valid TV series ID is required.' },
          400
        );
      }
      path = `/tv/${id}`;
      params.set(
        'append_to_response',
        'videos,credits,aggregate_credits'
      );
      break;

    case 'anime-movies':
      path = '/discover/movie';
      params.set('with_genres', '16');
      params.set('with_original_language', 'ja');
      params.set('sort_by', 'popularity.desc');
      params.set('include_adult', 'false');
      break;

    case 'search-anime-movies':
      if (!query.trim()) {
        return jsonResponse(request, { results: [] });
      }
      path = '/search/movie';
      params.set('query', query.trim());
      params.set('include_adult', 'false');
      break;

    case 'anime-series':
      path = '/discover/tv';
      params.set('with_genres', '16');
      params.set('with_original_language', 'ja');
      params.set('sort_by', 'popularity.desc');
      break;

    case 'search-anime-series':
      if (!query.trim()) {
        return jsonResponse(request, { results: [] });
      }
      path = '/search/tv';
      params.set('query', query.trim());
      break;

    case 'season': {
      const season = url.searchParams.get('season');

      if (
        !id ||
        !/^\d+$/.test(id) ||
        season === null ||
        !/^\d+$/.test(season)
      ) {
        return jsonResponse(
          request,
          { error: 'A valid TV ID and season number are required.' },
          400
        );
      }

      path = `/tv/${id}/season/${season}`;
      break;
    }

    case 'episode': {
      const season = url.searchParams.get('season');
      const episode = url.searchParams.get('episode');

      if (
        !id ||
        !/^\d+$/.test(id) ||
        season === null ||
        !/^\d+$/.test(season) ||
        episode === null ||
        !/^\d+$/.test(episode)
      ) {
        return jsonResponse(
          request,
          {
            error: 'A valid TV ID, season and episode are required.'
          },
          400
        );
      }

      path = `/tv/${id}/season/${season}/episode/${episode}`;
      break;
    }

    default:
      return jsonResponse(
        request,
        { error: 'Unknown request type.' },
        400
      );
  }

  try {
    const response = await fetch(
      `${API_BASE}${path}?${params.toString()}`
    );

    const data = await response.json();

    if (!response.ok) {
      return jsonResponse(
        request,
        { error: data.status_message || 'TMDB request failed.' },
        response.status
      );
    }

    if (
      type === 'search-anime-movies' ||
      type === 'search-anime-series'
    ) {
      data.results = (data.results || []).filter(
        item =>
          item.original_language === 'ja' &&
          Array.isArray(item.genre_ids) &&
          item.genre_ids.includes(16)
      );
    }

    return jsonResponse(request, data, 200, {
      'Cache-Control': 'public, max-age=300'
    });
  } catch {
    return jsonResponse(
      request,
      { error: 'Unable to connect to TMDB.' },
      502
    );
  }
}
