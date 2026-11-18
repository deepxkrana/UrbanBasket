# UrbanBasket - Demonstration Guide

## Quick Start Local Setup

### 1. Prerequisites
- Node.js (v20+)
- Docker & Docker Compose (optional for local PostgreSQL and Redis)
- Git

### 2. Environment Setup
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Installation & Run
```bash
# Install all dependencies across workspaces
npm install

# Start development servers
npm run dev:backend
npm run dev:frontend
```
- Frontend UI: `http://localhost:5173`
- Backend API Health: `http://localhost:5000/api/health`
