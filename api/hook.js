// /api/hook.js — CommonJS, omit custom_data for PageView
const { randomUUID } = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok:true, message:'POST {event_name, event_id, custom_data?}' });
  }
  const PIXEL_ID = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return res.status(500).json({ ok:false, error:'Missing META_PIXEL_ID or META_ACCESS_TOKEN' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body||'{}') : (req.body || {});
    const event_name = body.event_name || 'PageView';
    const event_id = body.event_id || randomUUID();
    const event_time = Math.floor(Date.now()/1000);
    const event_source_url = req.headers['referer'] || '';
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || '';
    const ua = req.headers['user-agent'] || '';

    const dataItem = {
      event_name, event_time, action_source:'website', event_source_url, event_id,
      user_data: { client_ip_address: ip, client_user_agent: ua }
    };
    if (body.custom_data && Object.keys(body.custom_data).length) {
      dataItem.custom_data = body.custom_data;
    }
    const payload = { data:[dataItem] };
    if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;
    if (body.test_event_code) payload.test_event_code = body.test_event_code;

    const url = `https://graph.facebook.com/v20.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    const fb = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const json = await fb.json().catch(()=>({}));
    return res.status(fb.ok ? 200 : 400).json({ ok: fb.ok, fb: json, sent: payload });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e) });
  }
};
