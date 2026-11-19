# UrbanBasket - Demonstration & Evaluation Guide

This guide provides an end-to-end evaluation script demonstrating all multi-vendor marketplace capabilities across Customer, Vendor, and Admin roles.

---

## 1. Quick Start & Evaluation Credentials

### Pre-Seeded Evaluation Accounts & 1-Click Switcher
The application includes a **1-Click Quick Demo Evaluation Bar** in the Authentication Modal to effortlessly switch between roles without typing credentials:

| Role | Account Email | Password | Pre-seeded Status / Data |
|---|---|---|---|
| **Customer** | `customer@urbanbasket.com` | `password123` | Active customer profile; pre-seeded with delivered orders ready for review and invoice downloads. |
| **Vendor** | `technest@urbanbasket.com` | `password123` | Approved vendor (`TechNest Electronics`); active catalog of 4 electronics products and orders to fulfill. |
| **Pending Vendor** | `artisan@urbanbasket.com` | `password123` | Pending vendor onboarding application (`Artisan Woodcraft & Co`) awaiting admin approval. |
| **Administrator** | `admin@urbanbasket.com` | `password123` | Platform superuser with access to vendor approvals, review moderation, coupon creation, and financial ledger analytics. |

---

## 2. 10-Minute Walkthrough Script

### Act 1: Storefront Browsing, Cart & Checkout (Customer)
1. **Browse Catalog**:
   - Navigate to the storefront at `http://localhost:5173`.
   - Filter by category (e.g. click "Electronics").
   - Adjust the price slider and filter by star rating (e.g. $\ge 4.5\star$).
   - Notice instant responses powered by server-side query filters and Redis caching.
2. **Add to Cart**:
   - Click **Add to Cart** on "Wireless ANC Headphones" and "Organic Cotton T-Shirt".
   - Notice the cart drawer updates in real-time.
   - Adjust quantities or refresh the page — the cart persists seamlessly in Upstash Redis.
3. **Checkout & Coupon**:
   - Open Cart and click **Proceed to Checkout**.
   - In the coupon input field, enter `WELCOME10` and click **Apply**.
   - Notice the server-side discount calculation immediately reflected in the order summary.
   - Enter shipping address details and click **Place Order & Pay**.
   - Complete payment with test card (`4242 4242 4242 4242`) or click 1-click test settlement.
   - Order status transitions to `PAID` with inventory automatically decremented.

### Act 2: Orders, PDF Invoices & Verified Reviews (Customer)
1. **View Orders Timeline**:
   - Click on **My Orders** in the navigation header.
   - Observe the order with itemized breakdown, timestamps, and live status badge.
2. **1-Click PDF Tax Invoice**:
   - Click the **Download Invoice** button on any order.
   - A PDF tax invoice generated dynamically by the backend PDFKit engine downloads immediately with full tax itemization and company header.
3. **Submit Verified Purchase Review**:
   - For an item in status `DELIVERED`, click **Write a Review**.
   - Select 5 stars, write comments, and submit.
   - Notice that non-delivered or duplicate review submissions are strictly disallowed.

### Act 3: Vendor Operations & Order Fulfillment (Vendor)
1. **Switch to Vendor**:
   - Click **Sign In** $\to$ select the **Vendor** button.
   - Click the **Vendor Dashboard** link in the navigation header.
2. **Manage Catalog**:
   - View your store catalog ("TechNest Electronics").
   - Click **Add Product**, enter title, description, price, and stock, and publish.
   - Notice how only this vendor's products are visible and manageable.
3. **Fulfill Orders**:
   - Switch to the **Orders** tab in the Vendor Portal.
   - Locate the newly placed customer order.
   - Update fulfillment status: transition from `PLACED` $\to$ `PACKED` $\to$ `SHIPPED` $\to$ `DELIVERED`.
4. **Sales & Payout Analytics**:
   - View store gross sales, commission deductions ($10\%$), and net vendor payouts.

### Act 4: Platform Governance & Financial Ledger (Administrator)
1. **Switch to Admin**:
   - Click **Sign In** $\to$ select the **Admin** button.
   - Click **Admin Portal** in the navigation header.
2. **Vendor Approval Workflow**:
   - Under the **Vendor Approvals** tab, locate the pending application for "Artisan Woodcraft & Co".
   - Review store details, set a custom commission rate (e.g., $12\%$), and click **Approve Vendor**.
3. **Review Moderation**:
   - Switch to the **Review Moderation** tab.
   - Approve customer reviews. Notice that approved reviews instantly recalculate the product's public `averageRating` and `reviewCount`.
4. **Coupon Management**:
   - Create a new coupon (e.g. `SUMMER20`, $20\%$ off, min spend $\$50$).
5. **Platform Analytics & Financial Reconciliation**:
   - Switch to the **Platform Analytics** tab.
   - Verify the double-entry accounting reconciliation:
     $$\text{Gross Platform Revenue} = \text{Platform Commission} + \text{Vendor Payouts}$$
   - Review order distribution charts, customer growth, and top-performing merchants.

---

## 3. Running Automated Verification Suites

Execute these commands from the project root:

```bash
# 1. Run all 57 backend tests (auth, vendor, catalog, checkout, payment, reviews, analytics, health)
npm run test:backend

# 2. Run frontend component tests (AuthModal, ReviewModal, Cart, forms)
npm run test:frontend

# 3. Run high-concurrency API performance load test (100 reqs, concurrency 10)
npm run test:load

# 4. Verify TypeScript compilation across workspaces with 0 errors
npm run build:backend
npm run build:frontend
```
