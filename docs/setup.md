# HackDekh — AWS Academy Learner Lab Setup & Demo Guide

This guide provides end-to-end instructions for deploying and syncing HackDekh on an **AWS Academy Learner Lab** account. It is specifically tailored for college lab accounts where credentials come directly from the **"Start Lab"** portal, avoiding any confusing IAM configuration.

---

## Architecture & Member Ownership

| Member | Assigned AWS Service | Live Demo Responsibility |
| :--- | :--- | :--- |
| **Member 1** | **Amazon DynamoDB** | Explains the NoSQL data model, 9 auto-provisioned tables, partition/sort keys, and shows live items in the DynamoDB Console. |
| **Member 2** | **Amazon S3** | Demonstrates the S3 storage bucket, CORS setup, and live avatar/document uploads via direct Presigned URLs. |
| **Member 3** | **Amazon EC2 & CloudFront** | Demonstrates the Ubuntu Linux EC2 backend instance running on PM2 and the CloudFront CDN distributing the frontend. |
| **Member 4** | **Amazon CloudWatch & SES** | Displays EC2 CPU/network telemetry metrics, CloudWatch health alarms, log streams, and SES email notifications. |

---

## Phase 1: Local Setup on New Laptop

### 1. Prerequisites
Ensure the laptop has the following installed:
- **Node.js**: v20 LTS or higher (`node -v`)
- **Git**: (`git -v`)

### 2. Clone & Install Dependencies
Open a terminal (PowerShell, WSL, or macOS/Linux):

```bash
# 1. Clone the repository
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

## Phase 2: Getting Credentials from AWS Academy Lab

In AWS Academy Learner Lab, you **do not** need to create IAM users or roles (IAM is restricted). Credentials are provided directly by the lab portal.

1. Log in to your **AWS Academy** portal and open your **Learner Lab**.
2. Click **Start Lab** (wait until the circle turns green).
3. Click the **"AWS Details"** button (next to Start Lab).
4. Beside **AWS CLI**, click **"Show"**. You will see:
   ```text
   aws_access_key_id=ASIA...
   aws_secret_access_key=...
   aws_session_token=IQoJb3JpZ2luX2VjE...
   ```
5. Keep this tab open. You will paste these three values into `backend/.env`.

> [!IMPORTANT]
> Because this is a Learner Lab account, the `aws_session_token` is **mandatory** and expires after a few hours when the lab session ends. Whenever you click "Start Lab" in a new session, copy the updated credentials into your `backend/.env`.

---

## Phase 3: Environment Variables (`.env`) Setup

### 1. Backend `.env` Configuration
In the `backend/` directory, create a `.env` file:

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and paste your real values:

```env
# ============================================================
# Server Configuration
# ============================================================
PORT=8000
NODE_ENV=development
FRONTEND_URL=*
APP_NAME=HackDekh

# ============================================================
# AWS Academy Lab Credentials (MANDATORY: All 3 lines)
# Region is us-east-1 for AWS Academy Learner Lab
# ============================================================
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=ASIA... (from AWS Details)
AWS_SECRET_ACCESS_KEY=... (from AWS Details)
AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjE... (from AWS Details)

# Table prefix for DynamoDB
DYNAMODB_TABLE_PREFIX=hackdekh

# CRITICAL: Leave DYNAMODB_ENDPOINT commented out to use REAL AWS DynamoDB!
# DYNAMODB_ENDPOINT=http://localhost:8000

# ============================================================
# Amazon S3 File Storage (Member 2)
# ============================================================
AWS_S3_BUCKET_NAME=hackdekh-storage-academy

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
# Point to local server initially (update to EC2 IP once EC2 is launched)
VITE_BACKEND_URL=http://localhost:8000/api/v1

# GitHub OAuth Client ID (optional for local testing)
VITE_GITHUB_CLIENT_ID=
```

---

## Phase 4: Service-by-Service Setup & Demo

### Service 1: Amazon DynamoDB (Member 1)

The backend code has an automated idempotent provisioning engine (`backend/src/db/initTables.ts`) that automatically creates all required tables on startup.

1. Ensure `DYNAMODB_ENDPOINT` is commented out in `backend/.env`.
2. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```
3. Look at your terminal output:
   ```
   [DynamoDB] Initializing database tables...
   [DynamoDB] Created table: hackdekh_users
   [DynamoDB] Created table: hackdekh_hackathons
   ...
   [DynamoDB] All 9 tables ready.
   ```
4. **Console Verification**:
   - In AWS Academy, click **AWS** (top left next to Start Lab) to open the AWS Console.
   - Search **DynamoDB** $\rightarrow$ Click **Tables**.
   - Verify all 9 tables have status **Active**.
