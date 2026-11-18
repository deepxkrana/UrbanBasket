# UrbanBasket - Database Schema Documentation

## Relational Models Overview

UrbanBasket utilizes PostgreSQL managed via Prisma ORM.

### Planned Core Tables (Phase 2)
1. **profiles**: Extends Supabase auth users with role (`customer`, `vendor`, `admin`).
2. **vendor_profiles**: Multi-vendor store details, commission rate, and review status (`PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`).
3. **categories**: Product categorization hierarchy.
4. **products**: Catalog items belonging to vendors with price, stock, ratings, and publish status.
5. **product_images**: Storage references and CDN public URLs for product galleries.
6. **addresses**: Customer shipping and billing addresses.
7. **orders & order_items**: Multi-vendor order splits, platform commission calculation, and tracking.
8. **payments**: Webhook-verified payment transactions.
9. **reviews**: Verified purchase reviews (one review per customer per purchased product).
10. **coupons & coupon_usage**: Fixed and percentage discount management.
11. **vendor_payouts**: Payout transaction ledgers per vendor order item.
12. **order_status_history**: Audit trail for order state changes.
