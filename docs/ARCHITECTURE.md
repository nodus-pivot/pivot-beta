# Architecture

How the Pivot front end is organized and why. Read this before adding a screen.

## Three layers

1. **`src/app` is routing only.** Every `page.tsx` fetches through a query function and renders a
   feature component. No business logic in route files.
2. **`src/features/<domain>`** holds the real code, grouped by what the business calls things:
   `auth`, `workspaces`, `tickets`, `pipeline`, `ops`. Each feature owns its `queries.ts`
   (reads), `actions.ts` (writes), and components.
3. **`src/components/ui`** and **`src/lib`** are shared, domain-free code: UI primitives in one,
   Supabase clients and formatters in the other.

```
src/
  proxy.ts                        refresh the session cookie on every request; redirect signed-out users
  app/
    layout.tsx                    fonts, theme tokens, html shell
    (public)/                     marketing home, customer status lookup
    (auth)/                       sign-in page, auth callback
    (app)/                        everything behind sign-in; layout requires a user
      service-center/             sidebar layout, overview, tickets/new, tickets/[number]
      ops/                        watches, parts
  features/
    auth/                         sign in / sign out actions, sign-in form
    workspaces/                   current-workspace cookie, switcher
    tickets/                      queries, actions, header, pipeline row, timeline, stages/*, autosave
    pipeline/                     stage list, ordering, conditional steps, guards. Pure TS. Tested.
    ops/                          queries, actions, watch and part forms, tables
  components/
    ui/                           button, input, select, checkbox, dialog, pill, field
    layout/                       app nav, sidebar
  lib/
    supabase/                     server.ts, client.ts, admin.ts, database.types.ts (generated)
    format.ts, utils.ts
```

## Rules

- **Reads happen in server components** through a feature's `queries.ts`. Every query takes a
  Supabase client created for the current request, so row-level security is the authorization.
  There is no second permission system in the app.
- **Every write is a server action** in a feature's `actions.ts`: validate with zod, write, then
  `revalidatePath`. Autosave calls the same actions, debounced. Stage guards run in the action
  before calling the `set_stage` RPC, which is the only thing allowed to change `tickets.stage`.
- **`features/pipeline` has no React.** Stage list, per-workspace ordering, conditional steps, and
  guards are plain TypeScript with vitest tests. It is the one module where a bug costs money.
- **One component per stage** under `features/tickets/stages`, matching mockups 1a–1h. The ticket
  page reads `ticket.stage` and renders the matching one.
- **Database types are generated**: `npm run db:types` after every migration, committed together.
- **Current workspace is a cookie** (`pivot_ws`), set by the switcher, read in the signed-in layout.
- **Server-only secrets** (`SUPABASE_SERVICE_ROLE_KEY`) are read only in `lib/supabase/admin.ts`,
  which is imported only from server actions that need to bypass RLS (creating users).

## Styling

Tailwind 4. The design handoff's tokens are declared once in `globals.css` as theme variables and
used everywhere by name. Fonts: Inter (body, headings ≤ 500 weight) and JetBrains Mono (ticket
numbers, SKUs, money) via `next/font`. Icons: Phosphor. UI primitives come from shadcn/ui,
copied into `components/ui` and restyled to the tokens; it is not a runtime dependency.

## Deliberately not used

No client state library (server components + actions cover it). No API routes beyond the auth
callback and future webhooks. No Cache Components mode yet; the app is per-user and small.
