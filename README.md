# UrbanBasket - Multi-Vendor Marketplace

UrbanBasket is a production-grade multi-vendor e-commerce marketplace built with React, TypeScript, Node.js, Express, Prisma, Supabase, and Upstash Redis.

## Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS (Hosted on Vercel)
- **Backend API**: Node.js, Express, TypeScript (Hosted on Render)
- **Database & Storage**: PostgreSQL & Object Storage via Supabase
- **Cache & Fast Cart**: Upstash Redis (REST)
- **Payments**: Stripe & Razorpay (Test mode with webhook verification)

## Project Structure

```text
UrbanBasket/
├── frontend/               # React + Vite + Tailwind client
│   ├── src/
│   ├── .env.example
│   └── vercel.json
├── backend/                # Express + TypeScript + Prisma API
│   ├── src/
│   ├── prisma/
│   ├── .env.example
│   └── render.yaml
├── docs/                   # System & architecture specifications
├── docker/                 # Local PostgreSQL and Redis docker-compose
└── .github/workflows/      # Automated CI pipeline
```

## Quick Start

### 1. Configure Environment
```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Locally
```bash
# Start backend
npm run dev:backend

# Start frontend (in a separate terminal)
npm run dev:frontend
```

Frontend runs at `http://localhost:5173`
Backend Health API runs at `http://localhost:5000/api/health`
