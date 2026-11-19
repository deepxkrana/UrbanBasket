# UrbanBasket - REST API Specification

## 1. Overview & Base URLs
UrbanBasket provides a standard RESTful API secured by JWT bearer tokens and RBAC middleware (`CUSTOMER`, `VENDOR`, `ADMIN`).

- **Production Base URL**: `https://urbanbasket-backend.onrender.com/api`
- **Development Base URL**: `http://localhost:5000/api`

---

## 2. Global Request & Response Conventions

### Headers
| Header | Description | Example |
|---|---|---|
| `Content-Type` | MIME format for request payloads | `application/json` |
| `Authorization` | JWT Bearer authentication token | `Bearer <JWT_TOKEN>` |

### Standard Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation message",
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 48,
    "totalPages": 4
  }
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_SERVER_ERROR",
    "message": "Detailed error description",
    "details": []
  }
}
```

---

## 3. Endpoints Matrix

### 3.1 System & Health
- `GET /api/health`
  - **Auth**: Public
  - **Response**: `{ "status": "ok", "uptime": 124.5, "timestamp": "...", "database": "connected", "redis": "connected", "memory": { ... } }`

---

### 3.2 Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register`
  - **Auth**: Public
  - **Body**: `{ "email": "string", "password": "string", "fullName": "string" }`
  - **Response**: Returns created user profile and JWT token.
- `POST /api/v1/auth/login`
  - **Auth**: Public
  - **Body**: `{ "email": "string", "password": "string" }`
  - **Response**: `{ "user": { "id": "...", "role": "CUSTOMER|VENDOR|ADMIN" }, "token": "..." }`
- `GET /api/v1/auth/me`
  - **Auth**: Authenticated (`CUSTOMER`, `VENDOR`, `ADMIN`)
  - **Response**: Active user profile, associated vendor profile (if applicable), and active role permissions.
- `POST /api/v1/auth/vendor-apply`
  - **Auth**: `CUSTOMER`
  - **Body**: `{ "storeName": "string", "storeDescription": "string", "businessEmail": "string", "phone": "string" }`
  - **Behavior**: Creates `VendorProfile` in status `PENDING` awaiting Admin approval.

---

### 3.3 Public Catalog & Products (`/api/v1/products`)
- `GET /api/v1/products`
  - **Auth**: Public
  - **Query Params**:
    - `q`: Text search query (matches name or description via ILIKE)
    - `category`: Category slug filter
    - `vendor`: Vendor store slug filter
    - `minPrice`: Minimum unit price
    - `maxPrice`: Maximum unit price
    - `minRating`: Minimum average star rating (e.g. 4)
    - `inStock`: Boolean (`true` filters out out-of-stock items)
    - `sort`: `price` | `rating` | `name` | `createdAt`
    - `order`: `asc` | `desc`
    - `page`: Page index (default: 1)
    - `limit`: Items per page (default: 12)
  - **Caching**: Results cached in Upstash Redis (`catalog:list:...`) with 120s TTL.
- `GET /api/v1/products/:id`
  - **Auth**: Public
  - **Response**: Single product detail including vendor metadata, category, image gallery, and approved customer reviews.
- `GET /api/v1/categories`
  - **Auth**: Public
  - **Response**: List of all catalog categories with slugs.

---

### 3.4 Persistent Cart (`/api/v1/cart`)
- `GET /api/v1/cart`
  - **Auth**: `CUSTOMER`
  - **Source**: Upstash Redis key `cart:customer:<userId>`
  - **Response**: Cart object containing items, calculated subtotal, discounts, and item count.
- `POST /api/v1/cart`
  - **Auth**: `CUSTOMER`
  - **Body**: `{ "productId": "string", "quantity": 1 }`
  - **Behavior**: Validates live product stock before adding; aggregates quantity if already present.
- `PATCH /api/v1/cart/:productId`
  - **Auth**: `CUSTOMER`
  - **Body**: `{ "quantity": 2 }`
- `DELETE /api/v1/cart/:productId`
  - **Auth**: `CUSTOMER`
  - **Behavior**: Removes product from cart.
- `DELETE /api/v1/cart`
  - **Auth**: `CUSTOMER`
  - **Behavior**: Empties entire cart.

---

### 3.5 Checkout & Coupons (`/api/v1/checkout`)
- `POST /api/v1/checkout/apply-coupon`
  - **Auth**: `CUSTOMER`
  - **Body**: `{ "code": "string", "subtotal": 120.00 }`
  - **Behavior**: Validates code, expiration date, usage limit, and minimum order spend. Computes discount server-side.
- `POST /api/v1/checkout/create-order`
  - **Auth**: `CUSTOMER`
  - **Body**:
    ```json
    {
      "shippingAddress": {
        "name": "Jane Customer",
        "street": "123 Market St",
        "city": "San Francisco",
        "state": "CA",
        "postalCode": "94103",
        "country": "USA"
      },
      "couponCode": "WELCOME10"
    }
    ```
  - **Behavior**: Executes atomic transactional checkout (`$transaction`):
    1. Validates cart items and verifies current stock.
    2. Atomically decrements product inventory.
    3. Calculates platform commission and vendor payouts per item.
    4. Creates `Order` in `PLACED` status and `Payment` in `PENDING` status.
    5. Empties customer Redis cart.

---

