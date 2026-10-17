const PLAYER_ORIGIN = 'https://api.codespecters.com';

function htmlPage(title, body, status = 200) {
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#08080d;color:#f5f3ff;font:14px system-ui,sans-serif}
    .message{height:100%;display:grid;place-items:center;padding:24px;text-align:center;color:#c8c4d8}
    iframe{display:block;width:100%;height:100%;border:0;background:#000}
  </style>
</head>
<body>${body}</body>
</html>`, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-src https://api.codespecters.com; base-uri 'none'; form-action 'none'"
    }
  });
}

export async function onRequestGet({ request, env }) {
  const key = env.NEXSTREAM_API_KEY;
  if (!key) {
    return htmlPage(
      'NexStream setup required',
      '<div class="message"><div><h2>NexStream is not configured yet</h2><p>Add NEXSTREAM_API_KEY in Cloudflare Pages → Settings → Variables and Secrets, then redeploy.</p></div></div>',
      503
    );
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || '';
  const id = url.searchParams.get('id') || '';
  const season = url.searchParams.get('season') || '1';
  const episode = url.searchParams.get('episode') || '1';

  if (!/^\d+$/.test(id) || !['movie', 'tv'].includes(type)) {
    return htmlPage(
      'Invalid player request',
      '<div class="message"><div><h2>Invalid player request</h2><p>Return to CineVerse and select a movie or TV episode.</p></div></div>',
      400
    );
  }

  let playerPath = `/embed/movie/${id}`;
  if (type === 'tv') {
    if (!/^\d+$/.test(season) || !/^\d+$/.test(episode)) {
      return htmlPage(
        'Invalid episode',
        '<div class="message"><div><h2>Invalid episode</h2><p>Choose a valid season and episode.</p></div></div>',
        400
      );
    }
    playerPath = `/embed/tv/${id}/${season}/${episode}`;
  }

  const playerUrl = new URL(playerPath, PLAYER_ORIGIN);
  playerUrl.searchParams.set('apikey', key);

  // The provider requires its API key in the embed URL. Keep it out of the
  // React bundle; also domain-lock the key in the provider dashboard.
  return htmlPage(
    'CineVerse Player',
    `<iframe src="${playerUrl.href}" title="NexStream video player" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin"></iframe>`
  );
}
