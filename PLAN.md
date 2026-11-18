# Multi-Vendor E-Commerce Marketplace - Antigravity Implementation Plan
## Goal
Build and deploy a working Amazon-style marketplace.
The platform must support:
- Customer, vendor, and admin roles
- Supabase email/password and OAuth authentication
- Vendor onboarding and product management
- Supabase product image storage
- PostgreSQL-backed product search, filtering, and sorting
- Redis-backed cart data and API caching
- Checkout and order lifecycle management
- Razorpay or Stripe Connect test-mode split payments
- Reviews, coupons, PDF invoices, and admin analytics
- Separate frontend and backend deployments
- Automated tests and submission documentation
## Product Scope
### Customer
- Register and sign in with Supabase
- Browse products and categories
- Search, filter, and sort products
- Manage cart items
- Place a test-mode order
- Apply coupons
- Track order status
- Submit reviews
- Download an invoice
### Vendor
- Apply for a vendor account
- Maintain store profile
- Create, edit, delete, and publish products
- Upload product images to Supabase Storage
- Manage inventory
- View assigned orders
- Update order status
### Admin
- Approve or reject vendors
- Manage users and vendor accounts
- Manage coupons
- Moderate reviews
- View revenue, order, vendor, and product analytics
## Target Architecture
```text
React + Vite + TypeScript + Tailwind
                 |
          Supabase Auth
                 |
              Vercel
                 |
          Express REST API
                 |
     +-----------+-----------+
     |           |           |
Supabase     Supabase     Upstash
PostgreSQL   Storage       Redis
     |
Prisma
     |
Razorpay / Stripe Test Mode
```
## Technology Stack
| Area | Technology | Hosting |
|---|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS | Vercel |
| Backend | Node.js, Express, TypeScript | Render |
| Database | PostgreSQL | Supabase |
| ORM | Prisma | Local package |
| Auth | Supabase Auth and OAuth | Supabase |
| Storage | Supabase Storage | Supabase |
| Cache and cart | Redis | Upstash |
| Search | PostgreSQL full-text search | Supabase |
| Payments | Stripe or Razorpay test mode | Provider sandbox |
| PDF invoices | PDFKit | Express backend |
| Tests | Jest, Supertest, React Testing Library | GitHub Actions |
| Local services | Docker Compose | Developer machine |
| Uptime | UptimeRobot health checks | External |
Elasticsearch is not required for the MVP. PostgreSQL search must deliver the same essential features:
- Keyword search
- Category filtering
- Price filtering
- Rating filtering
- Vendor filtering
- Name, price, and rating sorting
- Pagination
## Repository Structure
```text
/
├── frontend/
├── backend/
├── docs/
│   ├── architecture.md
│   ├── database-schema.md
│   ├── api.md
│   └── demo-guide.md
├── docker/
│   └── docker-compose.yml
├── seed/
├── .github/
│   └── workflows/
├── README.md
└── plan.md
```
## Environment Variables
Do not commit real secrets.
### Frontend
```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_RAZORPAY_KEY_ID=
```
### Backend
```text
DATABASE_URL=
DIRECT_URL=
SUPABASE_URL=
SUPABASE_JWT_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
PAYMENT_PROVIDER=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
FRONTEND_URL=
```
## Authentication and Authorization Design
Use Supabase as the identity provider.
- Supabase frontend handles registration, login, logout, OAuth, and refresh tokens.
- Frontend sends the Supabase access token as a Bearer token.
- Express validates the JWT signature and expiry.
- Express derives the internal user ID from the Supabase user ID.
- A `profiles` or `users` table stores the application role and vendor relationship.
- Protected routes verify `customer`, `vendor`, or `admin` permissions.
- Vendor routes additionally verify ownership of the vendor or product.
- Admin routes require the admin role.
- User and role changes are never accepted directly from public API bodies.
Recommended profile fields:
```text
id
supabaseUserId
name
email
role
createdAt
updatedAt
```
Use Supabase Row Level Security for direct user-facing storage operations or keep storage writes exclusively in Express using the service-role key.
## Database Schema
### Core Tables
#### profiles
```text
id
supabaseUserId
name
email
role
createdAt
updatedAt
```
#### vendor_profiles
```text
id
userId
storeName
storeSlug
description
status
commissionRate
createdAt
updatedAt
```
Status values:
- `PENDING`
- `APPROVED`
- `REJECTED`
- `SUSPENDED`
#### categories
```text
id
name
slug
createdAt
updatedAt
```
#### products
```text
id
vendorId
categoryId
name
slug
description
price
stock
status
averageRating
reviewCount
createdAt
updatedAt
```
Status values:
- `DRAFT`
- `PUBLISHED`
- `UNPUBLISHED`
- `OUT_OF_STOCK`
#### product_images
```text
id
productId
storagePath
publicUrl
position
altText
createdAt
```
#### cart_items
Store confirmed persistent cart items in Redis as the primary fast cart.
```text
userId
productId
quantity
updatedAt
```
Use PostgreSQL or Redis database serialization for guaranteed cart persistence on deployment restarts. Do not store payment or sensitive address data in Redis.
#### addresses
```text
id
userId
name
phone
line1
line2
city
state
postalCode
country
isDefault
```
#### orders
```text
id
customerId
addressId
status
subtotal
discount
total
platformCommission
paymentStatus
paymentProvider
paymentReference
invoiceUrl
createdAt
updatedAt
```
Status values:
- `PLACED`
- `PACKED`
- `SHIPPED`
- `DELIVERED`
- `CANCELLED`
- `REFUNDED`
#### order_items
```text
id
orderId
productId
vendorId
quantity
unitPrice
subtotal
vendorPayout
status
```
#### payments
```text
id
orderId
provider
providerPaymentId
amount
platformCommission
status
createdAt
updatedAt
```
#### reviews
```text
id
customerId
productId
orderItemId
rating
comment
status
createdAt
updatedAt
```
Status values:
- `PENDING`
- `APPROVED`
- `REJECTED`
#### coupons
```text
id
code
type
value
minimumAmount
maximumDiscount
usageLimit
usedCount
startsAt
expiresAt
isActive
```
Coupon types:
- `PERCENTAGE`
- `FIXED`
#### coupon_usage
```text
id
couponId
customerId
orderId
discountAmount
createdAt
```
#### vendor_payouts
```text
id
vendorId
orderItemId
amount
providerPayoutId
status
createdAt
updatedAt
```
Status values:
- `PENDING`
- `PROCESSING`
- `PAID`
- `FAILED`
#### order_status_history
```text
id
orderId
status
changedBy
note
createdAt
```
### Relationships
- One profile can own one vendor profile.
- A vendor profile can own many products.
- A category can contain many products.
- A customer can own many orders.
- An order can contain many order items.
- An order item belongs to one vendor and one product.
- A product can contain many reviews and images.
- A customer can review purchased products once per order item.
- A coupon can have many usages.
### Required Prisma Constraints
- Add unique constraints for email, vendor slug, product slug, and coupon code.
- Add unique constraint for `(customerId, orderItemId, productId)` on reviews.
- Add indexes for product name, category, vendor, price, rating, stock, and order status.
- Use transactions for checkout, stock updates, coupon usage, and payment confirmation.
- Use database-enforced foreign keys and cascade rules.
- Store money as `Decimal`, never JavaScript floating-point numbers.
## Redis Design
Use Upstash Redis REST for serverless compatibility.
### Keys
```text
cart:{userId}                 Hash or JSON
product:{productId}           JSON cache
products:search:{hash}        Search result cache
rate:{ip}:{route}             Request counter
checkout:{orderId}            Short-lived checkout metadata
coupon:{code}                 Short-lived coupon lookup
```
### Cart Operations
- `GET cart:{userId}`
- Add item: validate product, price, and stock, then update quantity.
- Increment/decrement quantity atomically or within a Redis transaction.
- Remove item.
- Clear after successful checkout.
- On checkout, revalidate stock and prices using PostgreSQL.
- Persist the cart in PostgreSQL if Redis availability and data durability are required.
### Cache TTL
| Data | TTL |
|---|---|
| Product details | 5 minutes |
| Search results | 2 minutes |
| Coupon metadata | 5 minutes |
| Checkout metadata | 15 minutes |
| Cart | 30 days or until cleared |
| Rate limit window | 60 seconds |
Use cache invalidation on product create, update, delete, publish, stock, and review changes.
## API Plan
Use `/api/v1` and consistent JSON error responses.
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Quantity must be greater than zero"
  }
}
```
### Health
- `GET /api/health`
### Authentication
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/sync-profile`
- `POST /api/v1/auth/logout`
Supabase handles registration and login. The backend optionally synchronizes the profile after successful Supabase authentication.
### Customer Catalog
- `GET /api/v1/categories`
- `GET /api/v1/products`
- `GET /api/v1/products/search`
- `GET /api/v1/products/:slug`
- `GET /api/v1/products/:id/reviews`
- `POST /api/v1/reviews`
### Cart
- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/:productId`
- `DELETE /api/v1/cart/items/:productId`
- `DELETE /api/v1/cart`
### Checkout and Orders
- `POST /api/v1/addresses`
- `GET /api/v1/addresses`
- `POST /api/v1/coupons/validate`
- `POST /api/v1/checkout`
- `POST /api/v1/payments/webhook`
- `GET /api/v1/orders`
- `GET /api/v1/orders/:id`
- `GET /api/v1/orders/:id/invoice`
- `PATCH /api/v1/orders/:id/cancel`
### Vendor
- `POST /api/v1/vendors/onboard`
- `GET /api/v1/vendors/me`
- `PATCH /api/v1/vendors/me`
- `GET /api/v1/vendors/me/products`
- `POST /api/v1/vendors/me/products`
- `PATCH /api/v1/vendors/me/products/:id`
- `DELETE /api/v1/vendors/me/products/:id`
- `POST /api/v1/vendors/me/products/:id/images`
- `DELETE /api/v1/vendors/me/products/:id/images/:imageId`
- `GET /api/v1/vendors/me/orders`
- `PATCH /api/v1/vendors/me/orders/:id/status`
- `GET /api/v1/vendors/me/analytics`
### Admin
- `GET /api/v1/admin/vendors`
- `PATCH /api/v1/admin/vendors/:id/status`
- `PATCH /api/v1/admin/users/:id/role`
- `GET /api/v1/admin/coupons`
- `POST /api/v1/admin/coupons`
- `PATCH /api/v1/admin/coupons/:id`
- `DELETE /api/v1/admin/coupons/:id`
- `GET /api/v1/admin/reviews`
- `PATCH /api/v1/admin/reviews/:id/status`
- `GET /api/v1/admin/analytics`
## Payment Architecture
Choose one provider to reduce integration complexity.
Recommended MVP:
- Razorpay test mode for Razorpay checkout
- Stripe test mode if Stripe Connect is required
### Stripe Flow
1. Customer starts checkout.
2. Backend creates an order with `PLACED` status only after validation.
3. Backend creates a Stripe Checkout Session or PaymentIntent.
4. Stripe webhook verifies payment.
5. Backend transaction marks the order paid.
6. Backend updates stock and records split amounts.
7. Vendor payout records are created for later Connect transfers.
### Razorpay Flow
1. Customer starts checkout.
2. Backend creates a Razorpay order.
3. Frontend opens Razorpay Checkout.
4. Razorpay returns payment identifiers and signature.
5. Backend verifies signature.
6. Backend webhook provides a second verification mechanism.
7. Backend transaction marks payment and order status.
### Commission Calculation
For each order item:
```text
subtotal = quantity * unitPrice
platformCommission = subtotal * vendorCommissionRate
vendorPayout = subtotal - platformCommission
```
Use the Decimal type, round consistently, and calculate server-side. Never trust commission or price values from the frontend.
### Split-Payment Note
Free test accounts may not provide production payout transfer volume or real vendor onboarding. Demo both the commission calculation and provider test checkout. Record payout records in PostgreSQL and mark Stripe Connect or Razorpay Route integration as provider-test-complete.
## Supabase Storage
Use a public bucket for product images and a private bucket for sensitive documents.
Recommended limits:
- 2 MB per image
- Maximum 5 images per product
- One primary image
- JPEG, PNG, and WebP only
- Resize client-side or server-side before upload
Backend upload flow:
1. Vendor requests an upload.
2. Backend validates vendor ownership and MIME type.
3. Backend uploads using the service-role key.
4. Backend stores public URL and storage path in PostgreSQL.
5. Delete operations remove the database record and Storage object.
## Search and Filtering
Initial implementation:
- PostgreSQL `ILIKE` for MVP search
- `tsvector` and indexes for better full-text search
- Prisma filters for category, vendor, price, rating, and stock
- Server-side sorting and cursor or offset pagination
Recommended query parameters:
```text
q
category
vendor
minPrice
maxPrice
minRating
inStock
sort=name|price|rating|createdAt
order=asc|desc
page
pageSize
```
Cache generated search result pages in Redis with a short TTL.
## Frontend Pages
### Public
- Home
- Catalog
- Product details
- Search results
- Login
- Register
- OAuth callback
- Vendor application
- Error pages
### Customer
- Cart
- Address management
- Checkout
- Payment result
- Order history
- Order details
- Review form
- Invoice download
### Vendor
- Vendor dashboard
- Store profile
- Product list
- Product create/edit
- Product image upload
- Order list
- Order status update
- Sales analytics
### Admin
- Admin dashboard
- Vendor approvals
- Vendor management
- Coupon management
- Review moderation
- Platform analytics
Use reusable components:
- Layout
- RoleGuard
- ProductCard
- SearchFilters
- Pagination
- DataTable
- StatusBadge
- CartItem
- CheckoutSummary
- ImageUploader
- Loading and error states
## Phase 1: Repository and Infrastructure
### Tasks
1. Create the frontend and backend repositories or a monorepo.
2. Initialize React, Vite, and TypeScript.
3. Initialize Express and TypeScript.
4. Install Prisma and configure Supabase PostgreSQL.
5. Add Docker Compose for PostgreSQL and Redis local development.
6. Configure ESLint, Prettier, environment validation, and scripts.
7. Add Supabase project and Storage bucket.
8. Create Upstash Redis database.
9. Add Vercel, Render, and GitHub Actions configuration.
10. Create `GET /api/health`.
### Deliverables
- Running frontend
- Running backend
- Working database migration
- Working local Redis
- Working Supabase project
- Health endpoint
### Acceptance Criteria
- Frontend starts locally with Vite.
- Backend starts locally with Express.
- Prisma connects to Supabase.
- Local Redis accepts read/write operations.
- Health endpoint returns `200`.
- Environment variables are not committed.
## Phase 2: Database and Seed Data
### Tasks
1. Implement all Prisma models and enums.
2. Add foreign keys, unique constraints, and indexes.
3. Create and run initial migrations.
4. Add seed scripts for categories, users, vendors, products, reviews, coupons, and orders.
5. Create at least three role-ready demo accounts.
6. Generate sample product images or public placeholders.
### Deliverables
- Complete Prisma schema
- Initial migration
- Repeatable seed script
- Seeded demo environment
### Acceptance Criteria
- Database migrates from an empty state.
- Seed script is repeatable.
- One customer, vendor, and admin account are available.
- Demo products have stock and categories.
- Invalid role or ownership relationships are prevented.
## Phase 3: Authentication and Roles
### Tasks
1. Enable email/password and OAuth providers in Supabase.
2. Configure frontend Supabase client.
3. Implement login, registration, logout, password reset, and OAuth callback.
4. Implement backend JWT verification.
5. Synchronize Supabase users with application profiles.
6. Implement role guard middleware.
7. Implement vendor ownership middleware.
8. Add protected profile and admin routes.
### Deliverables
- Working email/password authentication
- Working OAuth authentication
- Protected backend routes
- Customer, vendor, and admin navigation
### Acceptance Criteria
- Logged-out users cannot access protected routes.
- Customers cannot access vendor or admin routes.
- Vendors cannot modify another vendor's resources.
- Expired or invalid JWT requests are rejected.
- Admin role assignment is not possible through public registration.
## Phase 4: Vendor Onboarding and Product CRUD
### Tasks
1. Implement vendor application form.
2. Create vendor pending status.
3. Implement admin vendor approval.
4. Build vendor profile page.
5. Implement product create, read, update, and delete.
6. Implement Supabase image upload and deletion.
7. Implement category and stock management.
8. Invalidate Redis product cache after changes.
### Deliverables
- Vendor application workflow
- Admin approval workflow
- Vendor product management
- Supabase image uploads
### Acceptance Criteria
- Only approved vendors can publish products.
- Vendors can modify only their own products.
- Deleted products do not appear publicly.
- Image records and Storage objects remain synchronized.
- Stock cannot be negative.
## Phase 5: Catalog, Search, and Product Details
### Tasks
1. Build catalog page.
2. Build product details page.
3. Implement search and filtering API.
4. Implement sorting and pagination.
5. Add category and vendor filters.
6. Cache search and product results in Redis.
7. Add loading, empty, and error states.
### Deliverables
- Searchable marketplace catalog
- Product details
- Filters and sorting
- Redis result caching
### Acceptance Criteria
- Search, category, price, rating, and vendor filters work together.
- Pagination returns consistent results.
- Search cache does not return stale stock or product status.
- Public users cannot see unpublished products.
## Phase 6: Cart and Checkout
### Tasks
1. Implement Redis cart operations.
2. Build cart page and quantity controls.
3. Validate product availability and prices.
4. Implement address creation and selection.
5. Implement coupon validation.
6. Calculate totals server-side.
7. Create an unpaid order before payment.
8. Implement checkout transaction and stock reservation.
### Deliverables
- Persistent Redis cart
- Cart UI
- Address workflow
- Coupon workflow
- Checkout API
### Acceptance Criteria
- Cart quantity cannot exceed stock.
- Cart cannot contain unpublished products.
- Price changes are reflected server-side.
- Coupon cannot be used beyond limits.
- Only valid checkout orders reach the payment provider.
## Phase 7: Payments and Order Lifecycle
### Tasks
1. Integrate one test payment provider.
2. Implement server-side order creation.
3. Implement payment verification.
4. Verify signed webhook requests.
5. Commit payment transaction and stock updates atomically.
6. Create order item commission and payout records.
7. Implement order status history.
8. Implement vendor order status updates.
9. Restrict invalid order status transitions.
### Deliverables
- Working test checkout
- Verified payment callbacks
- Split commission calculation
- Customer and vendor order views
- Order status lifecycle
### Acceptance Criteria
- Duplicate webhooks do not duplicate orders or payments.
- Failed payments do not reduce stock.
- Successful payments reduce stock exactly once.
- Vendor status updates follow allowed transitions.
- Customers cannot change order status.
## Phase 8: Reviews, Coupons, and Invoices
### Tasks
1. Restrict reviews to delivered purchased items.
2. Implement review submission.
3. Update product rating aggregates.
4. Add admin review moderation.
5. Implement coupon create/update/delete.
6. Implement coupon validation and usage limits.
7. Generate PDF invoices.
8. Add invoice download authorization.
### Deliverables
- Verified purchase reviews
- Coupon system
- PDF invoice download
### Acceptance Criteria
- A customer can review only purchased, delivered items.
- A customer cannot submit duplicate reviews.
- Coupon discounts are calculated server-side.
- Invoice URLs and access are protected.
- Rating averages reflect approved reviews.
## Phase 9: Admin Analytics and Monitoring
### Tasks
1. Add admin dashboard queries.
2. Track revenue and commission.
3. Track order volume and status.
4. Track top products and vendors.
5. Track customer growth.
6. Create charts or simple metric cards.
7. Add basic request logging and error logging.
8. Add UptimeRobot health monitor.
### Deliverables
- Admin analytics page
- Uptime monitor
- Health and monitoring configuration
### Acceptance Criteria
- Analytics counts match database records.
- Commission is separate from vendor payout.
- Admin-only analytics routes are protected.
- Health endpoint remains available.
## Phase 10: Tests and Quality
### Tasks
1. Unit test commission calculation.
2. Unit test coupon calculation.
3. Unit test stock and cart behavior.
4. Integration test registration profile synchronization.
5. Integration test vendor ownership.
6. Integration test checkout and webhook replay.
7. Integration test order status transitions.
8. Component test login, cart, filters, and checkout.
9. Add API test script or Postman collection.
10. Run a basic load test against catalog endpoints.
### Deliverables
- Automated test suite
- Test report
- Postman or OpenAPI collection
- Basic performance measurements
### Acceptance Criteria
- Critical backend workflows pass tests.
- Role authorization tests cover all three roles.
- Payment webhook replay is safe.
- Frontend build succeeds without TypeScript errors.
- No critical dependency or secret exposure findings.
## Phase 11: Deployment
### Tasks
1. Deploy Supabase migrations and seed data.
2. Configure Supabase OAuth redirect URLs.
3. Configure Supabase Storage policies.
4. Deploy Express to Render.
5. Configure Render environment variables.
6. Configure Upstash Redis region and token.
7. Deploy React to Vercel.
8. Configure CORS and production frontend URL.
9. Configure UptimeRobot every five minutes.
10. Configure payment webhook URLs.
### Deliverables
- Public frontend URL
- Public backend URL
- Public or demo database
- Working production health monitor
- Working test payment flow
### Acceptance Criteria
- Frontend loads in a production browser.
- Frontend can authenticate with Supabase.
- Frontend calls the Render backend successfully.
- Backend connects to Supabase and Upstash.
- Payment webhooks reach the backend.
- UptimeRobot check succeeds.
## Phase 12: Documentation and Submission
### Tasks
1. Write README setup instructions.
2. Document all environment variables.
3. Add architecture diagram.
4. Add database ER diagram.
5. Export or write API documentation.
6. Record a 10-minute demo.
7. Export test results.
8. Add known limitations.
9. Add demo accounts and test payment details.
10. Prepare individual reflections.
### Required Submission Files
```text
README.md
docs/architecture.md
docs/database-schema.md
docs/api.md
docs/demo-guide.md
docs/test-results.md
docs/individual-reflections/
```
### README Must Include
- Project overview
- Architecture diagram
- Feature list
- Tech stack
- Local setup
- Docker setup
- Supabase setup
- Upstash setup
- Payment test setup
- Deployment URLs
- Demo credentials
- Test commands
- Free-tier limitations
- Future improvements
## 14-Day Development Schedule
| Day | Phase | Primary Output |
|---|---|---|
| 1 | Planning and infrastructure | Plan, schema, API contract, repository |
| 2 | Infrastructure | Docker, Prisma, Supabase, Upstash |
| 3 | Authentication | Supabase login, JWT, roles |
| 4 | Vendor onboarding | Vendor application and approval |
| 5 | Products | CRUD and image upload |
| 6 | Catalog | Search, filters, sorting, pagination |
| 7 | Cart | Redis cart and persisted UI |
| 8 | Checkout | Addresses, coupons, order creation |
| 9 | Payments | Provider checkout and webhooks |
| 10 | Orders and reviews | Lifecycle, reviews, invoice |
| 11 | Admin | Analytics and moderation |
| 12 | Tests | Backend and frontend tests |
| 13 | Deployment | Vercel, Render, monitoring |
| 14 | Submission | Demo, README, diagrams, presentation |
## Priority Order for Feature Completion
1. Authentication and role guards
2. Vendor onboarding and product CRUD
3. Public catalog and Redis cart
4. Checkout and order lifecycle
5. Payment test mode and webhooks
6. Reviews and coupons
7. PDF invoices
8. Admin analytics
9. Deployment and documentation
If time runs out, remove or simplify Elasticsearch, advanced review moderation, complex payment routing, and elaborate admin charting before removing core commerce workflows.
## Recommended MVP Scope
Keep these features for a reliable demo:
- Email/password and OAuth login
- Three roles
- Vendor approval
- Product CRUD
- Supabase images
- Search and filtering
- Redis cart
- Test checkout
- Order lifecycle
- Commission calculation
- One provider webhook
- Reviews
- Coupons
- PDF invoice
- Admin metrics
- Separate deployed frontend and backend
Defer these features:
- Real production payouts
- Elasticsearch
- Real-time notifications
- Advanced fraud detection
- Multi-currency checkout
- Complex fulfillment integrations
- Full inventory reservation system
- Native mobile application
## Free-Tier Risks
- Render free instances may sleep despite ping checks, depending on provider rules.
- Supabase projects can pause after inactivity.
- Supabase database, storage, and bandwidth limits can be reached.
- Upstash usage and data limits can be reached.
- Vercel usage limits vary by account and project.
- UptimeRobot cannot guarantee database persistence or provider uptime.
- OAuth providers may require their own configuration and verified domains.
- Test payment providers may not support complete production Connect/Routing workflows.
Mitigations:
- Run health checks from UptimeRobot every five minutes.
- Keep service regions close together.
- Avoid storing unnecessary large files.
- Compress and limit images.
- Use paginated API responses.
- Cache only public and non-sensitive data.
- Keep SQL migrations and seed scripts ready for restoration.
- Use mock fallback data only for presentation if a provider is unavailable.
## Definition of Done
The project is complete when:
- The deployed frontend and backend are publicly accessible.
- All three roles work.
- A customer can complete a test-mode purchase.
- A vendor can publish products and update order status.
- An admin can approve vendors and view analytics.
- Redis cart operations work.
- Supabase Storage uploads work.
- Payment callbacks are verified.
- Invoice, coupon, and review workflows work.
- Tests pass for critical flows.
- README, diagrams, API documentation, demo recording, and reflections are submitted.