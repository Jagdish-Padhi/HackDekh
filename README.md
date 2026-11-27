<div align="center">

  <br />
  <a href="https://hackdekh.jdecodes.tech/">
    <img src="docs/assets/hackdekh-logo.svg" alt="HackDekh" width="400" />
  </a>
  <br />
  <br />

  <h3>Discover Faster. Build Better. Win Together.</h3>

  <p>
    <a href="https://hackdekh.jdecodes.tech/">Live App</a> •
    <a href="#overview">Overview</a> •
    <a href="#core-features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#environment-variables">Configuration</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/License-MIT-black?style=flat-square" alt="License" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-Express_5-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Redis-Cache-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis" />
  </p>

</div>

---

## Overview

Students rarely miss out on hackathons because they lack skills. They miss out because discovery and coordination are fragmented across Devfolio, Unstop, Devpost, MLH, Hack2Skill, and buried group-chat links.

**HackDekh brings the entire student hackathon workflow into one fast, zero-friction app:**
- **Unified Discovery Feed**: Live hackathons synced daily at 3:00 AM from top platforms with instant cached browsing.
- **"Worth It?" Fit Check**: Score any hackathon against your city, preferred mode, team size, and minimum prize before committing a weekend.
- **1-Click Tracking & Stage Pipeline**: Track solo immediately in one click, mark registered when you apply, and manage rounds cleanly in one Tracker.
- **6-Digit Squad Codes**: Create squads and let teammates join in seconds via a 6-character code or public squad schedule link.
- **Shareable Public Pages**: Clean `/hackathons/:slug` and `/squad/:code` pages with prizes, deadlines, and team sizes, with no login wall to preview.

---

## Core Features

### Unified Hackathon Feed & Smart Caching
- Aggregates and normalizes live hackathons from **Devfolio**, **Unstop**, **Devpost**, **MLH**, and **Hack2Skill**.
- Scheduled daily **3:00 AM** background sync keeps listings fresh without blocking user traffic.
- TTL-aware client caching (`CacheContext`) paired with Redis backend caching makes switching tabs instantaneous, with resilient image loading and fallback handling.
- Search and filter by platform, mode (`Online` / `Offline` / `Hybrid`), location, team size, prize pool, and deadline.

### "Worth It?" Fit Engine
- Configure your personal preferences once in **Settings** (home city, preferred mode, target team size, and minimum prize threshold) or directly inside the **Worth It?** modal.
- Every hackathon card evaluates fit into a clear verdict (**Strong Fit**, **Worth Considering**, or **Skip**) with a transparent score breakdown.

### 1-Click Track & Stage-by-Stage Tracker
- Click **Track** on any hackathon card to add it to your Tracker immediately, without a forced squad-creation modal.
- Single source of truth in **Tracker** with clean status tabs (**In Queue**, **Registered**, **Finished**) and a compact **Squad Filter** dropdown in the top header bar.
- Register via the external platform link, mark registered in one click, and advance through custom round stages with deadlines.

### Frictionless Squads & Public Schedules
- Create squads for different hackathons or recurring teammates.
- Invite teammates directly with a **6-character Join Code**, with no email invite queues or approval clutter.
- Share a public `/squad/:code` link so teammates or mentors can view the squad's tracked hackathons and upcoming deadlines.

### Focused Dashboard & Auth
- Single-screen **Dashboard** with a 75%/25% layout: upcoming stage deadlines on the left, live status counters on the right.
- Supports email/password (with Brevo SMTP verification), one-click **Google Auth** (Firebase Admin SDK), and **GitHub OAuth**, backed by route-level rate limiting.

---

## Technology Stack

| Domain | Technologies |
|:---|:---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Lucide Icons |
| **Backend** | Node.js, Express 5, TypeScript, Node-cron |
| **Database & Cache** | MongoDB (Mongoose ODM), Redis, TTL-aware Client Cache |
| **Scraper Engine** | Axios, Cheerio, Custom Multi-Platform Normalizers |
| **Authentication & Email** | JWT, bcrypt, Firebase Admin (Google Auth), GitHub OAuth, Brevo SMTP |
| **Security & Quality** | Express Rate Limit (IP & route-level), Supertest, Vitest |

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/Jagdish-Padhi/HackDekh.git
cd HackDekh
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env    # Configure your database and auth credentials
npm run dev
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
cp .env.example .env.local    # Ensure VITE_BACKEND_URL points to your API
npm run dev
```

Visit `http://localhost:5173` to explore HackDekh locally.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | HTTP port for the Express server (default `8000`) |
| `MONGODB_URI` | MongoDB connection URI (`mongodb://127.0.0.1:27017/hackdekh`) |
| `ACCESS_TOKEN_SECRET` / `EXPIRY` | JWT access token secret and lifetime (e.g. `1d`) |
| `REFRESH_TOKEN_SECRET` / `EXPIRY` | JWT refresh token secret and lifetime (e.g. `10d`) |
| `REDIS_URL` | Redis instance URL (`redis://127.0.0.1:6379`) |
| `CACHE_ENABLED` | Toggle for cache layer (`true` / `false`) |
| `CRON_SECRET` | Secret key required to invoke protected scraper cron routes |
| `GITHUB_CLIENT_ID` / `SECRET` | GitHub OAuth application credentials |
| `FIREBASE_*` | Firebase project credentials for Google token verification |
| `SMTP_*` / `BREVO_API_KEY` | SMTP configuration for email verification & password resets |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | Base API endpoint (e.g. `http://localhost:8000/api/v1`) |
| `VITE_GITHUB_CLIENT_ID` | GitHub OAuth client ID for browser login |
| `VITE_FIREBASE_*` | Firebase web client config for one-tap Google authentication |

---

## Available Scripts

### Backend (`/backend`)
- `npm run dev`: Launch API with nodemon hot-reloading
- `npm run build`: Compile TypeScript into production bundle in `dist/`
- `npm test`: Run automated unit and integration tests with Vitest

### Frontend (`/frontend`)
- `npm run dev`: Start Vite development server
- `npm run build`: Run TypeScript validation and create minified production bundle
- `npm test`: Run component unit tests

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for complete terms.

---

<div align="center">
  <sub>Built by <a href="https://jdecodes.tech">Jagdish Padhi</a> for builders who ship.</sub>
</div>
