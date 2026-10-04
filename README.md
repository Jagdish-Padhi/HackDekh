<div align="center">

  <br />
  <a href="https://hackdekh.jdecodes.tech/">
    <img src="docs/assets/hackdekh-logo.svg" alt="HackDekh" width="400" />
  </a>
  <br />
  <br />

  <h3>Centralizing Hackathon Ecosystem.</h3>

  <p>
    <a href="https://hackdekh.jdecodes.tech/">Live App</a> •
    <a href="#-overview">Overview</a> •
    <a href="#-core-features">Features</a> •
    <a href="#-product-preview">Preview</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-environment-variables">Configuration</a>
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

## 🧭 Overview

Hackathon teams rarely lose because of bad ideas. They lose because the process around the build is messy — listings scattered across Devfolio and Devpost, deadlines slipping on Unstop, team coordination lost in chaotic WhatsApp groups, and judge feedback forgotten minutes after demo day.

**HackDekh replaces that chaos with one clean, unified workspace:**
- **Aggregate everything** — Live hackathon feeds automatically normalized from top platforms.
- **Form dedicated teams** — Instant roster management, invite codes, and magic links.
- **Stage-by-stage tracking** — Clear milestones from idea submission to demo day and finals.
- **Capture reflections** — Document judge questions, feedback, and learnings to build institutional memory.

---

## 🧩 Core Features

### 🔍 Unified Hackathon Feed
- Automatically pulls from Devfolio, Devpost, Unstop, MLH, and Hack2Skill.
- Background cron aggregation runs on an independent cadence without blocking incoming traffic.
- Real-time search, filters for online/in-person modes, upcoming deadlines, and prize pools.

### 👥 Team Workspaces
- Build distinct teams for different hackathons or collaborate with recurring teammates.
- Invite members instantly via shareable 6-character team codes, direct username lookup, or email magic links.
- Dedicated roster roles and team directories with zero chat clutter.

### 📊 Stage-by-Stage Milestone Tracker
- Break each hackathon campaign into structured stages: *Idea Phase*, *Shortlisted*, *Prototype Build*, *Demo Day*, and *Winner*.
- Transition statuses with real-time feedback and never miss a submission window again.

### 🪞 Judge Reflections & Team Knowledge
- Document judge queries, pitch feedback, and retrospective notes right after presentations.
- Turn every hackathon into compounding insights so future hackathons are easier to win.

### 🔐 Multi-Provider Authentication & Security
- Email and password sign-in with Brevo SMTP email verification.
- One-click Google Authentication (via Firebase Admin SDK) and GitHub OAuth.
- Strict rate limiting on authentication, join codes, verification emails, and scraper routes.

---

## 🖼️ Product Preview

<div align="center">

**Dashboard & Performance Analytics**
![Dashboard](docs/screenshots/dashboard.png)

**Unified Hackathon Catalog & Filtering**
![Hackathon Listing](docs/screenshots/hackathon-listing.png)

**Team Hub & Roster Management**
![Team Workspace](docs/screenshots/teams.png)

**Stage Milestones & Retrospectives**
![Stage Tracking](docs/screenshots/track.png)

</div>

---

## 🛠️ Technology Stack

| Domain | Technologies |
|:---|:---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons |
| **Backend** | Node.js, Express 5, TypeScript, Node-cron |
| **Database & Cache** | MongoDB (Mongoose ODM), Redis |
| **Scraper Engine** | Axios, Cheerio, Custom Multi-Platform Normalizers |
| **Authentication & Email** | JWT, bcrypt, Firebase Admin (Google Auth), GitHub OAuth, Brevo SMTP |
| **Security & Quality** | Express Rate Limit (IP & route-level), Supertest, Vitest |

---

## 🚀 Quick Start

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

## ⚙️ Environment Variables

### Backend — `backend/.env`

| Variable | Description |
|---|---|
| `PORT` | HTTP port for the Express server (default `8000`) |
| `MONGODB_URI` | MongoDB connection URI (`mongodb://127.0.0.1:27017/hackdekh`) |
| `ACCESS_TOKEN_SECRET` / `EXPIRY` | JWT access token secret and lifetime (e.g. `1d`) |
| `REFRESH_TOKEN_SECRET` / `EXPIRY` | JWT refresh token secret and lifetime (e.g. `10d`) |
| `REDIS_URL` | Redis instance URL (`redis://127.0.0.1:6379`) |
| `CACHE_ENABLED` | Toggle for in-memory cache layer (`true` / `false`) |
| `CRON_SECRET` | Secret key required to invoke protected scraper cron routes |
| `GITHUB_CLIENT_ID` / `SECRET` | GitHub OAuth application credentials |
| `FIREBASE_*` | Firebase project credentials for Google token verification |
| `SMTP_*` / `BREVO_API_KEY` | SMTP configuration for email verification & invite dispatch |

### Frontend — `frontend/.env.local`

| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | Base API endpoint (e.g. `http://localhost:8000/api/v1`) |
| `VITE_GITHUB_CLIENT_ID` | GitHub OAuth client ID for browser login |
| `VITE_FIREBASE_*` | Firebase web client config for one-tap Google authentication |

---

## 📜 Available Scripts

### Backend (`/backend`)
- `npm run dev`: Launch API with nodemon hot-reloading
- `npm run build`: Compile TypeScript into production bundle in `dist/`
- `npm test`: Run automated unit and integration tests with Vitest

### Frontend (`/frontend`)
- `npm run dev`: Start Vite development server
- `npm run build`: Run TypeScript validation and create minified production bundle
- `npm test`: Run component unit tests

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for complete terms.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/Jagdish-Padhi">Jagdish Padhi</a> for builders everywhere.</sub>
</div>
