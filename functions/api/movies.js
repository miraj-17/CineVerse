const API_BASE = 'https://api.themoviedb.org/3';

export async function onRequestGet({ request, env }) {
  const apiKey = env.TMDB_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'TMDB_API_KEY is not configured.' },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'trending';
  const query = url.searchParams.get('query') || '';
  const id = url.searchParams.get('id');
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);

  let path;
  const params = new URLSearchParams({
    api_key: apiKey,
    language: 'en-US',
    page: String(page)
  });

  if (type === 'search') {
    if (!query.trim()) {
      return Response.json({ results: [] });
    }
    path = '/search/movie';
    params.set('query', query.trim());
  } else if (type === 'popular') {
    path = '/movie/popular';
  } else if (type === 'genres') {
    path = '/genre/movie/list';
  } else if (type === 'details') {
    if (!id || !/^\d+$/.test(id)) {
      return Response.json(
        { error: 'A valid movie ID is required.' },
        { status: 400 }
      );
    }
    path = `/movie/${id}`;
    params.set('append_to_response', 'videos');
  } else {
    path = '/trending/movie/week';
  }

  try {
    const response = await fetch(
      `${API_BASE}${path}?${params.toString()}`
    );
    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: 'TMDB request failed.' },
        { status: response.status }
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