const ALLOWED_ORIGIN = '*';
const VERSION = 2;

// The Worker tries these models in order
const MODELS = [
  '@cf/meta/llama-3.1-8b-instruct',
  '@cf/meta/llama-3.2-3b-instruct'
];

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // Opening the Worker link in a browser shows this, so you can check the new code is live
    if (request.method === 'GET') return json({ status: 'ok', version: VERSION, ai_binding: !!env.AI });

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'Bad request.' }, 400); }
    const { profile, question } = body;
    if (!profile || !question) return json({ error: 'Missing data.' }, 400);

    const messages = [
      {
        role: 'system',
        content:
          'You are a friendly data analyst. You are given a profile of a spreadsheet, not the full data. ' +
          'Answer in simple language for a non-technical reader, in short paragraphs. ' +
          'Only state facts supported by the profile. If the profile cannot answer the question, say what is missing.'
      },
      { role: 'user', content: `Data profile:\n${String(profile).slice(0, 6000)}\n\nTask: ${String(question).slice(0, 500)}` }
    ];

    const errors = [];
    for (const model of MODELS) {
      try {
        const out = await env.AI.run(model, { max_tokens: 500, messages });
        return json({ answer: out.response });
      } catch (e) {
        errors.push(model + ': ' + (e.message || String(e)));
      }
    }
    return json({ error: 'AI error. ' + errors.join(' | ') }, 500);
  }
};