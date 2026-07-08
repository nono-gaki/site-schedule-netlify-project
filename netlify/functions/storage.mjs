import { getStore } from '@netlify/blobs';

// 現場スケジュール管理ツール用のシンプルなキーバリュー保存API。
// GET    /.netlify/functions/storage?key=xxx        -> {key, value}
// POST   /.netlify/functions/storage  {key, value}   -> {key, ok:true}
// DELETE /.netlify/functions/storage?key=xxx        -> {ok:true}

export default async (req) => {
  const store = getStore('site-schedule-data');
  const url = new URL(req.url);

  try {
    if (req.method === 'GET') {
      const key = url.searchParams.get('key');
      if (!key) {
        return new Response(JSON.stringify({ error: 'key is required' }), { status: 400 });
      }
      const value = await store.get(key, { type: 'json' });
      return new Response(JSON.stringify({ key, value: value ?? null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      if (!body.key) {
        return new Response(JSON.stringify({ error: 'key is required' }), { status: 400 });
      }
      await store.setJSON(body.key, body.value);
      return new Response(JSON.stringify({ key: body.key, ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE') {
      const key = url.searchParams.get('key');
      if (!key) {
        return new Response(JSON.stringify({ error: 'key is required' }), { status: 400 });
      }
      await store.delete(key);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = { path: '/.netlify/functions/storage' };