5. **Populate Live Data**:
   - Trigger the scraper to populate hackathons into DynamoDB:
     ```bash
     curl -X POST http://localhost:8000/api/v1/scrape/refresh -H "x-cron-secret: hackdekh_super_secure_cron_secret_2026"
     ```
   - In DynamoDB Console $\rightarrow$ Click `hackdekh_hackathons` $\rightarrow$ **Explore Items** to see the populated hackathons.

---

### Service 2: Amazon S3 (Member 2)

S3 stores profile pictures, team avatars, and project attachments via presigned URLs.

1. **Create the S3 Bucket**:
   - In AWS Console $\rightarrow$ Search **S3** $\rightarrow$ Click **Create bucket**.
   - **Bucket name**: `hackdekh-storage-academy` *(must match `AWS_S3_BUCKET_NAME` in `.env`)*.
   - **AWS Region**: `us-east-1` (N. Virginia).
   - **Object Ownership**: ACLs disabled (recommended).
   - **Block Public Access**: 
     - Uncheck *Block all public access* (acknowledge warning checkbox) so avatars can be viewed publicly.
   - Click **Create bucket**.
2. **Configure S3 CORS**:
   - Click your bucket $\rightarrow$ **Permissions** tab.
   - Scroll to **Cross-origin resource sharing (CORS)** $\rightarrow$ Click **Edit**.
   - Paste this JSON and click **Save changes**:
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
   - On the **Permissions** tab $\rightarrow$ Scroll to **Bucket policy** $\rightarrow$ Click **Edit**.
   - Paste the following policy (replace `hackdekh-storage-academy` with your bucket name):
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Sid": "PublicReadGetObject",
           "Effect": "Allow",
           "Principal": "*",
           "Action": "s3:GetObject",
           "Resource": "arn:aws:s3:::hackdekh-storage-academy/*"
         }
       ]
     }
     ```
4. **Test S3 Live in HackDekh**:
   - Run the frontend (`cd frontend && npm run dev`).
   - Register a user account, navigate to **Profile Settings**, and upload an avatar.
   - In AWS Console $\rightarrow$ S3 $\rightarrow$ Your Bucket $\rightarrow$ Observe the uploaded image object under `avatars/`!

---

### Service 3: Amazon EC2 (Member 3)

Deploy the backend to an Ubuntu EC2 virtual machine so your API is live in the cloud 24/7.

> [!IMPORTANT]
> **Understanding the Two Terminals:**
> - **Terminal A (Local Laptop):** Only used for Step 3.2 to run the `ssh` command and log into the server.
> - **Terminal B (Inside EC2 Cloud Server):** Once connected, your prompt changes to `ubuntu@ip-172-xx-xx-xx:~$`. **ALL commands from Step 3.3 onwards are executed inside this EC2 terminal!**

#### 3.1 Launch the EC2 Instance (AWS Console)
1. In AWS Console $\rightarrow$ Search **EC2** $\rightarrow$ Click **Launch Instance**.
2. **Name**: `hackdekh-backend`
3. **AMI**: `Ubuntu Server 24.04 LTS` (64-bit x86).
4. **Instance type**: `t2.micro` or `t3.micro` (Free Tier / Lab eligible).
5. **Key pair**: Select **Create new key pair**:
   - Name: `hackdekh-key`
   - Format: `.pem`
   - Click **Create key pair** (saves `hackdekh-key.pem` to your local Downloads folder).
6. **Network settings / Security Group** (Crucial!):
   - Check **Allow SSH traffic from** $\rightarrow$ `Anywhere (0.0.0.0/0)`.
   - Check **Allow HTTP traffic from the internet**.
   - Click **Edit network settings** $\rightarrow$ Click **Add security group rule**:
     - **Type**: `Custom TCP`
     - **Port range**: `8000`
     - **Source**: `Anywhere (0.0.0.0/0)`
     - **Description**: `HackDekh Express API`
7. Click **Launch Instance** and wait for Instance State to turn to **Running**.
8. Copy the **Public IPv4 address** (e.g. `54.210.12.34`).

---

#### 3.2 Connect via SSH (Run in Terminal A — Local Laptop)

Open a terminal on your laptop (PowerShell or WSL). Navigate to wherever your `hackdekh-key.pem` was saved:

- **If using PowerShell (Windows):**
  ```powershell
  cd ~/Downloads
  ssh -i hackdekh-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
  ```

- **If using WSL (Ubuntu on Windows):**
  ```bash
  # Go to Windows Downloads from WSL:
  cd /mnt/c/Users/<YourWindowsUsername>/Downloads
  chmod 400 hackdekh-key.pem
  ssh -i hackdekh-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
  ```

*(If prompted: `Are you sure you want to continue connecting (yes/no)?`, type **`yes`** and press **Enter**).*

---

#### 3.3 Install Environment (Run in Terminal B — Inside EC2)

Notice your terminal prompt has now changed to:
```bash
ubuntu@ip-172-xx-xx-xx:~$
```
*(You are now inside the cloud machine. Stay right here in the default home directory `~`).*

Run these commands to install Node.js 20, Git, and PM2:
```bash
# Update Ubuntu package manager
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS & Git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Verify versions
node -v
npm -v

