# HackDekh — Complete AWS Setup & Live Demo Guide

This guide provides end-to-end instructions for deploying and syncing all HackDekh services on a single AWS account. It is specifically structured so that anyone pulling this repository onto a fresh laptop can configure environment variables, provision the cloud services, and present a live evaluation demo where each team member showcases their assigned AWS component.

---

## Architecture & Member Ownership

| Member | Assigned AWS Service | Live Demo Responsibility |
| :--- | :--- | :--- |
| **Member 1** | **Amazon DynamoDB** | Explains the NoSQL data model, 9 auto-provisioned tables, partition/sort keys, and shows live items in the AWS Console. |
| **Member 2** | **Amazon S3** | Demonstrates the S3 storage bucket, CORS setup, and live avatar/document uploads via direct Presigned URLs. |
| **Member 3** | **Amazon EC2 & CloudFront** | Demonstrates the Ubuntu Linux EC2 backend instance running on PM2 and the CloudFront CDN distributing the frontend. |
| **Member 4** | **Amazon CloudWatch & AWS IAM** | Displays EC2 CPU/network telemetry metrics, CloudWatch log streams/alarms, and least-privilege IAM policies. |

---

## Phase 1: Local Setup on New Laptop

### 1. Prerequisites
Ensure the laptop has the following installed:
- **Node.js**: v20 LTS or higher (`node -v`)
- **Git**: (`git -v`)
- **AWS CLI** *(Optional but helpful)*: (`aws --version`)

### 2. Clone & Install Dependencies
Open a terminal (PowerShell, WSL, or macOS/Linux):

```bash
# 1. Clone your repository
git clone https://github.com/<your-username>/HackDekh.git
cd HackDekh

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install
cd ..
```

---

## Phase 2: AWS Account & IAM Configuration

All services will live inside **one single AWS account** in a consistent region (recommended: `us-east-1` for AWS Academy or `ap-south-1` for Mumbai).

### 1. Obtain Your IAM Credentials
1. Log into your **AWS Management Console**.
2. Select your target region from the top right navigation bar (e.g., `us-east-1` or `ap-south-1`).
3. Search for **IAM** $\rightarrow$ Click **Users** $\rightarrow$ Click your user (or create a new user named `hackdekh-admin`).
4. Under **Permissions**, ensure the user has policies attached for:
   - `AmazonDynamoDBFullAccess`
   - `AmazonS3FullAccess`
   - `AmazonEC2FullAccess`
   - `CloudWatchFullAccess`
   - `AmazonSESFullAccess`
5. Go to the **Security credentials** tab $\rightarrow$ Click **Create access key** $\rightarrow$ Select **Command Line Interface (CLI)**.
6. Copy your:
   - **Access Key ID** (`AKIA...`)
   - **Secret Access Key**
   - *(Note: If using **AWS Academy Learner Lab**, go to the lab dashboard, click **AWS Details**, and copy the `aws_session_token` as well).*

---

## Phase 3: Environment Variables (`.env`) Setup

### 1. Backend `.env` Configuration
In the `backend/` directory, create a `.env` file:

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and populate the real values:

```env
# ============================================================
# Server Configuration
# ============================================================
PORT=8000
NODE_ENV=development
FRONTEND_URL=*
APP_NAME=HackDekh

# ============================================================
# AWS Cloud & DynamoDB (Member 1)
# ============================================================
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Required ONLY if using AWS Academy Learner Lab (leave commented if using personal AWS):
# AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjE...

DYNAMODB_TABLE_PREFIX=hackdekh

# CRITICAL: Leave DYNAMODB_ENDPOINT commented out to use REAL AWS DynamoDB!
# DYNAMODB_ENDPOINT=http://localhost:8000

# ============================================================
# Amazon S3 File Storage (Member 2)
# ============================================================
AWS_S3_BUCKET_NAME=hackdekh-storage-2026

# ============================================================
# Authentication / JWT
# ============================================================
ACCESS_TOKEN_SECRET=super_secret_jwt_access_token_key_min_32_characters_long
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=super_secret_jwt_refresh_token_key_min_32_characters_long
REFRESH_TOKEN_EXPIRY=10d

# ============================================================
# Scraper / Cron Secret
# ============================================================
CRON_SECRET=hackdekh_super_secure_cron_secret_2026

# ============================================================
# SMTP / Email Delivery (Member 4 - Optional / Fallback)
# ============================================================
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
SMTP_FROM=HackDekh <noreply@hackdekh.com>
```

