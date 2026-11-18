# UrbanBasket - Target System Architecture

## Overview
UrbanBasket is a multi-vendor e-commerce marketplace modeled after modern marketplace architectures (like Amazon), allowing Customers, Vendors, and Administrators to interact within a unified, resilient system.

```mermaid
flowchart TD
    Client["React (Vite + Tailwind) [Vercel]"]
    Auth["Supabase Auth (JWT & OAuth)"]
    API["Express REST API (Node.js/TS) [Render]"]
    DB[("Supabase PostgreSQL (Prisma ORM)")]
    Storage["Supabase Storage (Product Images)"]
    Redis[("Upstash Redis (REST API / Cart & Caching)")]
    Payment["Stripe / Razorpay Sandbox"]

    Client -->|User Auth| Auth
    Client -->|Bearer JWT & REST API| API
    API -->|Prisma Client Queries & Transactions| DB
    API -->|Service-Role Uploads & URLs| Storage
    API -->|Session Carts & Search Cache| Redis
    API -->|Order Creation & Webhooks| Payment
```

## Hosting & Cloud Services
- **Frontend**: Vercel (Single-Page Application deployment)
- **Backend**: Render (Node.js Web Service)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage Buckets
- **Caching**: Upstash Redis (Serverless REST client)
- **Health & Monitoring**: UptimeRobot
