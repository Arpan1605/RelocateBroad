# RelocateBoard

RelocateBoard is a Germany relocation job dashboard for international UX/UI designers, product designers, and frontend professionals.

The MVP is shaped as a personal-first SaaS product: useful immediately for one job hunt, but structured so it can grow into a multi-user platform.

## MVP Scope

- Dashboard with job hunt metrics
- Jobs list with Germany-focused filters
- Match scoring display
- Save and apply actions
- Trello-style application tracker
- Manual job import
- PostgreSQL schema for SaaS-ready data

## Tech Stack

- Angular 20
- PrimeNG
- TailwindCSS
- Node.js
- Express
- PostgreSQL

## Project Structure

```text
apps/
  web/    Angular frontend
  api/    Node.js API
db/
  schema.sql
```

## Getting Started

Install dependencies from the repository root:

```bash
npm install
```

Run the frontend:

```bash
npm run dev:web
```

Run the API:

```bash
npm run dev:api
```

## Product Direction

Sprint 1 focuses on a manual but polished workflow. Sprint 2 can add automatic job fetching, match scoring, and daily summaries.

## Live Job Updates

The GitHub Pages deployment runs every day at 03:30 UTC and refreshes `jobs.json` from:

- Arbeitnow
- Remote OK

The frontend reads that generated static feed and can show browser notifications for newly seen jobs after the user clicks **Enable Alerts**.

For daily email summaries, add these repository secrets in GitHub:

- `RESEND_API_KEY`
- `NOTIFICATION_EMAIL`
- `FROM_EMAIL` optional
