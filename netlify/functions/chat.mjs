import Anthropic from '@anthropic-ai/sdk';

// Netlifyにデプロイすると、Netlify AI Gatewayが ANTHROPIC_API_KEY と
// ANTHROPIC_BASE_URL を自動で環境変数に設定してくれるため、
// 自分でAPIキーを取得・管理する必要はありません。
// （すでに自分のAnthropic APIキーを環境変数に設定している場合はそちらが優先されます）

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { system, messages } = await req.json();
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system,
      messages,
    });

    return new Response(JSON.stringify(message), {
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

export const config = { path: '/.netlify/functions/chat' };