# Install PM2 (daemon process manager to run Express 24/7 in background)
sudo npm install -g pm2
```

---

#### 3.4 Clone Application & Build (Run in Terminal B — Inside EC2)

Still inside the EC2 terminal:

```bash
# 1. Clone your repository into the home directory (~):
git clone https://github.com/<your-username>/HackDekh.git

# 2. Change directory into the backend folder:
cd HackDekh/backend

# 3. Install packages and compile TypeScript:
npm install
npm run build
```

---

#### 3.5 Create `.env` on EC2 (Run in Terminal B — Inside EC2)

While still in the `~/HackDekh/backend` directory:

```bash
nano .env
```

Paste your complete environment variables (copy them from your AWS Academy Learner Lab "AWS Details" modal):

```env
PORT=8000
NODE_ENV=production
FRONTEND_URL=*
APP_NAME=HackDekh

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=ASIA... (from AWS Details)
AWS_SECRET_ACCESS_KEY=... (from AWS Details)
AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjE... (from AWS Details)

DYNAMODB_TABLE_PREFIX=hackdekh
AWS_S3_BUCKET_NAME=hackdekh-storage-academy

ACCESS_TOKEN_SECRET=super_secret_jwt_access_token_key_min_32_characters_long
REFRESH_TOKEN_SECRET=super_secret_jwt_refresh_token_key_min_32_characters_long
CRON_SECRET=hackdekh_super_secure_cron_secret_2026
```

- Press `Ctrl + O`, then press `Enter` to save.
- Press `Ctrl + X` to exit nano.

---

#### 3.6 Start the Backend with PM2 (Run in Terminal B — Inside EC2)

Still inside `~/HackDekh/backend`:

```bash
# Start backend process:
pm2 start dist/index.js --name "hackdekh-api"

# Configure PM2 to restart automatically if instance ever reboots:
pm2 startup
# (Copy and run the 'sudo env PATH...' command that PM2 prints to your screen)
pm2 save
```

Check the process status:
```bash
pm2 status
```
*(You will see `hackdekh-api` with status **`online`** in green!)*

---

#### 3.7 Verify the Live API (Run in your Laptop Web Browser)

Open your laptop browser and visit:
```
http://<YOUR-EC2-PUBLIC-IP>:8000/api/v1/hackathons
```
*(Make sure to use `http://`, not `https://`).*

You should see live JSON data returned directly from DynamoDB through your EC2 server!

> [!TIP]
> **Troubleshooting:** If the browser page keeps loading or times out:
> 1. Go to AWS Console $\rightarrow$ **EC2** $\rightarrow$ **Instances** $\rightarrow$ Click your instance $\rightarrow$ **Security** tab.
> 2. Click the Security Group link $\rightarrow$ Under **Inbound rules**, verify port **`8000`** is present with Source `0.0.0.0/0`. If not, click **Edit inbound rules** and add it.

---

### Service 4: Amazon CloudWatch & SES (Member 4)

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
   - Click **Create alarm**.
3. **Amazon SES (Email Service)**:
   - Search **Amazon SES** in console $\rightarrow$ Click **Identities** $\rightarrow$ **Create identity**.
   - Select **Email address** $\rightarrow$ Enter your personal email $\rightarrow$ Click verification link in your inbox.
   - Shows status **Verified** for team invite dispatches.

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
   - Create a second S3 bucket: `hackdekh-frontend-academy`.
   - Enable **Static website hosting** in Bucket Properties (Index document: `index.html`, Error document: `index.html`).
   - Upload all files from `frontend/dist/` into this bucket.
4. **Create CloudFront Distribution**:
   - Go to AWS Console $\rightarrow$ Search **CloudFront** $\rightarrow$ Click **Create distribution**.
   - **Origin domain**: Select your `hackdekh-frontend-academy` S3 website endpoint.
   - **Viewer protocol policy**: `Redirect HTTP to HTTPS`.
   - **Default root object**: `index.html`.
   - Under **Error pages** tab: Create Custom Error Response for `403` and `404` $\rightarrow$ Response page path: `/index.html`, HTTP response code: `200: OK` (essential for React Router).
   - Click **Create distribution**.
   - Access your live frontend globally at the `https://xxxx.cloudfront.net` domain!

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

### 4. Member 4 — CloudWatch & SES Demo:
> *"I handled monitoring, health observability, and notification delivery. In CloudWatch, we actively monitor CPU utilization, memory, and network throughput with configured alarm thresholds for proactive incident response, alongside SES identity verification for reliable team invitations."*
- **Action**: Opens CloudWatch $\rightarrow$ Displays live EC2 CPU utilization graph and the active `HackDekh-EC2-HighCPU-Alarm`.