### 2. Frontend `.env` Configuration
In the `frontend/` directory, create a `.env` file:

```bash
cd ../frontend
cp .env.example .env
```

Open `frontend/.env`:

```env
# Local testing (change to EC2 public IP after Step 3)
VITE_BACKEND_URL=http://localhost:8000/api/v1

# GitHub OAuth Client ID (optional if testing local credentials)
VITE_GITHUB_CLIENT_ID=
```

---

## Phase 4: Service-by-Service Setup

### Service 1: Amazon DynamoDB (Member 1)

The backend code has an automated idempotent provisioning engine (`backend/src/db/initTables.ts`) that will auto-create all required tables when started.

1. Ensure `DYNAMODB_ENDPOINT` is commented out in `backend/.env`.
2. In your terminal, start the backend server once:
   ```bash
   cd backend
   npm run dev
   ```
3. Watch the console logs. It will connect to AWS and report creating tables:
   ```
   [DynamoDB] Initializing database tables...
   [DynamoDB] Created table: hackdekh_users
   [DynamoDB] Created table: hackdekh_hackathons
   [DynamoDB] Created table: hackdekh_teams
   ...
   [DynamoDB] All 9 tables ready.
   ```
4. **Console Verification**:
   - Open AWS Console $\rightarrow$ Search **DynamoDB** $\rightarrow$ Click **Tables**.
   - Verify all 9 tables have status **Active**.
5. **Trigger initial data ingestion**:
   - In a browser or terminal, trigger the scraper to populate live hackathons:
     ```bash
     curl -X POST http://localhost:8000/api/v1/scrape/refresh -H "x-cron-secret: hackdekh_super_secure_cron_secret_2026"
     ```
   - In DynamoDB Console $\rightarrow$ Click `hackdekh_hackathons` $\rightarrow$ **Explore Items** to see the populated hackathons.

---

### Service 2: Amazon S3 (Member 2)

S3 stores profile pictures, team avatars, and project attachments via presigned URLs.

1. **Create the S3 Bucket**:
   - Go to AWS Console $\rightarrow$ Search **S3** $\rightarrow$ Click **Create bucket**.
   - **Bucket name**: `hackdekh-storage-2026` *(must match `AWS_S3_BUCKET_NAME` in `.env`)*.
   - **AWS Region**: Match your DynamoDB region (e.g. `us-east-1`).
   - **Object Ownership**: ACLs disabled (recommended).
   - **Block Public Access**: 
     - Uncheck *Block all public access* (acknowledge warning) so uploaded avatars can be served publicly via URL.
   - Click **Create bucket**.
2. **Configure S3 CORS**:
   - Click into your new bucket $\rightarrow$ Go to the **Permissions** tab.
   - Scroll to **Cross-origin resource sharing (CORS)** $\rightarrow$ Click **Edit**.
   - Paste this JSON configuration and click **Save changes**:
     ```json
     [
       {
         "AllowedHeaders": ["*"],
         "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
         "AllowedOrigins": ["*"],
         "ExposeHeaders": ["ETag"]
       }
     ]
     ```
