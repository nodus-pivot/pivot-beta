# Pivot beta

Watch-repair ticketing for Nodus Watches. Next.js on Vercel, Supabase for Postgres, Auth, and Storage.

This is the rebuild of the single-file Pivot app. The schema and role model are described in the
"Pivot Schema v2" design doc; the migration under `supabase/migrations` is its executable form.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind 4)
- Supabase: Postgres with row-level security, Google-only sign-in, private Storage bucket
- Supabase CLI installed as a dev dependency: run it with `npx supabase …`

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the dev project's URL and keys
   from the Supabase dashboard under Project Settings → API.
3. `npx supabase login` once, then link this checkout to the dev project:
   `npx supabase link --project-ref <project-ref>`
4. Apply migrations to the dev project: `npx supabase db push`
5. Seed the two workspaces and three brands: `npx supabase db query --file supabase/seed.sql`
   (or paste `supabase/seed.sql` into the SQL editor)
6. `npm run dev` and open http://localhost:3000

## Schema changes

Never edit the database by hand. Add a file under `supabase/migrations` named
`YYYYMMDDHHMMSS_short_description.sql`, then `npx supabase db push`. Migrations run in
order and are recorded in the database, so every environment ends up identical.

## Environments

| | Supabase project | Vercel |
|---|---|---|
| dev | pivot-dev | preview deployments |
| prod | created at cutover | production |

Integration keys for ShipStation, Stripe, and Squarespace are not part of the beta.
When they arrive they live as Supabase edge-function secrets, never in the database or the browser.

## Roles

- **workspace_admin**: runs one or more workspaces. Wes and Cullen hold both, so they see everything.
- **watchmaker**: the bench. Scoped to brands.
- **brand_rep**: intake and parts for a set of brands.

There is no self-signup. A workspace admin adds people on Settings → Users; sign-in is Google only.
