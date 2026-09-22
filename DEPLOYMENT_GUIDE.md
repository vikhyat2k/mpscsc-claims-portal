# Free Cloud Server Deployment Guide — MPSCSC Claims Portal

This guide provides simple, step-by-step instructions to deploy the **MPSCSC Claims Portal** to free cloud hosting platforms directly from your GitHub repository (`vikhyat2k/mpscsc-claims-portal`).

---

## Option 1: Render.com (Recommended — 100% Free Tier)

Render provides a generous free tier for Node.js web services with automatic HTTPS and free SSL certificates.

### 1-Click Blueprints Deployment (Easiest)
1. Log in to [Render.com](https://render.com) using your GitHub account.
2. Click **New +** in the top navigation and select **Blueprint**.
3. Connect your repository: `vikhyat2k/mpscsc-claims-portal`.
4. Render will automatically detect `render.yaml` and configure:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:** `NODE_ENV=production`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, auto-generated `JWT_SECRET`.
5. Click **Apply**. Render will build the frontend, start the server, and give you a free live URL:  
   `https://mpscsc-claims-portal.onrender.com`

### Manual Web Service Deployment
1. Click **New +** -> **Web Service**.
2. Select repository `vikhyat2k/mpscsc-claims-portal`.
3. Configure settings:
   - **Runtime:** Node
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Under **Advanced** -> **Add Environment Variable**:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: (any secure random string, e.g. `mpscsc_prod_secret_key_2026`)
   - `ADMIN_EMAIL`: `admin@mpscsc.gov.in`
   - `ADMIN_PASSWORD`: `Admin@123`
5. Click **Create Web Service**.

> **Note on Free Tier Sleep:** On Render's free tier, the service spins down after 15 minutes of inactivity and takes ~30 seconds to wake up on the next visit. This is standard across free hosting providers.

---

## Option 2: Railway.app (Includes Free Trial / Hobby Credits)

Railway supports SQLite persistence with persistent volumes.

1. Go to [Railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select `vikhyat2k/mpscsc-claims-portal`.
4. Railway will automatically detect the `Dockerfile` or `package.json`.
5. Click **Add Volume** (optional) and mount it to `/app/server/claims.db` if you want persistent disk storage.
6. Under Settings -> **Generate Domain** to get your public URL (e.g. `https://mpscsc-claims-portal.up.railway.app`).

---

## Option 3: Koyeb (Free Tier Micro Instance)

1. Sign in to [Koyeb.com](https://koyeb.com).
2. Click **Create Service** -> **GitHub**.
3. Select `vikhyat2k/mpscsc-claims-portal`.
4. Choose **Build from Dockerfile** or **Build from Node.js**.
5. Set Port to `5000`.
6. Click **Deploy**.

---

## Production Verification Checklist

Once deployed, verify your live portal:

1. **Visit Live URL:** Navigate to your assigned domain (e.g. `https://mpscsc-claims-portal.onrender.com`).
2. **Sign In:**
   - **Email:** `admin@mpscsc.gov.in`
   - **Password:** `Admin@123`
3. **Verify Modules:** Check Employee Master (Vikhyat Hindoliya), Claims Register, and Form 21 Bill preview.
4. **Registration:** Try registering a new user account to confirm SQLite write operations work smoothly.

---

*Prepared for MPSCSC Claims Portal Deployment.*