3. **Configure S3 Bucket Policy (Public Read for Avatars)**:
   - On the same **Permissions** tab $\rightarrow$ Scroll to **Bucket policy** $\rightarrow$ Click **Edit**.
   - Paste the following policy (replace `hackdekh-storage-2026` with your bucket name):
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Sid": "PublicReadGetObject",
           "Effect": "Allow",
           "Principal": "*",
           "Action": "s3:GetObject",
           "Resource": "arn:aws:s3:::hackdekh-storage-2026/*"
         }
       ]
     }
     ```
4. **Test S3 Live in HackDekh**:
   - Start frontend (`cd frontend && npm run dev`).
   - Register a user account, navigate to **Profile Settings**, and upload an avatar.
   - In AWS Console $\rightarrow$ S3 $\rightarrow$ Your Bucket $\rightarrow$ Observe the uploaded image object under `avatars/`!

---

### Service 3: Amazon EC2 (Member 3)

Deploy the backend to an Ubuntu EC2 instance so your API is live in the cloud 24/7.

1. **Launch the Instance**:
   - Go to AWS Console $\rightarrow$ **EC2** $\rightarrow$ Click **Launch Instance**.
   - **Name**: `hackdekh-backend`
   - **AMI**: `Ubuntu Server 24.04 LTS` (64-bit x86).
   - **Instance type**: `t2.micro` or `t3.micro` (Free Tier).
   - **Key pair**: Create new key pair $\rightarrow$ Name: `hackdekh-key` $\rightarrow$ Download `hackdekh-key.pem`.
   - **Network settings / Security Group**:
     - Check **Allow SSH traffic** (`Anywhere 0.0.0.0/0`).
     - Check **Allow HTTP traffic from the internet**.
     - Click **Edit network settings** $\rightarrow$ **Add security group rule**:
       - Type: `Custom TCP`
       - Port range: `8000`
       - Source: `Anywhere (0.0.0.0/0)`
       - Description: `HackDekh Express API`
   - Click **Launch Instance**.

2. **Connect via SSH**:
   - Open terminal where `hackdekh-key.pem` is located:
     ```bash
     chmod 400 hackdekh-key.pem
     ssh -i hackdekh-key.pem ubuntu@<EC2-PUBLIC-IP>
     ```

3. **Install Environment on EC2**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs git
   sudo npm install -g pm2
   ```

4. **Deploy Application**:
   ```bash
   git clone https://github.com/<your-username>/HackDekh.git
   cd HackDekh/backend
   npm install
   npm run build
   ```

5. **Create Production `.env` on EC2**:
   ```bash
   nano .env
   ```
   *(Paste your completed backend `.env` variables from Phase 3, then press `Ctrl+O`, `Enter`, `Ctrl+X`)*.

6. **Start with PM2**:
   ```bash
   pm2 start dist/index.js --name "hackdekh-api"
   pm2 startup
   pm2 save
   ```

7. **Verify**:
   - Open browser: `http://<EC2-PUBLIC-IP>:8000/api/v1/hackathons`.
   - Live JSON output from DynamoDB will load!

---

### Service 4: Amazon CloudWatch (Member 4)

CloudWatch provides monitoring, health metrics, and alarms.

1. **View EC2 Telemetry**:
   - Open AWS Console $\rightarrow$ Search **CloudWatch**.
   - Click **Metrics** $\rightarrow$ **All metrics** $\rightarrow$ Select **EC2** $\rightarrow$ **Per-Instance Metrics**.
   - Locate your instance ID and select:
     - `CPUUtilization`
     - `NetworkIn` & `NetworkOut`
     - `DiskReadBytes`
   - Switch to the **Graphed metrics** tab to see live performance graphs.
2. **Create a CloudWatch Alarm (For Presentation)**:
   - Go to CloudWatch $\rightarrow$ **Alarms** $\rightarrow$ Click **Create alarm**.
   - Select metric $\rightarrow$ EC2 $\rightarrow$ Per-Instance Metrics $\rightarrow$ `CPUUtilization`.
   - Set threshold: `Static`, **Greater than > 80%**.
   - Alarm name: `HackDekh-EC2-HighCPU-Alarm`.
   - Click **Create alarm**. This demonstrates active operational governance to the evaluators!

---

### Service 5: Amazon CloudFront + S3 (Member 3 - Frontend)

Distribute the React frontend through AWS CloudFront CDN backed by S3.

