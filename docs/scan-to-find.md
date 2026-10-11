# PeopleFind Scan-to-Find (CLIP visual matching)

Scan-to-Find compares a submitted image with the images indexed for directory records. It uses the 512-dimensional image projection from `Xenova/clip-vit-base-patch32`. This is visual similarity, not facial recognition and not proof of identity.

## Files

- `app/scan/page.tsx`: upload/camera UI and result cards.
- `app/api/scan/match/route.ts`: authenticated query-image processing and RPC call.
- `app/api/scan/index/route.ts`: secret-protected batch indexing of catalog photos.
- `src/lib/scan/config.ts`, `vision.ts`, `server.ts`: shared model, limits, and server-only helpers.
- `supabase/migrations/202610110002_fix_doll_scan_allowlist.sql`: proposed correction for the allowlist check. Review against the live schema before applying.

## Environment variables

Configure these in local `.env.local` and the server deployment environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` — server only; never use a `NEXT_PUBLIC_` prefix.
- `SCAN_INDEX_SECRET` — a long random secret for the index route.
- `SCAN_MAX_DISTANCE` — optional, defaults to `0.28`; tune only after validating examples.
- `SCAN_ALLOWED_IMAGE_HOSTS` — optional comma-separated exact hostnames allowed for catalog image downloads. Set this to the hosts you actually use for stronger protection.

Do not commit secrets to GitHub.

## Database requirements to verify

Before applying SQL or testing, verify that the connected Supabase project has:

- `public.people` with `id`, `name`, `photo_url`, and `faculty`.
- `public.scan_reference_index` with `person_id`, `photo_url_snapshot`, `embedding` as `vector(512)`, `model_version`, `status`, `error`, and `attempts`.
- `public.scan_allowlist` with `user_id` and `can_match`.
- `public.scan_events` with `user_id`, `event_type`, and `created_at`.
- The `scan_match_dolls` RPC signature and grants matching the app.

The SQL migration is **not applied automatically by GitHub**. The earlier migration was reportedly applied directly in Supabase; do not rerun the older 512D migration blindly. Review the new allowlist-fix migration against the actual live schema first.

## Indexing reference photos

1. Populate `people.photo_url` with real, public HTTPS image URLs.
2. Confirm the database trigger queues each changed photo in `scan_reference_index` with status `pending`.
3. Set `SCAN_INDEX_SECRET` in the server environment.
4. Send a POST request to `/api/scan/index` with header `x-scan-index-secret: <your-secret>`. Each request processes at most 10 queued images.
5. Repeat until the response reports zero processed records. Failed records require investigation and deliberate retry; they are not automatically requeued.
6. Test with known image pairs and unrelated images before changing the distance threshold.

## Deployment constraints

The first request may take longer because model weights need to load. Confirm your hosting plan's memory, bundle-size, and execution-time limits. If the serverless function cannot run the model reliably, use a dedicated inference worker; do not switch the query and catalog embeddings to different models.
