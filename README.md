# BoldFrame Visuals — Vercel Site + Meta CAPI
Deploy: push to GitHub → import to Vercel (Framework: Other).

Env vars (Project Settings → Environment Variables):
- META_PIXEL_ID
- META_ACCESS_TOKEN
- (optional) META_TEST_EVENT_CODE

The page includes a Pixel snippet + calls /api/hook with the same event_id for dedup.
