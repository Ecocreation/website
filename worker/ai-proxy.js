/* Eco Creational — optional live-AI proxy (Cloudflare Worker)
   Keeps your Anthropic API key on the server. The website's chatbot.js posts {messages:[{role,content}]} here.

   Deploy (free tier is enough):
     1. npm i -g wrangler && wrangler login
     2. wrangler init eco-chat   (paste this file as src/index.js)
     3. wrangler secret put ANTHROPIC_API_KEY
     4. wrangler deploy        → note the https://eco-chat.<you>.workers.dev URL
     5. In chatbot.js set  aiEndpoint: 'https://eco-chat.<you>.workers.dev'
   Set ALLOWED_ORIGINS below to your real domain(s). */

const ALLOWED_ORIGINS = ['https://ecocreational.com', 'https://www.ecocreational.com'];
const MODEL = 'claude-haiku-5-5';
const MAX_TURNS = 10, MAX_CHARS = 1500;

const SYSTEM = `You are the website assistant for Eco Creational, a custom bag printing business in Sri Lanka.
Answer ONLY using the facts below. Be warm, concise (under 90 words) and plain text (no markdown tables). If you don't know something
or it isn't below (exact prices, payment terms, stock, specific dates), say so and invite them to WhatsApp +94 77 722 2773 or email ecocreational@gmail.com. Never invent prices, discounts or promises.
Encourage a quote when the user shows buying intent.

FACTS
- Materials: non-woven polypropylene (lightweight, water resistant, recyclable, full-colour print), cotton canvas (premium, multiple GSM), jute and juco (jute-cotton blend, biodegradable), calico cotton (unbleached, soft).
- Printing: water-based screen printing, digital transfer, embroidery; one or more colours; custom shapes, recycled zippers and tags. Free design support and free digital mockups. Physical samples for a fee, refundable with a bulk order.
- Minimum order for custom printed bags: usually 100 pieces. Smaller runs of plain stock bags may be possible.
- Production: 10-15 business days after design approval, plus shipping. Bulk may need more lead time.
- Delivery: island-wide in Sri Lanka and worldwide; shipping calculated by weight, volume and destination; carbon-offset option; recycled packaging.
- Returns: only for manufacturing defects or our errors; contact within 7 days of arrival.
- Care: spot clean or gentle hand wash with mild soap; do not machine wash canvas or jute; air dry.
- Ethics: certified workshops, fair wages, safe conditions, no child labour.
- Contact: open 24 hours; WhatsApp/call +94 77 722 2773; ecocreational@gmail.com; studio visits by appointment only.
- About: founded by Shan Perera; 5,000+ bags created; 30+ partners. Clients include Dialog, Nestle Lanka, University of Peradeniya, University of Colombo, CIPM Sri Lanka, Wattura Resort & Spa, Arcade of Aluminium.`;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    const cors = { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST' || !ALLOWED_ORIGINS.includes(origin)) return new Response('Forbidden', { status: 403, headers: cors });

    let body;
    try { body = await req.json(); } catch { return new Response('Bad request', { status: 400, headers: cors }); }
    let messages = (Array.isArray(body.messages) ? body.messages : []).slice(-MAX_TURNS)
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
    while (messages.length && messages[0].role !== 'user') messages.shift();
    if (!messages.length || messages[messages.length - 1].role !== 'user') return new Response('Bad request', { status: 400, headers: cors });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, system: SYSTEM, messages })
    });
    if (!r.ok) return new Response(JSON.stringify({ error: 'upstream' }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
    const j = await r.json();
    const reply = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return new Response(JSON.stringify({ reply }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
};
