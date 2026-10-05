// Handles the few dynamic endpoints for the site. Everything else is served
// straight from static assets (see "run_worker_first" in wrangler.jsonc).
//
//   GET  /api/region     -> { country } so the page knows whether to ask for cookie consent
//   POST /api/subscribe  -> adds an email to the MailerLite group (token stays server-side)

const JSON_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

// Only accept signups that originate from our own pages.
function isAllowedOrigin(request, url) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return (
      host === url.hostname ||
      host === 'unchainedlabel.com' ||
      host === 'www.unchainedlabel.com'
    );
  } catch {
    return false;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function subscribe(request, env, url) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!isAllowedOrigin(request, url)) return json({ error: 'Forbidden' }, 403);
  if (!env.MAILERLITE_API_TOKEN) return json({ error: 'Not configured' }, 503);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }

  const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${env.MAILERLITE_API_TOKEN}`,
    },
    body: JSON.stringify({
      email,
      groups: [env.MAILERLITE_GROUP_ID],
      status: 'active',
    }),
  });

  if (!res.ok) return json({ error: 'Subscription failed. Please try again.' }, 502);
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/region') {
      return json({ country: request.cf?.country || null });
    }
    if (url.pathname === '/api/subscribe') {
      return subscribe(request, env, url);
    }
    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Not found' }, 404);
    }
    return env.ASSETS.fetch(request);
  },
};
