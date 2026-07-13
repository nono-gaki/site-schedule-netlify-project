// HRMOS勤怠APIの共通クライアント。hrmos.mjs（手動取得）とhrmos-sync-scheduled.mjs（毎日自動同期）で共有する。

export async function getHrmosToken(secretKey, base) {
  const tokenRes = await fetch(`${base}/authentication/token`, {
    method: 'GET',
    headers: { Authorization: `Basic ${secretKey}` },
  });
  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    const err = new Error('HRMOS token request failed');
    err.status = tokenRes.status;
    err.detail = detail;
    throw err;
  }
  const { token } = await tokenRes.json();
  return token;
}

export async function fetchPaginated(base, token, path) {
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

// 日次レコードのHRMOS算出済み残業時間（"H:MM"形式）を分に変換する
export function hrmosOvertimeMinutes(rec) {
  const t = rec.total_over_work_time;
  if (!t) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
