# Deployment

## Navigation

- [Architecture](Architecture.md)
- [API](API.md)
- [Database](Database.md)
- [Scraper System](Scraper-System.md)

## Runtime Layout

HackDekh is deployed as two applications:

| Component | Deployment style |
| --- | --- |
| Frontend | Static React build served from a hosting platform such as Vercel |
| Backend | Long-running Node.js process with MongoDB access |

## Required Configuration

### Backend Environment Variables

| Variable | Purpose | Required |
| --- | --- | --- |
| `MONGO_URI` | MongoDB connection string | Yes |
| `PORT` | Backend listen port | Yes in deployment, optional locally |
| `ACCESS_TOKEN_SECRET` | Access token signing secret | Yes |
| `ACCESS_TOKEN_EXPIRY` | Access token lifetime | Yes |
| `REFRESH_TOKEN_SECRET` | Refresh token signing secret | Yes |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime | Yes |
| `CRON_SECRET` | Protects manual cron triggers | Yes for protected cron usage |
| `SMTP_HOST` | Mail server host | Optional unless invitation email is used |
| `SMTP_PORT` | Mail server port | Optional unless invitation email is used |
| `SMTP_USER` | Mail server username | Optional unless invitation email is used |
| `SMTP_PASS` | Mail server password | Optional unless invitation email is used |
| `SMTP_FROM` | From address for email delivery | Optional unless invitation email is used |

### Frontend Runtime

The frontend is built with Vite and needs the deployed backend API base URL configured in the frontend environment used by the hosting platform.

## Local Build Flow

1. Install backend dependencies and set the backend environment variables.
2. Install frontend dependencies.
3. Run the backend build.
4. Run the frontend build.

The repository already contains a Vercel rewrite configuration for SPA routing on the frontend.

## Deployment Notes

- Keep the backend and frontend deployed against compatible API URLs.
- Ensure the MongoDB instance is reachable from the backend runtime.
- If email invitations are enabled, verify SMTP credentials before enabling the flow in production.
- The cron scheduler runs inside the backend process, so the backend must stay online for scheduled refreshes to execute.
