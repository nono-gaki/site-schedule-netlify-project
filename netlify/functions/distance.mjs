// 2地点間の移動時間をGoogle Distance Matrix APIで取得する。
// GET /.netlify/functions/distance?origin=...&destination=...
//   -> { minutes: number, distanceText: string, durationText: string }
// APIキーはサーバー側の環境変数 GOOGLE_MAPS_API_KEY のみで使用し、クライアントには渡さない。

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const origin = url.searchParams.get('origin');
  const destination = url.searchParams.get('destination');
  if (!origin || !destination) {
    return new Response(JSON.stringify({ error: 'origin and destination are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiUrl = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    apiUrl.searchParams.set('origins', origin);
    apiUrl.searchParams.set('destinations', destination);
    apiUrl.searchParams.set('mode', 'driving');
    apiUrl.searchParams.set('language', 'ja');
    apiUrl.searchParams.set('region', 'jp');
    apiUrl.searchParams.set('key', apiKey);

    const res = await fetch(apiUrl.toString());
    const data = await res.json();

    const element = data?.rows?.[0]?.elements?.[0];
    if (data.status !== 'OK' || !element || element.status !== 'OK') {
      return new Response(JSON.stringify({ error: 'route not found', status: data.status, elementStatus: element?.status }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      minutes: Math.round(element.duration.value / 60),
      durationText: element.duration.text,
      distanceText: element.distance.text,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = { path: '/.netlify/functions/distance' };
