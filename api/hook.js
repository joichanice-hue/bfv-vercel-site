// Vercel serverless function — CAPI proxy with strict dedupe parity
const { randomUUID } = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok:true, message:'POST {event_name,event_id,event_source_url,custom_data?}' });
  }

  const PIXEL_ID = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return res.status(500).json({ ok:false, error:'Missing META_PIXEL_ID or META_ACCESS_TOKEN' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const event_name = body.event_name || 'PageView';
    const event_id = body.event_id || randomUUID();
    const event_time = Math.floor(Date.now()/1000);

    // CRITICAL for dedupe: use the exact URL the browser used
    const event_source_url = body.event_source_url || '';

    // Pass the same custom_data as browser (none for PageView; same for Lead)
    const custom_data = body.custom_data && Object.keys(body.custom_data).length ? body.custom_data : undefined;

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || '';
    const ua = req.headers['user-agent'] || '';

    const dataItem = {
      event_name,
      event_time,
      action_source: 'website',
      event_source_url,
      event_id,
      user_data: {
        client_ip_address: ip,
        client_user_agent: ua
      }
    };
    if (custom_data) dataItem.custom_data = custom_data;

    const payload = { data: [dataItem] };
    if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

    const url = `https://graph.facebook.com/v20.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    const fb = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

    const json = await fb.json().catch(()=>({}));
    return res.status(fb.ok ? 200 : 400).json({ ok: fb.ok, fb: json, sent: payload });
  } catch (e) {
    return res.status(500).json({ ok:false, error: String(e) });
  }
};
