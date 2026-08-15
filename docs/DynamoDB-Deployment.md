# DynamoDB AWS Migration

A guided walkthrough for moving HackDekh from **DynamoDB Local (Docker)** to **AWS DynamoDB** when you are ready to deploy.

## Navigation

- [Architecture](Architecture.md)
- [API](API.md)
- [Database](Database.md)
- [Deployment](Deployment.md)
- [Scraper System](Scraper-System.md)

## What Changes

The application code is **identical** in both environments. The only real difference is configuration:

| Concern | Local (Docker) | AWS |
| --- | --- | --- |
| Where data lives | `amazon/dynamodb-local` container on port 8000 | Fully managed DynamoDB service in an AWS region |
| Backend env `DYNAMODB_ENDPOINT` | `http://localhost:8000` | **Omit this variable** |
| Credentials | `local` / `local` | Real IAM access key + secret (or an IAM role) |
| `AWS_REGION` | `ap-south-1` (any) | The region where you create the tables |
| Table provisioning | Auto-created by `ensureTables()` on boot | Auto-created the same way, or provisioned in advance |
| Frontend `VITE_BACKEND_URL` | `http://localhost:8001/api/v1` | Your deployed backend URL, e.g. `https://api.example.com/api/v1` |

## Step 1 — Create the DynamoDB tables on AWS

The backend auto-creates all nine tables on startup via `ensureTables()` in `backend/src/db/initTables.ts` (idempotent, on-demand billing). You have two options:

**Option A — let the backend create them (simplest)**

1. Deploy the backend with the env variables from Step 2.
2. On first boot it will `CreateTable` any tables that do not exist (plus the invitation TTL on `expiresAt`).
3. Verify with the AWS console → DynamoDB → Tables, or:

```bash
aws dynamodb list-tables --region ap-south-1
```

Expected tables (prefix `hackdekh-` by default):

```
hackdekh-users, hackdekh-hackathons, hackdekh-teams, hackdekh-teammembers,
hackdekh-teaminvitations, hackdekh-teamhackathons, hackdekh-stages,
hackdekh-pendingreflections, hackdekh-reflections
```

**Option B — provision in advance (optional)**

If you prefer to create them manually, replicate the specs from `backend/src/db/initTables.ts` (key schemas + GSIs + TTL listed in [Database.md](Database.md#tables)). This is only needed if you want full control over billing mode (e.g. `PROVISIONED`) or point-in-time recovery before the first deploy.

> Tip: enable **Point-in-Time Recovery** on the tables in production for backup/restore. On-demand billing (`PAY_PER_REQUEST`) is a good default for this workload.

## Step 2 — IAM credentials for the backend

Create an IAM user (or better, an IAM role for the compute service you deploy on — EC2/EKS/Lambda/ECS) and attach a policy granting DynamoDB access **only to the HackDekh tables**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:TransactWriteItems",
        "dynamodb:DescribeTable",
        "dynamodb:ListTables"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:<ACCOUNT_ID>:table/hackdekh-*",
        "arn:aws:dynamodb:*:<ACCOUNT_ID>:table/hackdekh-*/index/*"
      ]
    }
  ]
}
```

If you provision tables manually, also allow `dynamodb:CreateTable` (or create them in the console first).

## Step 3 — Update the backend `.env` (the main change)

Start from `backend/.env.example`, remove `DYNAMODB_ENDPOINT`, and set real values:

```dotenv
# Server
PORT=8001

# Database / DynamoDB (AWS)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...            # real IAM access key
AWS_SECRET_ACCESS_KEY=...            # real IAM secret key
DYNAMODB_TABLE_PREFIX=hackdekh
# DO NOT set DYNAMODB_ENDPOINT here - that is only for DynamoDB Local

# Auth tokens / GitHub / SMTP / CRON - unchanged
```

Notes:

- **Do not commit `.env`** — it is gitignored. Set these as environment variables in your hosting platform (or use AWS Secrets Manager).
- Prefer **IAM roles over long-lived keys** on compute services; the SDK picks up the role automatically and you can leave the access keys unset.
- `DYNAMODB_ENDPOINT` must be absent. If it is set, the backend talks to that local endpoint instead of AWS.

## Step 4 — Stop using DynamoDB Local

Once you have moved to AWS, you no longer need the local container for the deployed environment:

```bash
docker compose down
```

You can keep it running for local development only. To point local development back at your AWS tables instead of the container, remove `DYNAMODB_ENDPOINT` from `backend/.env` and set the real credentials — the same backend works against both.

## Step 5 — Point the frontend at the deployed backend

In the frontend environment used by your hosting platform (Vercel/Netlify/etc.):

```dotenv
VITE_BACKEND_URL=https://your-api-domain.com/api/v1
```

The backend routes are mounted under `/api/v1`, so keep that prefix.

## Step 6 — (Optional) Seed or migrate data

- **Fresh start:** run the seed against AWS once to load demo users/teams:

```bash
cd backend
npx ts-node src/seed.ts
```

- **Migrating existing local data:** export the nine tables from DynamoDB Local and import them into AWS. For small datasets:

```bash
# 1. export each table from local
aws dynamodb scan --table-name hackdekh-users --endpoint-url http://localhost:8000 > users.json
# 2. import into AWS (repeat for each table)
aws dynamodb batch-write-item --request-items file://users-import.json --region ap-south-1
```

For larger datasets use the on-demand **AWS Data Pipeline / AWS Glue** or the AWS Console **Import from S3** feature. IDs are UUIDs, so records remain compatible across environments.

## Verification Checklist

1. `aws dynamodb list-tables --region <region>` shows all nine `hackdekh-*` tables.
2. Backend boots and logs `[DB] DynamoDB connected successfully`.
3. `curl https://your-api-domain.com/api/v1/ping` returns `{"success":true,"message":"pong"}`.
4. A scraper route (`/api/v1/scrape/devfolio_scrape`) upserts rows into `hackdekh-hackathons`.
5. Login with a seeded account returns a valid access token.
6. The frontend loads and calls the API without 404s or CORS errors.

## Rollback

Revert to local: set `DYNAMODB_ENDPOINT=http://localhost:8000`, put the local dummy credentials back, and restart the container with `docker compose up -d`. No code changes are required.