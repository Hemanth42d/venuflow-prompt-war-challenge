<p align="center">
  <img src="frontend/public/venue_app.png" alt="VenueFlow" width="180" />
</p>

<h1 align="center">🏟️ VenueFlow</h1>
<p align="center"><strong>AI-Powered Smart Venue Command Center</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-20-green?logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-blue?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Cloud%20Run-Deployed-blue?logo=googlecloud" alt="Cloud Run" />
  <img src="https://img.shields.io/badge/Tests-Passing-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License" />
</p>

---

## ⚡ What It Does

Real-time crowd intelligence for 50,000+ seat venues. Predicts congestion, suggests actions, routes attendees — all from one dashboard.

---

## 🎯 Feature Comparison

| Feature | VenueFlow | Traditional |
|---------|:---------:|:-----------:|
| Real-time crowd density | ✅ | ❌ |
| Predictive congestion alerts | ✅ | ❌ |
| Smart rerouting suggestions | ✅ | ❌ |
| Crowd-aware navigation | ✅ | ❌ |
| Live venue heatmap | ✅ | ❌ |
| Operational simulations | ✅ | ❌ |
| Role-based access control | ✅ | ✅ |
| Admin CRUD dashboard | ✅ | ✅ |

---

## 🧠 Core Features

| Module | Description |
|--------|-------------|
| 🧠 Intelligence Engine | Predictive alerts with ETAs, rerouting suggestions, surge predictions |
| 🗺️ Live Venue Map | 15-zone SVG heatmap with real-time density visualization |
| 📊 Command Center | 3-column dashboard: status panel, insights, KPI sparklines |
| 🚶 Navigation | Dijkstra's pathfinding with crowd-adjusted walk times |
| 🎫 Event Management | Join/leave events, capacity tracking, zone awareness |
| ⚠️ Bottleneck Detection | Flow rates, severity classification, filling indicators |
| 💡 Suggested Actions | Prioritized ops recommendations with simulation |
| 📈 Analytics | Capacity gauges, zone utilization, attendance comparison |
| ⚙️ Admin Panel | Full CRUD for events & zones, modal forms, instant updates |
| 🔔 Real-Time Alerts | Auto-generated on High/Critical crowd levels |

---

## 🔐 Access Levels

| Access ID | Role | Admin |
|-----------|------|:-----:|
| `DEMO-ACCESS` | Demo User | ❌ |
| `STAFF-ALPHA` | Staff | ❌ |
| `VENUE-OPS-001` | Operations | ✅ |
| `ADMIN-2026` | Administrator | ✅ |
| `SUPERADMIN` | Super Admin | ✅ |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Frontend (React + Vite)              │
│   Firebase Realtime  │  REST API  │  Intel Polling  │
└──────────┬───────────┴─────┬──────┴───────┬─────────┘
           │                 │              │
           ▼                 ▼              ▼
┌─────────────────────────────────────────────────────┐
│            Backend (Node.js + Express)               │
│  Events │ Zones │ Navigation │ Intelligence │ Admin │
└──────────┬───────────┬──────────────────────────────┘
           │           │
           ▼           ▼
┌─────────────────────────────────────────────────────┐
│       Firebase Firestore / In-Memory Demo Store      │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React 18, Vite 5 | Fast SPA with HMR |
| Styling | Tailwind CSS 3.4 | Google-themed design system |
| Backend | Node.js 20, Express | REST API + intelligence engine |
| Database | Firebase Firestore | Real-time sync |
| Pathfinding | Dijkstra's algorithm | Crowd-aware routing |
| Deployment | Google Cloud Run | Serverless containers |
| Testing | Vitest + Node Test Runner | Unit + integration tests |
| Security | Helmet, CORS whitelist, rate limiting | Production-ready |

---

## 🚀 Quick Start

```bash
# Install
cd backend && npm install && cd ../frontend && npm install

# Run (two terminals)
cd backend && npm start        # → localhost:4000
cd frontend && npm run dev     # → localhost:3000
```

Open `http://localhost:3000` → Enter `DEMO-ACCESS` or `ADMIN-2026`

---

## 🧪 Testing

```bash
# Backend integration tests (server must be running)
cd backend && npm test

# Frontend unit tests
cd frontend && npm test
```

---

## ☁️ Deploy to Cloud Run

```bash
gcloud run deploy venueflow \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

---

## ☁️ Google Cloud Services

| Service | Purpose |
|---------|---------|
| Cloud Run | Serverless container hosting |
| Cloud Build | CI/CD pipeline |
| Container Registry | Docker image storage |
| Firebase Firestore | Real-time NoSQL database |
| Cloud Logging | Structured JSON log ingestion |
| Cloud Monitoring | Performance metrics via `/api/metrics` |

---

## 📁 Project Structure

```
backend/
├── server.js          # Express + middleware + security
├── intelligence.js    # Predictive engine (cached)
├── demoStore.js       # In-memory store + CRUD
├── routes/demo.js     # All API routes
└── __tests__/         # Integration tests

frontend/src/
├── App.jsx            # Auth routing + ErrorBoundary
├── components/        # Navbar, VenueMap, ErrorBoundary
├── pages/             # Dashboard, Events, Navigation, Admin...
├── lib/               # API client, auth, firebase, realtime
└── __tests__/         # Unit tests (Vitest)
```

---

<p align="center">Built for the <strong>Prompt Wars Challenge</strong> by <strong>Hack2Skill</strong></p>