1. **Point Frontend to EC2**:
   - In `frontend/.env` on your laptop:
     ```env
     VITE_BACKEND_URL=http://<EC2-PUBLIC-IP>:8000/api/v1
     ```
2. **Build the Production Bundle**:
   ```bash
   cd frontend
   npm run build
   ```
   *(This generates optimized production static assets in `frontend/dist/`)*.
3. **Host on S3**:
   - Create a second S3 bucket: `hackdekh-frontend-2026`.
   - Enable **Static website hosting** in Bucket Properties (Index document: `index.html`, Error document: `index.html`).
   - Upload all files from `frontend/dist/` into this bucket.
4. **Create CloudFront Distribution**:
   - Go to AWS Console $\rightarrow$ Search **CloudFront** $\rightarrow$ Click **Create distribution**.
   - **Origin domain**: Select your `hackdekh-frontend-2026` S3 website endpoint.
   - **Viewer protocol policy**: `Redirect HTTP to HTTPS`.
   - **Default root object**: `index.html`.
   - Under **Error pages** tab: Create Custom Error Response for `403` and `404` $\rightarrow$ Response page path: `/index.html`, HTTP response code: `200: OK` (essential for React Router).
   - Click **Create distribution**.
   - Access your live frontend globally at the `https://xxxx.cloudfront.net` domain!

---

### Service 6: Amazon SES (Email Service)

1. Go to AWS Console $\rightarrow$ Search **Amazon SES**.
2. Click **Identities** $\rightarrow$ Click **Create identity**.
3. Select **Email address** $\rightarrow$ Enter your personal email (e.g., `you@gmail.com`).
4. Click **Create identity**.
5. Check your inbox and click the AWS verification link.
6. In SES Console, verify status is **Verified**.
7. Now your backend can send team invitations to and from this verified address during the live evaluation.

---

## Phase 5: Live Demo Presentation Script

When presenting to your evaluator or teacher, follow this seamless 4-step walkthrough:

```
[Start: Open CloudFront URL in browser showing live HackDekh App]
```

### 1. Member 1 — DynamoDB Demo:
> *"I managed the persistence layer on Amazon DynamoDB. Our architecture uses 9 NoSQL tables designed for high throughput and flexible schema. As you can see in the DynamoDB console, our hackathons, teams, and stages are stored with partition keys like `hackathonId` and `teamId`. The scraper automatically populates listings directly into this table."*
- **Action**: Opens DynamoDB Console $\rightarrow$ Tables $\rightarrow$ `hackdekh_hackathons` $\rightarrow$ Explore Items.

### 2. Member 2 — S3 Demo:
> *"I designed our object storage on Amazon S3. Instead of streaming heavy files through the API server, our frontend requests an authorized Presigned URL, uploading avatars directly to our S3 media bucket with custom CORS rules and public read policies."*
- **Action**: In the live web app, uploads a new profile picture $\rightarrow$ Switches to S3 Console $\rightarrow$ Shows the uploaded file object timestamped under `avatars/`.

### 3. Member 3 — EC2 & CloudFront Demo:
> *"I handled compute infrastructure and edge distribution. The React client is compiled and cached globally across AWS CloudFront edge locations with SSL. The backend runs inside an Ubuntu EC2 instance on Node.js managed 24/7 by PM2 process manager."*
- **Action**: Shows the running EC2 instance in AWS Console $\rightarrow$ Opens terminal with `pm2 status` and `pm2 logs` demonstrating incoming API requests.

### 4. Member 4 — CloudWatch & IAM Demo:
> *"I handled security, access control, and telemetry. All EC2 access to DynamoDB and S3 is governed by least-privilege IAM policies. In CloudWatch, we actively monitor CPU utilization, memory, and network throughput with configured alarm thresholds for proactive incident response."*
- **Action**: Opens CloudWatch $\rightarrow$ Displays live EC2 CPU utilization graph and the active `HackDekh-EC2-HighCPU-Alarm`.
