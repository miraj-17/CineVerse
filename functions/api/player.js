const corsHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function onRequestGet({ request, env }) {
  try {
    const apiKey = env.NEXSTREAM_API_KEY;

    if (!apiKey) {
      return json(
        { error: "NEXSTREAM_API_KEY is not configured." },
        503
      );
    }

    const url = new URL(request.url);
    const mediaType = url.searchParams.get("mediaType");
    const id = url.searchParams.get("id");
    const season = url.searchParams.get("season") || "1";
    const episode = url.searchParams.get("episode") || "1";

    if (!["movie", "tv", "anime"].includes(mediaType)) {
      return json({ error: "Invalid mediaType." }, 400);
    }

    if (!id || !/^\d+$/.test(id)) {
      return json({ error: "A valid media ID is required." }, 400);
    }

    if (
      !/^\d+$/.test(season) ||
      !/^\d+$/.test(episode) ||
      Number(season) < 1 ||
      Number(episode) < 1
    ) {
      return json({ error: "Invalid season or episode." }, 400);
    }

    const endpoint = new URL("https://api.codespecters.com");
    const isMovie = mediaType === "movie";

    endpoint.pathname = isMovie
      ? `/embed/movie/${encodeURIComponent(id)}`
      : `/embed/tv/${encodeURIComponent(id)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;

    endpoint.searchParams.set("apikey", apiKey);

    return json({
      playerUrl: endpoint.toString(),
      mediaType,
      id,
      season: isMovie ? null : Number(season),
      episode: isMovie ? null : Number(episode),
    });
  } catch {
    return json({ error: "Unable to create player URL." }, 500);
  }
}