# UrbanBasket - Engineering Reflections & Technical Retrospective

## 1. Project Overview & Role Breakdown
UrbanBasket was conceived as a high-integrity, multi-vendor marketplace platform modeled after enterprise commerce architectures. Over the course of the 12 development phases, the project tackled full-stack engineering challenges ranging from relational schema design with Prisma and PostgreSQL to Redis-backed transient cart storage, transactional order settlement, payment webhook verification, role-based governance, and automated testing.

---

## 2. Key Architecture Decisions & Trade-Offs

### 2.1 Prisma `$transaction` vs Distributed Sagas
- **Context**: In a multi-vendor marketplace, checkout involves decrementing stock across multiple products belonging to different vendors, creating order headers and line items, computing vendor payout splits and platform commission, and applying coupon usages.
- **Decision**: Implemented atomic PostgreSQL transactions via `prisma.$transaction`.
- **Trade-Off**: While a distributed saga pattern with message brokers (e.g., Kafka or RabbitMQ) provides eventual consistency for microservices at massive scale, it introduces immense operational overhead, eventual consistency anomalies, and complex compensating transactions. In our monolithic modular architecture, PostgreSQL serializable/read-committed ACID transactions guaranteed zero inventory overselling with complete atomicity.

### 2.2 Server-Side Financial Authority & Decimal Precision
- **Context**: JavaScript IEEE 754 floating-point math can lead to precision errors when multiplying currency values (e.g., `0.1 + 0.2 = 0.30000000000000004`).
- **Decision**: All financial fields (`price`, `subtotal`, `discountAmount`, `platformCommission`, `vendorPayout`, `totalAmount`) are strictly stored as `Decimal(10, 2)` or `Decimal(5, 4)` for commission rates. Furthermore, discounts and commissions are calculated exclusively on the backend; all client-submitted price overrides are discarded.
- **Reflection**: This eliminated any possibility of client-side price tampering or floating-point rounding discrepancies between the order totals and the payment gateway intents.

### 2.3 Redis-Backed Transient Cart vs Database-Only Cart
- **Context**: High-frequency cart operations (adding, updating quantities, removing items) cause unnecessary write load and vacuum overhead on PostgreSQL tables.
- **Decision**: Implemented customer carts in Upstash Redis (`cart:customer:<userId>`) with a 7-day TTL.
- **Trade-Off**: The cart is blazing fast with sub-millisecond updates and zero relational database contention. When the customer confirms checkout, the cart items are validated against the PostgreSQL product catalog for real-time stock availability and price synchronization before the order is placed.

### 2.4 Idempotent Webhook Replay Protection
- **Context**: Payment gateways (Stripe/Razorpay) guarantee at-least-once delivery of webhooks, meaning retry attempts can deliver duplicate event notifications for the same payment.
- **Decision**: Verified raw HTTP request bytes using HMAC-SHA256 signatures and recorded `providerPaymentId` with a unique database constraint (`@unique(providerPaymentId)`). If a webhook event arrives for a payment that has already reached `COMPLETED` status, the service immediately returns an idempotent `200 OK` without executing duplicate stock changes or order state transitions.

---

## 3. Engineering Challenges & Solutions

### Challenge 1: Multi-Vendor Order Fulfillment State Machine
- **Problem**: When a customer places an order containing items from multiple distinct merchants, how should the fulfillment status be governed?
- **Solution**: Designed two levels of status tracking:
  1. `OrderItem.status`: Managed independently by each respective vendor, enforcing unidirectional state progression: $\text{PLACED} \to \text{PACKED} \to \text{SHIPPED} \to \text{DELIVERED}$.
  2. `Order.status`: Reflects overall aggregate order state (e.g., transitions to `DELIVERED` when all constituent line items are delivered).
  3. Strict vendor authorization filters ensure Vendor A can never see or mutate line items belonging to Vendor B.

### Challenge 2: Verified Purchase Reviews & Rating Aggregation
- **Problem**: Preventing fake reviews and keeping product average ratings consistent under concurrent reviews.
- **Solution**:
  - Reviews require a delivered `orderItemId` authored by the requesting customer.
  - Reviews are initially placed in status `PENDING` (or auto-approved for trusted users) and moderated by Administrators.
  - On review status update, an atomic Prisma transaction recalculates `averageRating` ($\frac{\sum \text{ratings}}{N}$) and `reviewCount` directly on the `Product` table.

---

## 4. Free-Tier Cloud Constraints & Production Considerations
- **Cold Starts**: Render's free tier can spin down after 15 minutes of inactivity. To mitigate this, a health check endpoint (`/api/health`) was implemented and configured for 5-minute pings via UptimeRobot.
- **Connection Pooling**: Supabase PostgreSQL uses direct or transaction connection poolers (PgBouncer). Using Prisma with `DIRECT_URL` for migrations and connection pool strings for runtime queries prevents pool exhaustion under concurrent connections.
- **Redis Serverless Limits**: Upstash REST-based Redis client was utilized, avoiding persistent TCP socket leaks in serverless and containerized environments.

---

## 5. Future Roadmap & Enhancements
1. **Stripe Connect Custom Accounts**: Automate actual automated payouts to vendors' connected bank accounts upon delivery confirmation.
2. **Elasticsearch / Meilisearch**: Upgrade full-text catalog search from PostgreSQL `ILIKE` to faceted search with typo-tolerance and synonym matching.
3. **Real-Time Push Notifications**: Integrate WebSockets or Server-Sent Events (SSE) for instant vendor order alerts and customer delivery tracking updates.
