/* Eco Creational — chatbot.js
   Self-contained chat assistant. No dependencies, no API keys in the browser.

   How it answers
   1. Built-in knowledge base (everything on this site: materials, MOQ, lead time, shipping, care…)
      so it works instantly and offline, on any static host.
   2. Guided "Get a quote" flow that ends in a ready-to-send WhatsApp / email message.
   3. OPTIONAL live AI: set `aiEndpoint` below (or window.ECO_CHAT_CONFIG.aiEndpoint) to your
      server-side proxy (see worker/ai-proxy.js). The bot then sends the conversation to it and falls
      back to the built-in answers if the proxy is unreachable. */
(function () {
  'use strict';

  var CONFIG = {
    name: 'Eco Assistant',
    whatsapp: '94777222773',
    phoneLabel: '+94 77 722 2773',
    email: 'ecocreational@gmail.com',
    aiEndpoint: '',          // e.g. 'https://eco-chat.YOURNAME.workers.dev'  ('' = built-in answers only)
    aiTimeoutMs: 20000,
    logo: 'assests/eco-creational-logo-crop.webp',
    greeting: 'Hi! I’m the Eco Creational assistant. I can help with bag materials, minimum orders, printing, delivery and quotes. What would you like to know?'
  };
  if (typeof window !== 'undefined' && window.ECO_CHAT_CONFIG) {
    for (var k in window.ECO_CHAT_CONFIG) CONFIG[k] = window.ECO_CHAT_CONFIG[k];
  }

  /* ───────────── Knowledge base ───────────── */
  var CHIPS_MAIN = ['Get a quote', 'Materials', 'Minimum order', 'Delivery', 'Talk to a person'];

  var KB = [
    { id: 'greet', keys: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'good afternoon', 'ayubowan', 'hola'], w: 0,
      a: 'Hello! 👋 How can I help with your custom bag order today?', chips: CHIPS_MAIN },
    { id: 'thanks', keys: ['thanks', 'thank you', 'thx', 'cheers', 'great', 'awesome', 'perfect'], w: 0,
      a: 'You’re welcome! Anything else I can help with?', chips: ['Get a quote', 'Talk to a person'] },
    { id: 'bye', keys: ['bye', 'goodbye', 'see you', 'good night'], w: 0,
      a: 'Thanks for stopping by! We’re open 24 hours on WhatsApp whenever you’re ready. 🌿', chips: ['Talk to a person'] },
    { id: 'human', keys: ['human', 'person', 'agent', 'representative', 'talk to someone', 'speak to someone', 'call', 'phone', 'whatsapp', 'number', 'staff', 'support'], w: 1,
      a: 'Happy to connect you with the team. They reply fast on WhatsApp, any time of day: **' + '{{phone}}' + '**.',
      links: 'contact' },
    { id: 'contact', keys: ['contact', 'email', 'mail', 'reach', 'get in touch', 'address'], w: 0,
      a: 'You can reach us on WhatsApp / call **{{phone}}** or email **{{email}}**. We’re open 24 hours and reply to forms within 24 hours.',
      links: 'contact' },
    { id: 'hours', keys: ['hours', 'open', 'opening', 'closing', 'time open', 'available', '24', 'weekend', 'sunday'], w: 0,
      a: 'We’re open **24 hours, every day**. Message us on WhatsApp any time and we’ll reply as soon as possible.', chips: ['Talk to a person'] },
    { id: 'location', keys: ['where', 'location', 'visit', 'studio', 'shop', 'office', 'based', 'colombo', 'map'], w: 0,
      a: 'We’re based in Sri Lanka and deliver island-wide. Studio visits are **by appointment only**. Message us and we’ll schedule a call or a visit.', links: 'contact' },
    { id: 'materials', keys: ['material', 'materials', 'fabric', 'types of bags', 'what bags', 'options', 'kinds', 'range', 'products', 'what do you make', 'what do you sell'], w: 1,
      a: 'We print on four base materials:\n• **Non-woven**: lightweight, durable, 100% recyclable\n• **Canvas**: premium cotton, sturdy and reusable\n• **Jute & juco**: natural fibre, biodegradable (juco blends in cotton)\n• **Calico cotton**: soft, breathable and unbleached\nWhich one are you considering?',
      chips: ['Non-woven', 'Canvas', 'Jute & juco', 'Calico', 'Get a quote'] },
    { id: 'nonwoven', keys: ['non woven', 'nonwoven', 'non-woven', 'polypropylene', 'pp bag', 'carrier bag'], w: 2,
      a: '**Non-woven bags** are lightweight, water resistant and cost-effective, ideal for retail and events. They come in any colour with full-colour printing, and the polypropylene is recyclable in many facilities.', chips: ['Canvas vs non-woven', 'Get a quote'] },
    { id: 'canvas', keys: ['canvas', 'tote', 'gsm', 'cotton canvas'], w: 1,
      a: '**Canvas bags** are heavy, premium cotton: sturdy, reusable and great for corporate gifting, premium retail and fashion. We offer multiple GSM options. Tell us your budget and use and we’ll suggest one.', chips: ['Canvas vs non-woven', 'Get a quote'] },
    { id: 'canvasvs', keys: ['difference', 'compare', 'vs', 'versus', 'better', 'which is best', 'which one', 'recommend', 'suggest'], w: 3,
      a: '**Non-woven** is lighter, water resistant and the most budget-friendly, great for events and retail. **Canvas** is heavier cotton, ideal for premium branding and everyday use. **Jute / juco** gives a rustic natural look, and **calico** is soft and minimal. Share your budget and quantity and we’ll recommend the best fit.', chips: ['Get a quote', 'Talk to a person'] },
    { id: 'jute', keys: ['jute', 'juco', 'hessian', 'burlap', 'natural fibre', 'biodegradable'], w: 1,
      a: '**Jute** is a natural golden fibre and fully biodegradable. **Juco** blends jute with cotton for extra durability. Both have a rustic, elegant look.', chips: ['Get a quote'] },
    { id: 'calico', keys: ['calico', 'unbleached', 'muslin', 'cotton bag', 'cotton'], w: 1,
      a: '**Calico cotton** is soft, breathable and unbleached. It’s great for promotional giveaways, farmers markets and minimalist brands.', chips: ['Get a quote'] },
    { id: 'moq', keys: ['minimum', 'moq', 'min order', 'minimum order', 'least', 'small order', 'few pieces', 'how many', 'quantity', 'low quantity', 'single', 'sample bag'], w: 2,
      a: 'The minimum order for custom-printed bags is usually **100 pieces**. For plain stock bags, smaller quantities may be available, so contact us with your requirement.', chips: ['Get a quote', 'Samples'] },
    { id: 'shipcost', keys: ['shipping cost', 'shipping price', 'delivery cost', 'delivery charge', 'delivery fee', 'freight', 'courier cost', 'shipping fee'], w: 3,
      a: 'Shipping is calculated from the weight, volume and destination, and we include it in your quote. Bulk orders often qualify for discounted freight.', chips: ['Get a quote', 'Delivery'] },
    { id: 'price', keys: ['price', 'pricing', 'cost', 'how much', 'rate', 'rates', 'quote price', 'cheap', 'budget', 'expensive', 'discount', 'wholesale', 'per bag', 'per piece', 'payment', 'pay', 'advance', 'invoice'], w: 1,
      a: 'We don’t publish a fixed price list because the price depends on the **material, size, number of print colours and quantity** (larger quantities get better pricing). For payment terms and an exact figure, send us your requirement and we’ll quote you.', chips: ['Get a quote', 'Talk to a person'] },
    { id: 'time', keys: ['how long', 'production time', 'turnaround', 'lead time', 'days', 'when will', 'ready', 'urgent', 'rush', 'deadline', 'fast', 'duration', 'timeline', 'weeks'], w: 2,
      a: 'Production usually takes **10–15 business days after design approval**, plus delivery time. Large bulk orders may need extra lead time, and we’ll give you a clear timeline when you enquire. Have a deadline? Tell us and we’ll do our best.', chips: ['Get a quote', 'Delivery'] },
    { id: 'sample', keys: ['sample', 'samples', 'mockup', 'mock up', 'proof', 'preview', 'digital proof', 'test print'], w: 2,
      a: 'Yes. **Digital mockups are free.** Physical samples can be arranged for a fee, which is refundable when you place a bulk order, so you can approve the material and print quality first.', chips: ['Get a quote'] },
    { id: 'printing', keys: ['print', 'printing', 'screen print', 'screen printing', 'embroidery', 'embroider', 'digital transfer', 'water based', 'ink', 'colour', 'color', 'colours', 'multi color', 'full color', 'finish'], w: 1,
      a: 'We offer **water-based screen printing**, **digital transfer** and **embroidery**, in one or more print colours, plus full-colour on non-woven. We can also make custom shapes and sustainable add-ons like recycled zippers and tags.', chips: ['Design help', 'Get a quote'] },
    { id: 'design', keys: ['design', 'logo', 'artwork', 'file', 'format', 'vector', 'ai file', 'pdf', 'png', 'layout', 'branding', 'brand', 'custom', 'customise', 'customize', 'personalise'], w: 1,
      a: 'Send us your logo or artwork (vector files like AI / PDF / SVG are best) and we’ll prepare a **free digital proof**. Don’t have artwork? We offer end-to-end design support to get it print-ready.', chips: ['Samples', 'Get a quote'] },
    { id: 'delivery', keys: ['delivery', 'deliver', 'ship', 'shipping', 'send', 'courier', 'island wide', 'islandwide', 'worldwide', 'international', 'overseas', 'abroad', 'export', 'global', 'country'], w: 1,
      a: 'We deliver **island-wide across Sri Lanka** and also **ship worldwide**. Costs and times depend on the destination, and we use reliable couriers with carbon-offset options. Orders are packed in recycled, eco-friendly packaging.', chips: ['Shipping cost', 'Get a quote'] },
    { id: 'returns', keys: ['return', 'returns', 'refund', 'exchange', 'defect', 'damaged', 'wrong', 'mistake', 'complaint', 'policy', 'cancel order'], w: 1,
      a: 'Because most items are custom-made, returns are accepted only for **manufacturing defects or errors on our part**. Please inspect your order on arrival and contact us **within 7 days**.', chips: ['Talk to a person'] },
    { id: 'care', keys: ['care', 'wash', 'washing', 'clean', 'cleaning', 'laundry', 'dry', 'iron', 'stain', 'maintain'], w: 2,
      a: 'Most bags can be spot cleaned or gently hand-washed with mild soap. Avoid machine-washing canvas and jute so they keep their shape, and air dry only. Care instructions come with every order.' },
    { id: 'eco', keys: ['eco', 'eco friendly', 'sustainable', 'sustainability', 'environment', 'plastic', 'green', 'planet', 'carbon', 'waste', 'reusable', 'recycle', 'recyclable', 'recycled', 'packaging'], w: 1,
      a: 'Our bags are designed to replace single-use plastic: they’re reusable and made from renewable or recyclable materials, and many are biodegradable. We use recycled cardboard, paper tape and minimal plastic when shipping. Non-woven polypropylene is recyclable in many facilities (check local guidelines), but reuse it as often as you can first.', chips: ['Ethical production', 'Materials'] },
    { id: 'ethical', keys: ['ethical', 'fair', 'labor', 'labour', 'wages', 'workers', 'child', 'certified', 'factory', 'workshop', 'artisan'], w: 2,
      a: 'We work with certified workshops that provide fair wages and safe working conditions, with no child labour. We visit the facilities regularly and keep a transparent supply chain.' },
    { id: 'about', keys: ['about', 'who are you', 'company', 'story', 'founder', 'owner', 'shan', 'perera', 'history', 'how long have', 'experience', 'established'], w: 1,
      a: 'Eco Creational began in Sri Lanka with a handful of sewing machines and a concern about the plastic crisis. Founded by **Shan Perera**, it has grown into a trusted partner for universities, resorts and brands, with **5,000+ bags created** and **30+ partners**.', links: 'about' },
    { id: 'clients', keys: ['client', 'clients', 'customers', 'projects', 'portfolio', 'work', 'examples', 'past orders', 'previous', 'references', 'companies', 'printed for', 'who have you', 'dialog', 'nestle', 'university', 'peradeniya', 'resort'], w: 2,
      a: 'We’ve printed for **Dialog, Nestlé Lanka, University of Peradeniya, University of Colombo, CIPM Sri Lanka, Wattura Resort & Spa** and Arcade of Aluminium, among others. You can browse our past orders on the Projects page.', links: 'projects' },
    { id: 'events', keys: ['event', 'events', 'wedding', 'gift', 'gifts', 'giveaway', 'corporate', 'conference', 'seminar', 'hotel', 'school', 'promotional', 'promo', 'campaign', 'bulk'], w: 0,
      a: 'Bulk and corporate orders are our speciality: events, conferences, hotels, universities and promotional campaigns. We offer special pricing for large quantities and a dedicated account manager for enterprises.', chips: ['Get a quote', 'Minimum order'] },
    { id: 'quote', keys: ['quote', 'quotation', 'order', 'buy', 'purchase', 'estimate', 'enquiry', 'inquiry', 'start', 'place an order', 'get started', 'interested'], w: 2,
      a: '__QUOTE__' }
  ];

  var FALLBACKS = [
    'I’m not completely sure about that one. I can help with materials, minimum orders, printing, delivery and quotes, or you can ask our team directly on WhatsApp.',
    'Hmm, I don’t have a good answer for that. Our team can help right away on WhatsApp, or I can start a quote for you.'
  ];

  /* ───────────── Matching engine (pure, testable) ───────────── */
  function norm(t) { return ' ' + String(t).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim() + ' '; }
  function stem(w) { return w.length > 3 && /s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w; }
  function lev1(a, b) { // true when edit distance <= 1
    if (a === b) return true;
    var la = a.length, lb = b.length; if (Math.abs(la - lb) > 1) return false;
    var i = 0, j = 0, d = 0;
    while (i < la && j < lb) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++d > 1) return false;
      if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
    }
    return d + (la - i) + (lb - j) <= 1;
  }
  function tokMatch(k, t) {
    if (k === t) return 1;
    if (k.length >= 4 && t.length >= 4) {
      if ((k.indexOf(t) === 0 || t.indexOf(k) === 0) && Math.abs(k.length - t.length) <= 3) return 1;
      if (k.length >= 5 && lev1(k, t)) return 0.8;   // typo tolerance
    }
    return 0;
  }
  function score(entry, toks, text) {
    var best = 0;
    for (var i = 0; i < entry.keys.length; i++) {
      var key = norm(entry.keys[i]), kt = key.trim().split(' ');
      var s;
      if (kt.length > 1 && text.indexOf(key) > -1) s = kt.length * 3;          // exact phrase
      else {
        var got = 0;
        for (var a = 0; a < kt.length; a++) {
          var kk = stem(kt[a]), hit = 0;
          for (var b = 0; b < toks.length && !hit; b++) hit = tokMatch(kk, toks[b]);
          if (!hit) { got = -1; break; }
          got += hit;
        }
        s = got > 0 ? got * (kt.length > 1 ? 2.5 : 2) : 0;
      }
      if (s > best) best = s;
    }
    return best > 0 ? best + (entry.w || 0) : 0;
  }
  function match(input) {
    var text = norm(input), toks = text.trim().split(' ').filter(Boolean).map(stem);
    if (!toks.length) return null;
    var top = null, topS = 0;
    for (var i = 0; i < KB.length; i++) {
      var s = score(KB[i], toks, text);
      if (s > topS) { topS = s; top = KB[i]; }
    }
    // Greetings / thanks only count when the message is short, so "hi, what's the minimum order?" routes to MOQ.
    if (top && (top.id === 'greet' || top.id === 'thanks' || top.id === 'bye') && toks.length > 4) {
      var second = null, secondS = 0;
      for (var j = 0; j < KB.length; j++) { if (KB[j] === top) continue; var s2 = score(KB[j], toks, text); if (s2 > secondS) { secondS = s2; second = KB[j]; } }
      if (second) { top = second; topS = secondS; }
    }
    return topS >= 2 ? top : null;
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { match: match, KB: KB }; }
  if (typeof document === 'undefined') return;

  /* ───────────── Helpers ───────────── */
  function fill(t) { return t.replace(/\{\{phone\}\}/g, CONFIG.phoneLabel).replace(/\{\{email\}\}/g, CONFIG.email); }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmt(t) { // tiny, safe formatter: **bold**, [label](url), newlines
    var h = esc(fill(t));
    h = h.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:)[^)\s]+|[a-z0-9\-]+\.html)\)/gi, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    return h;
  }
  function waLink(msg) { return 'https://wa.me/' + CONFIG.whatsapp + (msg ? '?text=' + encodeURIComponent(msg) : ''); }
  var LINKS = {
    contact: [{ l: 'WhatsApp us', h: function () { return waLink('Hi Eco Creational, I have a question.'); } }, { l: 'Email', h: function () { return 'mailto:' + CONFIG.email; } }],
    about: [{ l: 'Read our story', h: function () { return 'about.html'; }, same: true }],
    projects: [{ l: 'See past orders', h: function () { return 'projects.html'; }, same: true }]
  };
  var store = { get: function (k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
                set: function (k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  /* ───────────── State ───────────── */
  var KEY = 'eco-chat-v2';
  var saved = store.get(KEY) || {};
  var msgs = saved.msgs || [];          // {r:'bot'|'user', t:string, chips?:[], links?:[{l,h,same}]}
  var quote = saved.quote || null;      // {step, data}
  var opened = false, busy = false;
  function persist() { store.set(KEY, { msgs: msgs.slice(-40), quote: quote }); }

  /* ───────────── UI ───────────── */
  var root = document.createElement('div');
  root.className = 'ec';
  root.innerHTML =
    '<button type="button" class="ec-launch" aria-label="Open chat assistant" aria-expanded="false" aria-controls="ec-panel">' +
      '<svg class="i-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" stroke-width="2.4"/></svg>' +
      '<svg class="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '<i class="ec-dot" aria-hidden="true"></i>' +
    '</button>' +
    '<div class="ec-nudge" role="status" hidden>Need help choosing a bag? Ask me 👋</div>' +
    '<section class="ec-panel" id="ec-panel" role="dialog" aria-label="' + esc(CONFIG.name) + '" hidden>' +
      '<header class="ec-head">' +
        '<span class="ec-av"><img src="' + CONFIG.logo + '" alt="" width="40" height="24"></span>' +
        '<div class="ec-ttl"><b>' + esc(CONFIG.name) + '</b><span><i></i>Online · replies instantly</span></div>' +
        '<button type="button" class="ec-ico ec-reset" aria-label="Start a new chat" title="New chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/></svg></button>' +
        '<button type="button" class="ec-ico ec-close" aria-label="Close chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '</header>' +
      '<div class="ec-log" role="log" aria-live="polite" aria-relevant="additions"></div>' +
      '<form class="ec-form" autocomplete="off">' +
        '<input class="ec-in" type="text" maxlength="500" placeholder="Type your question…" aria-label="Your message" enterkeyhint="send">' +
        '<button class="ec-send" type="submit" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
      '</form>' +
    '</section>';
  document.body.appendChild(root);

  var launch = root.querySelector('.ec-launch'), panel = root.querySelector('.ec-panel'), log = root.querySelector('.ec-log'),
      form = root.querySelector('.ec-form'), input = root.querySelector('.ec-in'), nudge = root.querySelector('.ec-nudge'),
      dot = root.querySelector('.ec-dot');

  function scrollDown() { log.scrollTop = log.scrollHeight; }
  function clearChips() { var c = log.querySelectorAll('.ec-chips'); for (var i = 0; i < c.length; i++) c[i].parentNode.removeChild(c[i]); }

  function addNode(m, isRestore) {
    var row = document.createElement('div');
    row.className = 'ec-m ec-' + m.r;
    var b = document.createElement('div'); b.className = 'ec-b';
    if (m.r === 'bot') b.innerHTML = fmt(m.t); else b.textContent = m.t;
    row.appendChild(b);
    if (m.links && m.links.length) {
      var lw = document.createElement('div'); lw.className = 'ec-links';
      m.links.forEach(function (x) {
        var a = document.createElement('a'); a.className = 'ec-act'; a.textContent = x.l; a.href = x.h;
        if (!x.same) { a.target = '_blank'; a.rel = 'noopener'; }
        lw.appendChild(a);
      });
      row.appendChild(lw);
    }
    log.appendChild(row);
    if (m.chips && m.chips.length && !isRestore) addChips(m.chips);
    scrollDown();
  }
  function addChips(list) {
    clearChips();
    var w = document.createElement('div'); w.className = 'ec-chips';
    list.forEach(function (c) {
      var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'ec-chip'; bt.textContent = c;
      bt.addEventListener('click', function () { send(c); });
      w.appendChild(bt);
    });
    log.appendChild(w); scrollDown();
  }
  function typing(on) {
    var t = log.querySelector('.ec-typing');
    if (on && !t) { t = document.createElement('div'); t.className = 'ec-m ec-bot ec-typing'; t.setAttribute('aria-label', 'Assistant is typing'); t.innerHTML = '<div class="ec-b"><i></i><i></i><i></i></div>'; log.appendChild(t); scrollDown(); }
    if (!on && t) t.parentNode.removeChild(t);
  }
  function say(text, extra, delay) {
    extra = extra || {};
    return new Promise(function (res) {
      typing(true);
      setTimeout(function () {
        typing(false);
        var m = { r: 'bot', t: text, chips: extra.chips, links: extra.links };
        msgs.push(m); persist(); addNode(m); res();
      }, delay == null ? Math.min(250 + text.length * 7, 900) : delay);
    });
  }
  function resolveLinks(key) {
    if (!key || !LINKS[key]) return null;
    return LINKS[key].map(function (x) { return { l: x.l, h: x.h(), same: x.same }; });
  }

  /* ───────────── Quote flow ───────────── */
  var TYPES = ['Non-woven', 'Canvas', 'Jute & juco', 'Calico', 'Not sure yet'];
  var PRINTS = ['1 colour', '2–3 colours', 'Full colour', 'Embroidery', 'Not sure yet'];
  function startQuote() {
    quote = { step: 'type', data: {} }; persist();
    return say('Great, let’s put your quote request together. It takes about 30 seconds. **Which bag material are you interested in?**', { chips: TYPES.concat(['Cancel']) });
  }
  function quoteStep(text) {
    var d = quote.data, low = text.toLowerCase().trim();
    if (/^(cancel|stop|exit|quit|no thanks?)$/.test(low)) { quote = null; persist(); return say('No problem, I’ve cancelled that. Ask me anything else, or start a quote again any time.', { chips: CHIPS_MAIN }); }
    if (quote.step === 'type') {
      d.type = text; quote.step = 'qty'; persist();
      return say('**How many bags do you need?** (our minimum for custom printing is usually 100 pieces)', { chips: ['100', '250', '500', '1000+', 'Cancel'] });
    }
    if (quote.step === 'qty') {
      var n = parseInt(text.replace(/[, ]/g, '').replace(/[^0-9]/g, ''), 10);
      d.qty = text; quote.step = 'print'; persist();
      var note = (n && n < 100) ? 'Just so you know, custom printing usually starts at 100 pieces, but our team can tell you what’s possible for smaller runs. ' : '';
      return say(note + '**How would you like them printed?**', { chips: PRINTS.concat(['Cancel']) });
    }
    if (quote.step === 'print') {
      d.print = text; quote.step = 'name'; persist();
      return say('Almost done. **What’s your name?**');
    }
    if (quote.step === 'name') {
      d.name = text.slice(0, 80); quote.step = 'phone'; persist();
      return say('Thanks, ' + d.name.split(' ')[0] + '! **What’s the best phone / WhatsApp number to reach you?**');
    }
    if (quote.step === 'phone') {
      if ((text.match(/\d/g) || []).length < 7) return say('That doesn’t look like a phone number. Could you include the digits (with country code if outside Sri Lanka)?');
      d.phone = text.slice(0, 40);
      var body = 'Hi Eco Creational, I’d like a quote.\n' +
        'Material: ' + d.type + '\nQuantity: ' + d.qty + '\nPrint: ' + d.print + '\nName: ' + d.name + '\nPhone: ' + d.phone;
      quote = null; persist();
      return say('Thanks! Here’s your request:\n• **Material:** ' + d.type + '\n• **Quantity:** ' + d.qty + '\n• **Print:** ' + d.print + '\n• **Name:** ' + d.name + '\n• **Phone:** ' + d.phone +
        '\n\nTap a button below to send it to our team. We reply fast, and you can attach your logo in the chat.',
        { links: [{ l: 'Send on WhatsApp', h: waLink(body) }, { l: 'Send by email', h: 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('Bag quote request') + '&body=' + encodeURIComponent(body) }],
          chips: ['New question'] }, 500);
    }
  }

  /* ───────────── Optional live AI ───────────── */
  function askAI() {
    var history = msgs.filter(function (m) { return m.t; }).slice(-10).map(function (m) { return { role: m.r === 'user' ? 'user' : 'assistant', content: m.t.slice(0, 1500) }; });
    while (history.length && history[0].role !== 'user') history.shift();
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, CONFIG.aiTimeoutMs);
    return fetch(CONFIG.aiEndpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }), signal: ctl ? ctl.signal : undefined
    }).then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(function (j) { if (!j || !j.reply) throw new Error('empty'); return String(j.reply).slice(0, 1500); });
  }

  /* ───────────── Conversation ───────────── */
  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    if (!opened) openPanel();
    clearChips();
    var m = { r: 'user', t: text }; msgs.push(m); persist(); addNode(m);
    input.value = '';
    busy = true;
    respond(text).then(function () { busy = false; input.focus(); }, function () { busy = false; });
  }
  function respond(text) {
    if (quote) return quoteStep(text);
    var low = text.toLowerCase();
    if (/^(get a quote|quote|new quote)$/.test(low)) return startQuote();
    if (low === 'new question') return say('Sure, what would you like to know?', { chips: CHIPS_MAIN });
    if (low === 'talk to a person') return say('Of course. Our team replies on WhatsApp any time of day: **' + CONFIG.phoneLabel + '**.', { links: resolveLinks('contact') });
    if (low === 'canvas vs non-woven') return localAnswer('what is the difference between canvas and non woven');
    if (low === 'shipping cost') return localAnswer('shipping cost');
    if (low === 'ethical production') return localAnswer('ethical production');
    if (low === 'design help') return localAnswer('design logo artwork');
    if (low === 'samples') return localAnswer('samples');
    if (low === 'minimum order') return localAnswer('minimum order');

    var hit = match(text);
    var trivial = hit && (hit.id === 'greet' || hit.id === 'thanks' || hit.id === 'bye');
    if (CONFIG.aiEndpoint && !trivial && !(hit && hit.id === 'quote')) {
      typing(true);
      return askAI().then(function (reply) {
        typing(false);
        var mm = { r: 'bot', t: reply, chips: ['Get a quote', 'Talk to a person'] }; msgs.push(mm); persist(); addNode(mm);
      }, function () { typing(false); return localAnswer(text); });   // proxy down → built-in answers
    }
    return localAnswer(text, hit);
  }
  function localAnswer(text, hit) {
    hit = hit === undefined ? match(text) : hit;
    if (!hit) {
      var f = FALLBACKS[msgs.length % FALLBACKS.length];
      return say(f, { chips: ['Get a quote', 'Materials', 'Talk to a person'], links: resolveLinks('contact') });
    }
    if (hit.a === '__QUOTE__') return startQuote();
    return say(hit.a, { chips: hit.chips, links: resolveLinks(hit.links) });
  }

  /* ───────────── Open / close ───────────── */
  function openPanel() {
    opened = true; panel.hidden = false;
    requestAnimationFrame(function () { root.classList.add('is-open'); });
    document.body.classList.add('chat-open');
    launch.setAttribute('aria-expanded', 'true'); launch.setAttribute('aria-label', 'Close chat assistant');
    nudge.hidden = true; dot.hidden = true; store.set('eco-chat-nudge', 1);
    if (!log.children.length) {
      if (msgs.length) { msgs.forEach(function (m) { addNode(m, true); }); var last = msgs[msgs.length - 1]; if (last.r === 'bot' && !quote) addChips(last.chips || CHIPS_MAIN); else if (quote) addChips(quote.step === 'type' ? TYPES : quote.step === 'print' ? PRINTS : ['Cancel']); }
      else say(CONFIG.greeting, { chips: CHIPS_MAIN }, 350);
    }
    setTimeout(function () { input.focus(); }, 50);
  }
  function closePanel() {
    opened = false; root.classList.remove('is-open');
    document.body.classList.remove('chat-open');
    launch.setAttribute('aria-expanded', 'false'); launch.setAttribute('aria-label', 'Open chat assistant');
    setTimeout(function () { if (!opened) panel.hidden = true; }, 260);
    launch.focus();
  }
  launch.addEventListener('click', function () { opened ? closePanel() : openPanel(); });
  root.querySelector('.ec-close').addEventListener('click', closePanel);
  root.querySelector('.ec-reset').addEventListener('click', function () {
    msgs = []; quote = null; persist(); log.innerHTML = ''; busy = false;
    say(CONFIG.greeting, { chips: CHIPS_MAIN }, 250);
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && opened) closePanel(); });

  /* Gentle one-time nudge */
  if (!store.get('eco-chat-nudge') && !msgs.length) {
    setTimeout(function () { if (!opened) { nudge.hidden = false; setTimeout(function () { nudge.hidden = true; }, 9000); } }, 8000);
  } else { dot.hidden = true; }
  nudge.addEventListener('click', openPanel);
})();
