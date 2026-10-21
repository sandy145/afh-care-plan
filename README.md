# AFH Care Plan

Keeps a Washington Adult Family Home **Negotiated Care Plan** (DSHS NCP) current by voice, with a full change history, a 14-day review cycle, and printouts that drop straight into the resident's binder.

- **Residents** — the home's residents with a badge showing when each 14-day review is due.
- **Care plan** — every NCP section as a tab, in form order, laid out in the form's three columns (section fields · resident strengths · what the caregiver does). Changed fields show the previous value struck through.
- **Voice update** — record a note on the phone; Claude maps it to the exact NCP fields it changes and proposes new wording. Confirm / edit / skip each change, then apply. Nothing touches the plan until confirmed.
- **Edit by hand** — same thing without the microphone.
- **Change log** — every change: old value, new value, who, when, reason, source (voice or by hand), significant flag, plan version. Append-only.
- **2-week review** — lists everything since the last review, records the review, prints.
- **Print** — the NCP in the form's layout, changed values marked with the previous text struck through and a dated stamp, plus a **Change Log and Review Record** addendum page with signature lines. "Changed pages only" prints just the pages that need swapping in the binder.

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

### Database

The schema is in `supabase/migrations` (applied to the `afh-care-plan` Supabase project). To load the NCP template into a fresh database:

```bash
npx tsx scripts/gen-seed-sql.ts > supabase/seed-template.sql
# then run supabase/seed-template.sql in the SQL editor
```

The template itself lives in `src/lib/ncp-template.ts` — 22 sections, 154 fields, matching the DSHS Sample AFH Negotiated Care Plan. Change the form there, re-run the script, and the app, the print view and the AI mapping all follow.

### Users

Sign up from the login screen; pick **AFH Admin** or **Caregiver**. The first home in the database is assigned automatically (single-home MVP). Both roles can record notes and confirm changes; every change carries the signed-in user's name.

Demo logins on the current Supabase project (change these before real use):

- `admin@demo.afh` / `CarePlan2026!`
- `caregiver@demo.afh` / `CarePlan2026!`

### Deploy

Vercel: import the repo, add the three env vars, deploy. Supabase Auth → URL configuration → add the Vercel URL to redirect URLs.

## How data is stored

- `field_values` is append-only: a change closes the old row (`effective_to`) and inserts a new one, so the plan as of any date can be reconstructed.
- `apply_changes(resident, changes[], voice_note?)` is a Postgres function that does this atomically, writes `change_log`, and bumps `plan_versions`.
- Row-level security limits every table to the signed-in user's home.
- Voice-note transcripts are kept in `voice_notes` with the proposed changes; audio upload is a later phase.

## PHI

Resident records are protected health information. Keep the Supabase project private, use real accounts (not the demo logins) for real residents, and sign a BAA with your hosting and AI providers before entering real data.
