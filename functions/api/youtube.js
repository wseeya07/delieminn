// Cloudflare Function: Proxy YouTube RSS feed as JSON
const CHANNEL_ID = 'UCvK-ViOVM_cqxhEAzvI-Dag';
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

export async function onRequestGet() {
  try {
    const res = await fetch(RSS_URL, { headers: { 'User-Agent': 'DeliEminn-Site/1.0' } });
    if (!res.ok) return Response.json([], { status: 502 });

    const xml = await res.text();
    const videos = [];
    const entries = xml.split('<entry>').slice(1);

    for (const entry of entries.slice(0, 8)) {
      const id = entry.match(/<yt:videoId>([^<]+)/)?.[1];
      const title = entry.match(/<media:title>([^<]+)/)?.[1]?.trim();
      const thumbnail = entry.match(/<media:thumbnail url="([^"]+)"/)?.[1];
      const published = entry.match(/<published>([^<]+)/)?.[1];
      const views = entry.match(/<media:statistics views="(\d+)"/)?.[1];

      if (id && title) {
        videos.push({ id, title, thumbnail, published, views: Number(views || 0) });
      }
    }

    return Response.json(videos, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch {
    return Response.json([], { status: 500 });
  }
}
