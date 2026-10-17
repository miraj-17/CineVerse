
const API_BASE = 'https://api.themoviedb.org/3';

export async function onRequestGet({ request, env }) {
  const apiKey = env.TMDB_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'TMDB API key is not configured.' },
      { status: 500 }
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
    // MOVIES
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
        return Response.json({ results: [] });
      }
      path = '/search/movie';
      params.set('query', query.trim());
      break;

    case 'details':
      if (!id || !/^\d+$/.test(id)) {
        return Response.json(
          { error: 'A valid movie ID is required.' },
          { status: 400 }
        );
      }
      path = `/movie/${id}`;
      params.set('append_to_response', 'videos,credits');
      break;

    // TV SERIES
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
        return Response.json({ results: [] });
      }
      path = '/search/tv';
      params.set('query', query.trim());
      break;

    case 'details-tv':
      if (!id || !/^\d+$/.test(id)) {
        return Response.json(
          { error: 'A valid TV series ID is required.' },
          { status: 400 }
        );
      }
      path = `/tv/${id}`;
      params.set(
        'append_to_response',
        'videos,credits,aggregate_credits'
      );
      break;

    // ANIME MOVIES
    case 'anime-movies':
      path = '/discover/movie';
      params.set('with_genres', '16');
      params.set('with_original_language', 'ja');
      params.set('sort_by', 'popularity.desc');
      params.set('include_adult', 'false');
      break;

    case 'search-anime-movies':
      if (!query.trim()) {
        return Response.json({ results: [] });
      }
      path = '/search/movie';
      params.set('query', query.trim());
      params.set('include_adult', 'false');
      break;

    // ANIME SERIES
    case 'anime-series':
      path = '/discover/tv';
      params.set('with_genres', '16');
      params.set('with_original_language', 'ja');
      params.set('sort_by', 'popularity.desc');
      break;

    case 'search-anime-series':
      if (!query.trim()) {
        return Response.json({ results: [] });
      }
      path = '/search/tv';
      params.set('query', query.trim());
      break;

    // TV SEASONS
    case 'season': {
      const season = url.searchParams.get('season');

      if (
        !id ||
        !/^\d+$/.test(id) ||
        season === null ||
        !/^\d+$/.test(season)
      ) {
        return Response.json(
          { error: 'A valid TV ID and season number are required.' },
          { status: 400 }
        );
      }

      path = `/tv/${id}/season/${season}`;
      break;
    }

    // TV EPISODES
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
        return Response.json(
          {
            error:
              'A valid TV ID, season and episode are required.'
          },
          { status: 400 }
        );
      }

      path = `/tv/${id}/season/${season}/episode/${episode}`;
      break;
    }

    default:
      return Response.json(
        { error: 'Unknown request type.' },
        { status: 400 }
      );
  }

  try {
    const response = await fetch(
      `${API_BASE}${path}?${params.toString()}`
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data.status_message || 'TMDB request failed.' },
        { status: response.status }
      );
    }

    // Filter anime search results to Japanese animation.
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

    return Response.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch {
    return Response.json(
      { error: 'Unable to connect to TMDB.' },
      { status: 502 }
    );
  }
}
