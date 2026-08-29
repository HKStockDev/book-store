# IWWEI Book Store

Monorepo for the IWWEI digital bookstore platform: a Spanish digital content platform based in Madrid.

## Packages

| Package | Description |
|---------|-------------|
| `packages/web` | Next.js frontend - user app, admin panel, publisher portal |
| `packages/api` | NestJS REST API (Supabase/Postgres) |

## Modules

1. **User app** - registration, onboarding, subscriptions, purchases, multi-format reader, offline reading, lists & reviews
2. **Publisher portal** - content upload/management, promotions, CPM reports
3. **Admin panel** - users, editorials, content, payments, CPM, dashboards, reporting
4. **CPM monetization** - impression metrics, publisher settlements

## Integrations

- **Apryse** - document viewer
- **Taddy** - comics & podcasts
- **World News API** - news aggregation

## Local development

```bash
pnpm install

# Terminal 1: API (port 3000)
pnpm api:dev

# Terminal 2: Web (port 3001)
pnpm web:dev
```

Copy env files:

- `packages/api/.env.example` → `packages/api/.env`
- `packages/web/.env.example` → `packages/web/.env.local`

Run database setup:

```bash
pnpm api:db:setup
```

## Demo accounts

Password for all: `Demo1234!`

| Role | Email |
|------|-------|
| admin | admin@iwwei.demo |
| publisher | publisher@planeta.demo |
| user | user@iwwei.demo |

## Deploy

- **Frontend:** Vercel (`packages/web`)
- **API:** Render/Railway (`packages/api`)