### 3.6 Payments & Settlement (`/api/v1/payments`)
- `POST /api/v1/payments/create-intent`
  - **Auth**: `CUSTOMER`
  - **Body**: `{ "orderId": "string" }`
  - **Response**: `{ "clientSecret": "string", "paymentIntentId": "string", "amount": 12000 }`
- `POST /api/v1/payments/verify`
  - **Auth**: `CUSTOMER`
  - **Body**: `{ "orderId": "string", "paymentIntentId": "string" }`
  - **Behavior**: Settle payment atomically; marks order `PAID` and payment `COMPLETED`.
- `POST /api/v1/payments/webhook`
  - **Auth**: Public (Secured via HMAC-SHA256 signature verification)
  - **Headers**: `stripe-signature: t=...,v1=...`
  - **Behavior**: Idempotent webhook listener handling `payment_intent.succeeded` and `charge.refunded`.

---

### 3.7 Customer Orders, Reviews & Invoices (`/api/v1/orders`, `/api/v1/reviews`)
- `GET /api/v1/orders`
  - **Auth**: `CUSTOMER`
  - **Response**: List of user's orders with item fulfillment states.
- `GET /api/v1/orders/:id`
  - **Auth**: `CUSTOMER`
- `PATCH /api/v1/orders/:id/cancel`
  - **Auth**: `CUSTOMER`
  - **Behavior**: Permitted only if all items are still in `PLACED` status; restores inventory atomically.
- `GET /api/v1/orders/:id/invoice`
  - **Auth**: `CUSTOMER` or `ADMIN`
  - **Response**: Streamed PDF binary (`application/pdf`) tax invoice generated dynamically with PDFKit.
- `POST /api/v1/reviews`
  - **Auth**: `CUSTOMER`
  - **Body**: `{ "orderItemId": "string", "rating": 5, "comment": "string" }`
  - **Behavior**: Restricts reviews strictly to customers who have delivered purchases for this product. Prevents duplicate reviews.
- `GET /api/v1/products/:id/reviews`
  - **Auth**: Public
  - **Response**: Approved customer reviews for the specified product.

---

### 3.8 Vendor Management (`/api/v1/vendors/me`)
- `GET /api/v1/vendors/me/profile`
  - **Auth**: `VENDOR`
- `GET /api/v1/vendors/me/products`
  - **Auth**: `VENDOR`
  - **Response**: Full vendor inventory including draft, published, and archived products.
- `POST /api/v1/vendors/me/products`
  - **Auth**: `VENDOR`
  - **Body**: `{ "name": "string", "description": "string", "price": 49.99, "stock": 50, "categoryId": "string" }`
- `PATCH /api/v1/vendors/me/products/:id`
  - **Auth**: `VENDOR` (Strict ownership check prevents modifying other vendors' products)
- `DELETE /api/v1/vendors/me/products/:id`
  - **Auth**: `VENDOR` (Soft deletes or archives product)
- `GET /api/v1/vendors/me/orders`
  - **Auth**: `VENDOR`
  - **Response**: Orders containing items belonging to this vendor.
- `PATCH /api/v1/vendors/me/orders/:id/status`
  - **Auth**: `VENDOR`
  - **Body**: `{ "status": "PACKED | SHIPPED | DELIVERED" }`
  - **Behavior**: Enforces unidirectional lifecycle state machine: $\text{PLACED} \to \text{PACKED} \to \text{SHIPPED} \to \text{DELIVERED}$.
- `GET /api/v1/vendors/me/analytics`
  - **Auth**: `VENDOR`
  - **Response**: Vendor-specific gross revenue, net payout, platform deductions, and order volumes.

---

### 3.9 Admin Governance & Platform Operations (`/api/v1/admin`)
- `GET /api/v1/admin/vendors`
  - **Auth**: `ADMIN`
  - **Query**: `status=PENDING|APPROVED|REJECTED|SUSPENDED`
- `PATCH /api/v1/admin/vendors/:id/status`
  - **Auth**: `ADMIN`
  - **Body**: `{ "status": "APPROVED", "commissionRate": 0.10 }`
- `GET /api/v1/admin/coupons`
  - **Auth**: `ADMIN`
- `POST /api/v1/admin/coupons`
  - **Auth**: `ADMIN`
  - **Body**: `{ "code": "SUMMER15", "discountPercentage": 15, "minOrderAmount": 30, "maxDiscount": 25, "validUntil": "..." }`
- `DELETE /api/v1/admin/coupons/:id`
  - **Auth**: `ADMIN`
- `GET /api/v1/admin/reviews`
  - **Auth**: `ADMIN`
  - **Response**: Reviews pending moderation.
- `PATCH /api/v1/admin/reviews/:id/status`
  - **Auth**: `ADMIN`
  - **Body**: `{ "status": "APPROVED | REJECTED" }`
  - **Behavior**: Automatically triggers recalculation of product `averageRating` and `reviewCount`.
- `GET /api/v1/admin/analytics`
  - **Auth**: `ADMIN`
  - **Response**: High-level platform ledger metrics:
    - Gross Revenue: $\sum (\text{grossRevenue})$
    - Platform Commission: $\sum (\text{platformCommission})$
    - Vendor Payouts: $\sum (\text{vendorPayouts})$
    - Order status distributions, top 5 selling products, top 5 performing merchants.
