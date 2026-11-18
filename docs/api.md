# UrbanBasket - REST API Specification

## Base URL
- Production: `https://urbanbasket-backend.onrender.com/api`
- Development: `http://localhost:5000/api`

## Standard Error Response Format
All errors follow a unified structure:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error description"
  }
}
```

## Available Endpoints (Phase 1 Baseline)
- `GET /api/health`: Uptime and system service health check.
- `GET /api/v1`: Base API version status check.
