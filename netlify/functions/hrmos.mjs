// HRMOS勤怠(旧IEYASU勤怠)から月次の日次勤怠データを取得する。
// GET /.netlify/functions/hrmos?month=YYYY-MM
//   -> { month, count, records: [...] }
// 認証情報(Secret Key・会社URL)はサーバー側の環境変数のみで使用し、クライアントには渡さない。
//
// 認証フロー:
//   1. Secret KeyでBasic認証し、GET /authentication/token でTokenを取得
//   2. 以降のリクエストは Authorization: Token <token> ヘッダーで認証
//   3. GET /work_outputs/monthly/{month} で指定月の全社員の日次勤怠データを取得（ページネーションあり）

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const secretKey = process.env.HRMOS_SECRET_KEY;
  const companyUrl = process.env.HRMOS_COMPANY_URL || 'lifemarks';
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'HRMOS_SECRET_KEY is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return new Response(JSON.stringify({ error: 'month is required in YYYY-MM format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const base = `https://ieyasu.co/api/${companyUrl}/v1`;

  try {
    // 1. Secret KeyでBasic認証してTokenを取得
    const basicAuth = Buffer.from(`${secretKey}:`).toString('base64');
    const tokenRes = await fetch(`${base}/authentication/token`, {
      method: 'GET',
      headers: { Authorization: `Basic ${basicAuth}` },
    });
    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      return new Response(JSON.stringify({ error: 'HRMOS token request failed', status: tokenRes.status, detail }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { token } = await tokenRes.json();

    // 2. Tokenで月次日次勤怠データを取得（ページネーション対応）
    let records = [];
    let page = 1;
    const limit = 100;
    while (true) {
      const dataRes = await fetch(`${base}/work_outputs/monthly/${month}?limit=${limit}&page=${page}`, {
        method: 'GET',
        headers: { Authorization: `Token ${token}` },
      });
      if (!dataRes.ok) {
        const detail = await dataRes.text();
        return new Response(JSON.stringify({ error: 'HRMOS data request failed', status: dataRes.status, detail }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const chunk = await dataRes.json();
      records = records.concat(chunk);
      if (!Array.isArray(chunk) || chunk.length < limit || page > 50) break;
      page++;
    }

    return new Response(JSON.stringify({ month, count: records.length, records }), {
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

export const config = { path: '/.netlify/functions/hrmos' };
