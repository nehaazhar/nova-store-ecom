# NOVA

MERN ecommerce shop — products, cart, checkout (Razorpay / COD), orders, and an admin panel.

## Run locally

Copy `.env.example` to `.env` and add your MongoDB, Redis, and JWT secrets. Cloudinary / payments / SMTP are optional.

```bash
npm install
npm install --prefix frontend
npm run dev
```

Frontend (another terminal):

```bash
npm run dev --prefix frontend
```

- App: http://localhost:5173
- API: http://localhost:5000

If SMTP is not set, signup verify / password-reset links print in the backend terminal.

```bash
npm run seed:products:api
npm test
```

`seed:products:api` loads real DummyJSON fashion products (photos, names, prices) plus size/color stock. Use `npm run seed:products` only for the offline Unsplash demo catalog.

## Docker

```bash
docker compose up --build
```

Then open http://localhost:5000

## Deploy (Render)

This repo’s `origin` is still the original tutorial GitHub. Push to **your own** repo first, then host one Node service (API + built React UI).

### 1. MongoDB Atlas

1. [mongodb.com/atlas](https://www.mongodb.com/atlas) → free cluster
2. Database Access → user + password
3. Network Access → `0.0.0.0/0` (or Render IPs later)
4. Connect → Drivers → copy `MONGO_URI`

### 2. Redis (Upstash)

1. [upstash.com](https://upstash.com) → Redis → create
2. Copy the **`rediss://...`** URL (TCP), not the REST token  
3. That is `UPSTASH_REDIS_URL`

### 3. Your GitHub repo

GitHub → New repository (e.g. `nova-store`) → don’t add README. Then:

```bash
git remote rename origin tutorial
git remote add origin https://github.com/YOUR_USERNAME/nova-store.git
git add -A
git commit -m "NOVA store ready to deploy"
git push -u origin master
```

### 4. Render

1. [render.com](https://render.com) → New → Blueprint, or Web Service from that repo
2. Build: `npm run build` · Start: `npm start`
3. Environment:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Atlas string |
| `UPSTASH_REDIS_URL` | `rediss://...` |
| `ACCESS_TOKEN_SECRET` | long random string |
| `REFRESH_TOKEN_SECRET` | another long random string |
| `CLIENT_URL` | `https://your-service.onrender.com` (set after first deploy if needed) |
| Cloudinary / Razorpay | optional; without them images/payments stay limited |

4. After the URL exists, set `CLIENT_URL` to that `https://...` and redeploy.

First load on the free plan can take ~1 minute (cold start). Open `/api/health` — `{ "ok": true }` means the server is up.

Local Docker is still: `docker compose up --build`
