# Referral Hub

Installable PWA for psychiatric referral teams. Therapists update daily capacity; psychiatrists see a live colored board; admins manage accounts and morning push reminder settings.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Postgres + Prisma
- Auth.js (credentials) with roles: `ADMIN`, `PSYCHIATRIST`, `THERAPIST`
- Web Push (VAPID) via service worker — works on **Android Chrome** and **iOS 16.4+ Home Screen web apps**

## Quick start

1. Create a Postgres database (local example):

```bash
createdb referral_hub
```

2. Copy env and fill values:

```bash
cp .env.example .env
```

Generate secrets:

```bash
openssl rand -base64 32          # AUTH_SECRET
npx web-push generate-vapid-keys # VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
```

Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to the same value as `VAPID_PUBLIC_KEY`.

`VAPID_SUBJECT` must be a real `mailto:` or `https:` URL (Apple rejects reserved TLDs like `.test` with `BadJwtToken`).

3. Install, migrate, seed:

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@referralhub.test` | `Admin123!` |
| Psychiatrist | `psych@referralhub.test` | `Psych123!` |
| Therapist | `therapist@referralhub.test` | `Therapy123!` |

Seed also creates popular fictional therapists (Frasier Crane, Jennifer Melfi, Sean Maguire, and more) with mixed daily capacity for today through the next ~3 months so demos work without re-seeding.

## Roles

- **Psychiatrist** — `/psychiatrist` board with 3-column / 1-column bubble views, search, sort, status filters
- **Therapist** — `/therapist` daily capacity + `/therapist/profile` (avatar, details, timezone)
- **Admin** — `/admin` user management + `/admin/settings` notification time & frequency

## Push notifications (iOS + Android)

### Android

1. Open the site in Chrome
2. Install when prompted (or use the in-app Install button)
3. Tap **Enable notifications** and allow permission

### iOS (critical)

Web Push on iPhone/iPad only works when the app is added to the Home Screen:

1. Open the site in **Safari**
2. Share → **Add to Home Screen**
3. Launch **Referral Hub** from the Home Screen icon (not a Safari tab)
4. Tap **Enable notifications** and allow permission

Reminders fire at the admin-configured clock time in **each therapist’s timezone**.

### Cron

`GET /api/push/cron` with header `Authorization: Bearer $CRON_SECRET` (or `?secret=`).

On Vercel, `vercel.json` schedules this every 10 minutes. Set `CRON_SECRET` in project env (Vercel Cron sends it as Bearer automatically when configured).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Auth.js secret |
| `AUTH_URL` | App origin (e.g. `http://localhost:3000`) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same as public VAPID key (browser) |
| `CRON_SECRET` | Protects the reminder cron route |

## Scripts

```bash
npm run dev        # local server
npm run build      # production build
npm run db:push    # sync Prisma schema
npm run db:seed    # reset seed data
npm run db:setup   # push + seed
```
