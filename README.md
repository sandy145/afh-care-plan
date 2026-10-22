# AFH Care Plan

Keeps a Washington Adult Family Home **Negotiated Care Plan** (DSHS NCP) current by voice, with a full change history, a 14-day review cycle, and printouts that drop straight into the resident's binder.

- **Residents** — the home's residents with a badge showing when each 14-day review is due.
- **Care plan** — every NCP section as a tab, in form order, laid out in the form's three columns (section fields · resident strengths · what the caregiver does). Changed fields show the previous value struck through.
- **Voice update** — record a note on the phone; Claude maps it to the exact NCP fields it changes and proposes new wording. Confirm / edit / skip each change, then apply. Nothing touches the plan until confirmed.
- **Edit by hand** — same thing without the microphone.
- **Change log** — every change: old value, new value, who, when, reason, source (voice or by hand), significant flag, plan version. Append-only.
- **2-week review** — lists everything since the last review, records the review, prints.
- **Print** — the NCP in the form's layout, changed values marked with the previous text struck through and a dated stamp, plus a **Change Log and Review Record** addendum page with signature lines. Three scopes: the full plan, changed pages only since the last review, or every change ever recorded (`?history=1`).
- **Multiple Adult Family Homes** — a user can belong to any number of homes, each with its own residents, plan, and change history. An admin invites others by email from **Users** (the people icon in the header); accepting the invite email adds them to that home. Registering a new account (or using "Register a new home" when you don't yet belong to one) creates a brand-new home and makes you its admin. A switcher in the header appears once you belong to 2+ homes.

## Stack

Next.js 15 (App Router) · Supabase (Postgres, Auth, RLS) · Anthropic API (voice-note mapping) · browser Web Speech API (transcription) · Tailwind.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

`.env.local`:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page (publishable / anon key) |
| `ANTHROPIC_API_KEY` | console.anthropic.com. Server-only. Without it, voice notes are saved and transcribed but not mapped — the user picks the section and edits by hand. |
| `SUPABASE_SERVICE_ROLE_KEY` | Same API settings page (service_role key — keep this one secret, never expose it to the browser). Server-only. Without it, inviting a user by email still records the invite but sends no email. |
| `NEXT_PUBLIC_SITE_URL` | Optional. Your deployed URL, used to build the invite email's link. Falls back to the request's own origin if unset. |

### Database

The schema is in `supabase/migrations` (applied to the `afh-care-plan` Supabase project). To load the NCP template into a fresh database:

```bash
npx tsx scripts/gen-seed-sql.ts > supabase/seed-template.sql
# then run supabase/seed-template.sql in the SQL editor
```

The template itself lives in `src/lib/ncp-template.ts` — 22 sections, 154 fields, matching the DSHS Sample AFH Negotiated Care Plan. Change the form there, re-run the script, and the app, the print view and the AI mapping all follow.

### Users and homes

Signing up from the login screen registers a brand-new Adult Family Home (you name it) and makes you its admin. To add someone to an *existing* home, an admin sends an invite from **Users**: new addresses get a real Supabase invite email (set a password, land signed in and already a member); an address that already has an account elsewhere is added directly, no email needed. Both roles can record notes and confirm changes; every change carries the signed-in user's name. A user who belongs to more than one home gets a switcher in the header.

Demo logins on the current Supabase project (change these before real use):

- `admin@demo.afh` / `CarePlan2026!`
- `caregiver@demo.afh` / `CarePlan2026!`

### Deploy

Vercel: import the repo, add the env vars above, deploy. Supabase Auth → URL configuration → add the Vercel URL (and `/accept-invite`) to redirect URLs.

## How data is stored

- `field_values` is append-only: a change closes the old row (`effective_to`) and inserts a new one, so the plan as of any date can be reconstructed.
- `apply_changes(resident, changes[], voice_note?)` is a Postgres function that does this atomically, writes `change_log`, and bumps `plan_versions`.
- `home_memberships` holds every home a user belongs to and their role there; `profiles.home_id`/`role` track only their *currently active* home, switched via `switch_active_home()`. Row-level security resolves "the signed-in user's home" through `my_home_id()`, which only returns a value while a live membership backs it — removing someone from a home (`home_memberships`) revokes their access immediately, independent of their `profiles` row.
- `home_invites` tracks pending/accepted/revoked email invitations per home.
- Voice-note transcripts are kept in `voice_notes` with the proposed changes; audio upload is a later phase.

## PHI

Resident records are protected health information. Keep the Supabase project private, use real accounts (not the demo logins) for real residents, and sign a BAA with your hosting and AI providers before entering real data.
