# CEXCO TECHNOLOGIES — Design Portfolio & Client Request Platform

React + Vite + TypeScript + Tailwind, backed by Supabase (Postgres, Auth, Storage, RLS). Deploys to Vercel.
All public content (brand, hero, sections, services, prices, categories, projects, testimonials, about, contact, stats, process, footer) is stored in the database and edited at `/admin`.

## 1. Supabase setup
1. Create a project at supabase.com.
2. SQL Editor → run, in order: `supabase/migrations/001_schema.sql`, `002_rls_storage.sql`, `003_seed.sql`.
   (Creates tables, RLS policies, storage buckets `media` (public) and `request-files` (private), and sample content flagged `is_sample`.)
3. Authentication → Users → **Add user** (email + password, tick "Auto confirm"). Disable public sign-ups under Authentication → Providers → Email.
4. Grant that user an admin role (SQL Editor):
   `select public.make_admin('you@example.com', 'SUPER_ADMIN');`
   Use `'ADMIN'` for staff who should manage portfolio, services, pricing, requests, clients and testimonials but not site settings/homepage/pages.

## 2. Environment variables
Copy `.env.example` to `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (public anon key only — never the service-role key)
- Optional: `SITE_URL=https://your-domain` (used to generate `sitemap.xml` at build)
- Not needed on the free plan: `VITE_IMAGE_TRANSFORMS` (Pro-only server-side resizing; leave unset)

## 3. Local development
```
npm install
npm run dev          # http://localhost:5173
npm run typecheck && npm run lint && npm run build
```
Admin: `/admin` (redirects to `/admin/login`).

## 4. Vercel
Import the repo, framework "Vite", add the env vars above. `vercel.json` already rewrites all routes to `index.html`.

## Running entirely on the free plans (Supabase Free + Vercel Hobby)
- **Images:** no Pro features are used. The browser stores a full-size WebP (max 2200px) plus a ~640px thumbnail for every upload; grids load thumbnails, detail pages load the full image. Images uploaded some other way (no thumbnail) just load at full size.
- **Project pausing:** Supabase pauses Free projects after about a week of inactivity. `api/keepalive.js` plus the daily cron in `vercel.json` pings the database so that doesn't happen (needs the two env vars on Vercel; Hobby allows one daily cron). Check that it ran under Vercel → Project → Cron Jobs after the first deploy.
- **Storage:** Free includes 1 GB of file storage; the admin dashboard shows an approximate meter. Upload limits are 10 MB per portfolio image and 15 MB per client reference file.
- **Backups:** the Free plan has no automatic backups. Periodically export the database (Supabase → Database → Backups is Pro; use `pg_dump` or the CSV export per table) and download your media.

## Security model
- RLS on every table. Public: read published content only. Public writes happen only through `SECURITY DEFINER` functions (`submit_design_request`, `add_request_file`, `submit_contact_message`, `track_event`) that validate input server-side.
- Request uploads go to the private `request-files` bucket; anonymous upload is only allowed into the folder of a request created in the last 2 hours with a matching one-time token. Admins open files via 10-minute signed URLs. Bucket-level MIME and size limits are enforced by Storage, not just the browser.
- Admin writes require a row in `profiles` with `SUPER_ADMIN` or `ADMIN`. Site settings, homepage, pages, stats and process steps are SUPER_ADMIN only.
- Rich text is sanitised with DOMPurify on save and on render.

## Known limitations
- Verified here: type-check, lint, production build, and all three migrations executed against an in-memory Postgres (reference numbers, client de-duplication, anonymous RLS checks). I could not run it against a live Supabase project, so do a first pass through the admin and `/request` after setup.
- Homepage sections are reordered with up/down controls, not drag-and-drop.
- Thumbnails are made in the browser at upload time, so images uploaded before this feature, or directly in the Supabase dashboard, load at full size until re-uploaded.
- Sitemap is generated at build time; republish after adding content, or redeploy.
- Analytics is a foundation (events table + dashboard counts), not a full dashboard. No email notifications are sent for new requests; they appear in Admin → Requests.
- Seed images are neutral placeholders; sample items are labelled "Sample" and should be replaced.
- Privacy/Terms text is placeholder and needs your own legal review.
