// 毎日9:00(JST)にHRMOSの当月残業データを取得し、氏名が一致する人員の overtimeHours を自動更新する。
// Netlify Scheduled Functions はUTCで動くため、cronは "0 0 * * *"（UTC 0:00 = JST 9:00）。

import { getStore } from '@netlify/blobs';
import { getHrmosToken, fetchPaginated, hrmosOvertimeMinutes } from './_lib/hrmos-client.mjs';

export default async () => {
  const secretKey = process.env.HRMOS_SECRET_KEY;
  const companyUrl = process.env.HRMOS_COMPANY_URL || 'lifemarks';
  if (!secretKey) {
    console.error('HRMOS_SECRET_KEY is not configured; skipping scheduled sync');
    return new Response('HRMOS_SECRET_KEY is not configured', { status: 500 });
  }

  const base = `https://ieyasu.co/api/${companyUrl}/v1`;
  const now = new Date();
  // トリガー時刻はUTC 0:00(=JST 9:00)なので、UTCの年月がそのままJSTの当日の年月になる
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  try {
    const token = await getHrmosToken(secretKey, base);
    const records = await fetchPaginated(base, token, `/work_outputs/monthly/${month}`);

    const byName = {};
    records.forEach((rec) => {
      const name = rec.full_name;
      if (!name) return;
      byName[name] = (byName[name] || 0) + hrmosOvertimeMinutes(rec);
    });

    const store = getStore('site-schedule-data');
    const master = await store.get('master-data-v4', { type: 'json' });
    if (!master || !Array.isArray(master.workers)) {
      return new Response(JSON.stringify({ ok: false, reason: 'no master data yet' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let matched = 0;
    master.workers.forEach((w) => {
      const mins = byName[w.name];
      if (mins != null) {
        w.overtimeHours = Math.round(mins / 6) / 10;
        matched++;
      }
    });

    await store.setJSON('master-data-v4', master);

    return new Response(JSON.stringify({ ok: true, month, matched, totalNames: Object.keys(byName).length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('hrmos scheduled sync failed', err);
    return new Response(JSON.stringify({ error: String(err.message || err), status: err.status, detail: err.detail }), {
      status: err.status ? 502 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = { schedule: '0 0 * * *' };
