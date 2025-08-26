// /api/hook.js — CommonJS for Vercel
const { randomUUID } = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'POST {event_name, custom_data, event_id}' });
  }
  const PIXEL_ID = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return res.status(500).json({ ok:false, error:'Missing META_PIXEL_ID or META_ACCESS_TOKEN', hint:'Add env vars in Vercel → Settings → Environment Variables, then redeploy.' });
  }
  try {
    const { event_name='PageView', custom_data={}, event_id, test_event_code } = req.body || {};
    const event_time = Math.floor(Date.now()/1000);
    const event_source_url = req.headers['referer'] || '';
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || '';
    const ua = req.headers['user-agent'] || '';

    const payload = {
      data: [{
        event_name, event_time, action_source:'website', event_source_url,
        event_id: event_id || randomUUID(),
        user_data: { client_ip_address: ip, client_user_agent: ua },
        custom_data
      }]
    };
    if (test_event_code) payload.test_event_code = test_event_code;
    else if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

    const url = `https://graph.facebook.com/v20.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const fb = await fetch(url, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    const json = await fb.json().catch(()=>({}));
    const ok = fb.ok && json?.events_received >= 0;
    return res.status(ok ? 200 : 400).json({ ok, fb: json });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e) });
  }
};
