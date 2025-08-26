// /api/hook.js — Vercel Serverless Function for Meta CAPI
import { randomUUID } from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'POST {event_name, custom_data, event_id}' });
  }
  const PIXEL_ID = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return res.status(500).json({ ok:false, error:'Missing META_PIXEL_ID or META_ACCESS_TOKEN' });
  }
  try {
    const { event_name='PageView', custom_data={}, event_id, test_event_code } = req.body || {};
    const event_time = Math.floor(Date.now()/1000);
    const event_source_url = req.headers['referer'] || '';
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';

    const payload = {
      data: [{
        event_name, event_time, action_source:'website', event_source_url,
        event_id: event_id || randomUUID(),
        user_data: { client_ip_address: ip, client_user_agent: ua },
        custom_data
      }]
    };
    const code = test_event_code || process.env.META_TEST_EVENT_CODE;
    if (code) payload.test_event_code = code;

    const url = `https://graph.facebook.com/v20.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    const fb = await fetch(url, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    const json = await fb.json();
    return res.status(fb.ok ? 200 : 400).json({ ok: fb.ok, fb: json });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e) });
  }
}
