// HRMOS勤怠(旧IEYASU勤怠)から勤怠データ・ユーザー一覧を取得する。
// GET /.netlify/functions/hrmos?month=YYYY-MM             -> { month, count, records: [...] }（日次勤怠データ）
// GET /.netlify/functions/hrmos?resource=users            -> { count, users: [...] }（ユーザー一覧）
// 認証情報(Secret Key・会社URL)はサーバー側の環境変数のみで使用し、クライアントには渡さない。
//
// 認証フロー:
//   1. Secret KeyでBasic認証し、GET /authentication/token でTokenを取得
//   2. 以降のリクエストは Authorization: Token <token> ヘッダーで認証
//   3. 用途に応じて work_outputs/monthly/{month} または users を取得（いずれもページネーションあり）

async function fetchPaginated(base, token, path) {
  let items = [];
  let page = 1;
  const limit = 100;
  while (true) {
    const res = await fetch(`${base}${path}${path.includes('?') ? '&' : '?'}limit=${limit}&page=${page}`, {
      method: 'GET',
      headers: { Authorization: `Token ${token}` },
    });
    if (!res.ok) {
      const detail = await res.text();
      const err = new Error('HRMOS data request failed');
      err.status = res.status;
      err.detail = detail;
      throw err;
    }
    const chunk = await res.json();
    items = items.concat(chunk);
    if (!Array.isArray(chunk) || chunk.length < limit || page > 50) break;
    page++;
  }
  return items;
}

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
  const resource = url.searchParams.get('resource') || 'work_outputs';
  const month = url.searchParams.get('month');
  if (resource === 'work_outputs' && (!month || !/^\d{4}-\d{2}$/.test(month))) {
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

    // 2. 用途に応じてデータを取得
    if (resource === 'users') {
      const users = await fetchPaginated(base, token, '/users');
      return new Response(JSON.stringify({ count: users.length, users }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const records = await fetchPaginated(base, token, `/work_outputs/monthly/${month}`);
    return new Response(JSON.stringify({ month, count: records.length, records }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err), status: err.status, detail: err.detail }), {
      status: err.status ? 502 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = { path: '/.netlify/functions/hrmos' };
