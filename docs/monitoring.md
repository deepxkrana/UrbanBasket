# UrbanBasket Production Health & Monitoring Guide

## Overview
UrbanBasket includes continuous health checks, real-time platform telemetry, and remote uptime monitoring designed for high-availability production deployments on Render (API) and Vercel (Frontend).

---

## 1. Health Endpoint Architecture

- **Endpoint:** `GET /api/health`
- **Authentication:** Public (No credentials required for health monitoring pings)
- **Response Format:** JSON (HTTP 200 OK)
- **Response Payload:**
  ```json
  {
    "status": "ok",
    "uptime": 1243.5,
    "timestamp": "2026-11-19T11:25:00.000Z",
    "service": "UrbanBasket API",
    "version": "1.0.0",
    "environment": "production",
    "system": {
      "heapUsedMb": 48.25,
      "rssMb": 92.10
    }
  }
  ```

---

## 2. UptimeRobot Monitoring Configuration

To configure free automated heartbeat checks with alerting every 5 minutes:

1. **Monitor Type:** `HTTP(s)`
2. **Friendly Name:** `UrbanBasket API Production`
3. **URL (or IP):** `https://your-urbanbasket-backend.onrender.com/api/health`
4. **Monitoring Interval:** `Every 5 minutes`
5. **Monitor Timeout:** `30 seconds`
6. **HTTP Method:** `GET`
7. **Expected Status Code:** `200`
8. **Keyword Monitoring (Optional):** `"status":"ok"`
9. **Alert Contacts:** Add email / webhook notifications for downtime incidents.

---

## 3. Real-Time Admin Analytics Telemetry

Platform administrators have access to `GET /api/v1/admin/analytics` which reports:
- **Financial Reconciliation:**
  - `grossRevenue`: Sum of customer payments settled in database.
  - `platformCommission`: Commission retained by marketplace.
  - `vendorPayouts`: Net earnings allocated to merchants ($Gross - Commission$).
- **Order Volume Lifecycle:** Distribution across `PLACED`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`.
- **Merchant & Catalog Telemetry:** Top-selling products and highest-earning vendors.
